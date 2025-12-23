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
package top.nextdoc4j.plugin.gateway.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gateway 聚合文档配置属性
 *
 * @author echo
 * @since 1.2.0
 */
@ConfigurationProperties(prefix = "nextdoc4j.gateway")
public class GatewayDocProperties implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用 Gateway 聚合文档
     */
    private boolean enabled = true;

    /**
     * 微服务文档路径后缀
     */
    private String docPath = "/v3/api-docs";

    /**
     * 是否自动从路由发现
     */
    private boolean autoDiscovery = true;

    /**
     * 排除的路由 ID 列表（支持通配符 *）
     */
    private List<String> excludeRoutes = new ArrayList<>();

    /**
     * 包含的路由模式（Ant 风格），为空则包含所有
     */
    private List<String> includePatterns = new ArrayList<>();

    /**
     * 路由 ID 到显示名称的映射
     */
    private Map<String, String> nameMappings = new HashMap<>();

    /**
     * 服务名解析策略
     */
    private NameResolveStrategy nameResolveStrategy = NameResolveStrategy.AUTO;

    /**
     * 文档路径解析策略
     */
    private DocPathStrategy docPathStrategy = DocPathStrategy.AUTO;

    /**
     * 手动配置的服务列表（补偿逻辑，用于自动发现无法覆盖的场景）
     */
    @NestedConfigurationProperty
    private List<ServiceConfig> services = new ArrayList<>();

    /**
     * 服务名解析策略枚举
     */
    public enum NameResolveStrategy {

        /**
         * 使用路由 ID
         */
        ROUTE_ID,

        /**
         * 使用 metadata.nextdoc4j.name
         */
        METADATA,

        /**
         * 从 URI 提取服务名
         */
        URI,

        /**
         * 自动选择（优先级：METADATA > nameMappings > URI > ROUTE_ID）
         */
        AUTO
    }

    /**
     * 文档路径解析策略枚举
     */
    public enum DocPathStrategy {

        /**
         * 自动（优先级：metadata.nextdoc4j.doc-path > URI > routeId）
         */
        AUTO,

        /**
         * 仅使用 metadata.nextdoc4j.doc-path
         */
        METADATA,

        /**
         * 从 Path 谓词提取
         */
        ROUTE_PREDICATE,

        /**
         * 仅使用手动配置
         */
        MANUAL_ONLY
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDocPath() {
        return docPath;
    }

    public void setDocPath(String docPath) {
        this.docPath = docPath;
    }

    public List<String> getExcludeRoutes() {
        return excludeRoutes;
    }

    public void setExcludeRoutes(List<String> excludeRoutes) {
        this.excludeRoutes = excludeRoutes;
    }

    public List<String> getIncludePatterns() {
        return includePatterns;
    }

    public void setIncludePatterns(List<String> includePatterns) {
        this.includePatterns = includePatterns;
    }

    public List<ServiceConfig> getServices() {
        return services;
    }

    public void setServices(List<ServiceConfig> services) {
        this.services = services;
    }

    public boolean isAutoDiscovery() {
        return autoDiscovery;
    }

    public void setAutoDiscovery(boolean autoDiscovery) {
        this.autoDiscovery = autoDiscovery;
    }

    public Map<String, String> getNameMappings() {
        return nameMappings;
    }

    public void setNameMappings(Map<String, String> nameMappings) {
        this.nameMappings = nameMappings;
    }

    public NameResolveStrategy getNameResolveStrategy() {
        return nameResolveStrategy;
    }

    public void setNameResolveStrategy(NameResolveStrategy nameResolveStrategy) {
        this.nameResolveStrategy = nameResolveStrategy;
    }

    public DocPathStrategy getDocPathStrategy() {
        return docPathStrategy;
    }

    public void setDocPathStrategy(DocPathStrategy docPathStrategy) {
        this.docPathStrategy = docPathStrategy;
    }

    /**
     * 手动配置的服务信息
     */
    public static class ServiceConfig implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        /**
         * 服务名称（显示名称）
         */
        private String name;

        /**
         * 文档 URL（可以是相对路径或绝对路径）
         * <p>
         * 示例：
         * - /external-service/v3/api-docs（相对路径，通过网关转发）
         * - http://external-api.com/v3/api-docs（绝对路径，直接访问）
         * </p>
         */
        private String url;

        /**
         * 服务分组（可选）
         */
        private String group;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getGroup() {
            return group;
        }

        public void setGroup(String group) {
            this.group = group;
        }
    }
}