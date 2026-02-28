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
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.provider.GatewayRouteDocProvider;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Gateway Swagger 配置定制器
 * <p>
 * 自动将从网关路由发现的服务注入到 SwaggerUiConfigProperties 的 urls 中，
 * 使 /v3/api-docs/swagger-config 接口返回所有微服务的文档地址
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewaySwaggerConfigCustomizer {

    private static final Logger log = LoggerFactory.getLogger(GatewaySwaggerConfigCustomizer.class);

    private final SwaggerUiConfigProperties swaggerUiConfigProperties;
    private final GatewayRouteDocProvider routeDocProvider;
    private final GatewayDocProperties properties;

    public GatewaySwaggerConfigCustomizer(SwaggerUiConfigProperties swaggerUiConfigProperties,
                                          GatewayRouteDocProvider routeDocProvider,
                                          GatewayDocProperties properties) {
        this.swaggerUiConfigProperties = swaggerUiConfigProperties;
        this.routeDocProvider = routeDocProvider;
        this.properties = properties;
    }

    /**
     * 初始化时执行一次 URL 刷新，确保网关冷启动后即可返回服务列表。
     */
    @PostConstruct
    public void init() {
        if (properties.isEnabled()) {
            refreshUrlsAsync().subscribe();
        }
    }

    /**
     * 路由刷新事件触发后，异步刷新 Swagger URL。
     */
    @Async
    @EventListener(RefreshRoutesEvent.class)
    public void onRoutesRefresh(RefreshRoutesEvent event) {
        if (properties.isEnabled()) {
            refreshUrlsAsync().subscribe();
        }
    }

    /**
     * 注册中心心跳事件触发后，异步刷新 Swagger URL。
     */
    @Async
    @EventListener(HeartbeatEvent.class)
    public void onHeartbeat(HeartbeatEvent event) {
        if (properties.isEnabled()) {
            refreshUrlsAsync().subscribe();
        }
    }

    /**
     * 非阻塞刷新 URL 列表
     */
    public Mono<Void> refreshUrlsAsync() {
        return routeDocProvider.getAutoDiscoveredUrls()
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
    private synchronized void applyUrls(List<AbstractSwaggerUiConfigProperties.SwaggerUrl> autoUrls) {
        Set<AbstractSwaggerUiConfigProperties.SwaggerUrl> urls = new LinkedHashSet<>(autoUrls);
        List<AbstractSwaggerUiConfigProperties.SwaggerUrl> manualUrls = routeDocProvider.getManualConfiguredUrls();
        urls.addAll(manualUrls);
        if (isSameUrls(swaggerUiConfigProperties.getUrls(), urls)) {
            return;
        }
        swaggerUiConfigProperties.setUrls(urls);
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
