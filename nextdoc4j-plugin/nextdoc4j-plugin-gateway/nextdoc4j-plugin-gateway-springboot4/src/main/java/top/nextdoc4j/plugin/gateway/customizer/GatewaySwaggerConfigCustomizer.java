/*
 * Copyright (c) 2025-present echo. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of the NextDoc4j project.
 */
package top.nextdoc4j.plugin.gateway.customizer;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.properties.AbstractSwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springframework.cloud.client.discovery.event.HeartbeatEvent;
import org.springframework.cloud.gateway.event.RefreshRoutesEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.model.GatewayDocRouteEntry;
import top.nextdoc4j.plugin.gateway.provider.GatewayRouteDocProvider;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Gateway Swagger 配置定制器
 * <p>
 * 自动将从网关路由发现的服务注入到 SwaggerUiConfigProperties 的 urls 中，
 * 使 /v3/api-docs/swagger-config 接口返回所有微服务的文档地址
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewaySwaggerConfigCustomizer {

    private static final Logger log = LoggerFactory.getLogger(GatewaySwaggerConfigCustomizer.class);

    private final SwaggerUiConfigProperties swaggerUiConfigProperties;
    private final GatewayRouteDocProvider routeDocProvider;
    private volatile List<GatewayDocRouteEntry> routeEntries = Collections.emptyList();

    public GatewaySwaggerConfigCustomizer(SwaggerUiConfigProperties swaggerUiConfigProperties,
                                          GatewayRouteDocProvider routeDocProvider) {
        this.swaggerUiConfigProperties = swaggerUiConfigProperties;
        this.routeDocProvider = routeDocProvider;
    }

    /**
     * 初始化时执行一次 URL 刷新，确保网关冷启动后即可返回服务列表。
     */
    @PostConstruct
    public void init() {
        refreshUrlsAsync().subscribe();
    }

    /**
     * 路由刷新事件触发后，异步刷新 Swagger URL。
     */
    @Async
    @EventListener(RefreshRoutesEvent.class)
    public void onRoutesRefresh(RefreshRoutesEvent event) {
        refreshUrlsAsync().subscribe();
    }

    /**
     * 注册中心心跳事件触发后，异步刷新 Swagger URL。
     */
    @Async
    @EventListener(HeartbeatEvent.class)
    public void onHeartbeat(HeartbeatEvent event) {
        refreshUrlsAsync().subscribe();
    }

    /**
     * 非阻塞刷新 URL 列表
     */
    public Mono<Void> refreshUrlsAsync() {
        return routeDocProvider.getAutoDiscoveredDocEntries()
            .subscribeOn(Schedulers.boundedElastic())
            .collectList()
            .doOnNext(this::applyUrls)
            .then()
            .onErrorResume(e -> {
                log.error("Failed to refresh swagger urls", e);
                return Mono.empty();
            });
    }

    /**
     * 同步入口，保持向后兼容
     */
    public void refreshUrls() {
        refreshUrlsAsync().subscribe();
    }

    /**
     * 合并自动发现与手动配置 URL，并在数据变化时更新 springdoc 配置。
     */
    private synchronized void applyUrls(List<GatewayDocRouteEntry> autoEntries) {
        List<GatewayDocRouteEntry> allEntries = new ArrayList<>();
        allEntries.addAll(autoEntries);
        allEntries.addAll(routeDocProvider.getManualConfiguredDocEntries());

        Set<String> identitySet = new LinkedHashSet<>();
        List<GatewayDocRouteEntry> mergedEntries = new ArrayList<>();
        Set<AbstractSwaggerUiConfigProperties.SwaggerUrl> urls = new LinkedHashSet<>();
        for (GatewayDocRouteEntry entry : allEntries) {
            if (!StringUtils.hasText(entry.getName()) || !StringUtils.hasText(entry.getUrl())) {
                continue;
            }
            String identity = entry.getName() + "|" + entry.getUrl();
            if (!identitySet.add(identity)) {
                continue;
            }
            mergedEntries.add(entry);

            AbstractSwaggerUiConfigProperties.SwaggerUrl swaggerUrl = new AbstractSwaggerUiConfigProperties.SwaggerUrl();
            swaggerUrl.setName(entry.getName());
            swaggerUrl.setUrl(entry.getUrl());
            urls.add(swaggerUrl);
        }

        routeEntries = Collections.unmodifiableList(new ArrayList<>(mergedEntries));
        if (isSameUrls(swaggerUiConfigProperties.getUrls(), urls)) {
            return;
        }
        swaggerUiConfigProperties.setUrls(urls);
    }

    /**
     * 按文档请求路径解析 serviceId。
     *
     * @param requestPath 网关文档请求路径
     * @return serviceId，若无法匹配返回 null
     */
    public String resolveServiceIdByDocPath(String requestPath) {
        if (!StringUtils.hasText(requestPath)) {
            return null;
        }
        String normalizedRequestPath = normalizePath(requestPath);
        for (GatewayDocRouteEntry entry : routeEntries) {
            if (!StringUtils.hasText(entry.getServiceId()) || !StringUtils.hasText(entry.getUrl())) {
                continue;
            }
            String normalizedDocPath = normalizePath(entry.getUrl());
            if (normalizedRequestPath.equals(normalizedDocPath)
                || normalizedRequestPath.startsWith(normalizedDocPath + "/")) {
                return entry.getServiceId();
            }
        }
        return null;
    }

    private String normalizePath(String path) {
        String normalized = path.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.replaceAll("/{2,}", "/");
    }

    /**
     * 比较两份 URL 集合是否语义一致（按 name+url）。
     */
    private boolean isSameUrls(Collection<AbstractSwaggerUiConfigProperties.SwaggerUrl> currentUrls,
                               Collection<AbstractSwaggerUiConfigProperties.SwaggerUrl> latestUrls) {
        if (currentUrls == null && latestUrls == null) {
            return true;
        }
        if (currentUrls == null || latestUrls == null) {
            return false;
        }
        return toUrlIdentitySet(currentUrls).equals(toUrlIdentitySet(latestUrls));
    }

    /**
     * 将 SwaggerUrl 列表转换为可比较的唯一标识集合。
     */
    private Set<String> toUrlIdentitySet(Collection<AbstractSwaggerUiConfigProperties.SwaggerUrl> urls) {
        Set<String> identitySet = new LinkedHashSet<>();
        for (AbstractSwaggerUiConfigProperties.SwaggerUrl url : urls) {
            if (url == null) {
                continue;
            }
            identitySet.add(url.getName() + "|" + url.getUrl());
        }
        return identitySet;
    }
}
