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
package top.nextdoc4j.security.core.customizer;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springframework.util.AntPathMatcher;
import top.nextdoc4j.security.core.autoconfigure.NextDoc4jSpringDocExtensionProperties;
import top.nextdoc4j.security.core.enhancer.PathExcluder;

import java.util.*;

/**
 * NextDoc4j 安全插件全局 OpenApi 定制器
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSecurityPluginGlobalOpenApiCustomizer implements GlobalOpenApiCustomizer {

    private final NextDoc4jSpringDocExtensionProperties extensionProperties;
    private final List<PathExcluder> pathExcluders;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public NextDoc4jSecurityPluginGlobalOpenApiCustomizer(NextDoc4jSpringDocExtensionProperties extensionProperties,
                                                          List<PathExcluder> pathExcluders) {
        this.extensionProperties = extensionProperties;
        // 按优先级排序
        this.pathExcluders = pathExcluders.stream().sorted(Comparator.comparingInt(PathExcluder::getOrder)).toList();
    }

    @Override
    public void customise(OpenAPI openApi) {
        // OpenAPI 分组鉴权配置
        configureGlobalSecurity(openApi);
        // 接口级别鉴权配置
        configureOperationSecurity(openApi);
    }

    /**
     * 配置 OpenAPI 全局安全认证（分组级别）
     * 对应原 openApi Bean 中的全局 SecurityRequirement 配置
     */
    private void configureGlobalSecurity(OpenAPI openApi) {
        Components components = extensionProperties.getComponents();
        if (components == null) {
            return;
        }

        Map<String, SecurityScheme> securitySchemeMap = components.getSecuritySchemes();
        if (securitySchemeMap == null || securitySchemeMap.isEmpty()) {
            return;
        }

        // 确保 OpenAPI 有 Components 对象
        if (openApi.getComponents() == null) {
            openApi.components(new Components());
        }

        // 只设置 SecuritySchemes
        openApi.getComponents().setSecuritySchemes(securitySchemeMap);
        // 添加全局安全要求
        SecurityRequirement securityRequirement = new SecurityRequirement();
        securitySchemeMap.keySet().forEach(securityRequirement::addList);
        openApi.addSecurityItem(securityRequirement);
    }

    /**
     * 配置每个接口的安全认证（接口级别）
     * 对应原 globalOpenApiCustomizer Bean 中的逐个接口添加鉴权
     */
    private void configureOperationSecurity(OpenAPI openApi) {
        // 没有路径直接返回
        if (openApi.getPaths() == null) {
            return;
        }

        Components components = extensionProperties.getComponents();
        if (components == null) {
            return;
        }

        Map<String, SecurityScheme> securitySchemeMap = components.getSecuritySchemes();
        if (securitySchemeMap == null || securitySchemeMap.isEmpty()) {
            return;
        }

        // 收集所有需要排除的路径
        Set<String> excludedPaths = collectExcludedPaths();

        // 为所有接口添加鉴权（排除特定路径）
        openApi.getPaths().forEach((path, pathItem) -> {
            // 检查路径是否在排除列表中
            if (isPathExcluded(path, excludedPaths)) {
                return;
            }

            // 为路径添加安全认证
            pathItem.readOperations().forEach(operation -> {
                SecurityRequirement securityRequirement = new SecurityRequirement();
                securitySchemeMap.keySet().forEach(securityRequirement::addList);
                operation.addSecurityItem(securityRequirement);
            });
        });
    }

    /**
     * 收集所有需要排除的路径（通过所有 PathExcluder 插件）
     *
     * @return 排除路径集合，支持通配符
     */
    private Set<String> collectExcludedPaths() {
        Set<String> excludedPaths = new HashSet<>();

        if (pathExcluders == null || pathExcluders.isEmpty()) {
            return excludedPaths;
        }

        // 遍历所有排除器，收集排除路径
        for (PathExcluder excluder : pathExcluders) {
            Set<String> paths = excluder.getExcludedPaths();
            if (paths != null && !paths.isEmpty()) {
                excludedPaths.addAll(paths);
            }
        }

        return excludedPaths;
    }

    /**
     * 检查路径是否在排除列表中（支持 Ant 风格通配符）
     *
     * @param path          当前路径
     * @param excludedPaths 排除路径集合
     * @return 是否匹配排除规则
     */
    private boolean isPathExcluded(String path, Set<String> excludedPaths) {
        if (excludedPaths == null || excludedPaths.isEmpty()) {
            return false;
        }
        return excludedPaths.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
    }
}
