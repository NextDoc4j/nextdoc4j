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
import org.springframework.cloud.gateway.event.RefreshRoutesEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.provider.GatewayRouteDocProvider;

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

    @PostConstruct
    public void init() {
        if (properties.isEnabled()) {
            refreshUrls();
        }
    }

    @Async
    @EventListener(RefreshRoutesEvent.class)
    public void onRoutesRefresh(RefreshRoutesEvent event) {
        if (properties.isEnabled()) {
            log.info("Gateway routes refreshed, updating swagger urls...");
            refreshUrls();
        }
    }

    private synchronized void refreshUrls() {
        try {
            Set<AbstractSwaggerUiConfigProperties.SwaggerUrl> urls = new LinkedHashSet<>();

            int autoCount = 0;
            int manualCount = 0;

            routeDocProvider.getAutoDiscoveredUrls().doOnNext(swaggerUrl -> {
                urls.add(swaggerUrl);
                log.debug("Auto discovered service: {} -> {}", swaggerUrl.getName(), swaggerUrl.getUrl());
            }).blockLast();
            autoCount = urls.size();

            List<AbstractSwaggerUiConfigProperties.SwaggerUrl> manualUrls = routeDocProvider.getManualConfiguredUrls();
            for (AbstractSwaggerUiConfigProperties.SwaggerUrl manualUrl : manualUrls) {
                boolean added = urls.add(manualUrl);
                if (added) {
                    manualCount++;
                    log.debug("Manual configured service: {} -> {}", manualUrl.getName(), manualUrl.getUrl());
                } else {
                    log.debug("Manual configured service already exists (skipped): {} -> {}", manualUrl
                        .getName(), manualUrl.getUrl());
                }
            }

            swaggerUiConfigProperties.setUrls(urls);
            log.info("Updated swagger urls: {} auto-discovered, {} manual-configured, {} total", autoCount, manualCount, urls
                .size());
        } catch (Exception e) {
            log.error("Failed to refresh swagger urls", e);
        }
    }
}