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
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;
import top.nextdoc4j.plugin.gateway.enums.DocPathStrategy;
import top.nextdoc4j.plugin.gateway.enums.NameResolveStrategy;
import top.nextdoc4j.plugin.gateway.model.ServiceConfig;

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
@ConfigurationProperties(prefix = NextDoc4jConstants.PLUGIN_GATEWAY)
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
    private String docPath = NextDoc4jFilterConstant.BlockedPaths.API_DOCS;

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
}
