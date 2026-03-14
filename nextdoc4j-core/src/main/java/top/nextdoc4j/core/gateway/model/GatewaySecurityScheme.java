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
package top.nextdoc4j.core.gateway.model;

import top.nextdoc4j.core.gateway.enums.GatewaySecuritySchemeIn;
import top.nextdoc4j.core.gateway.enums.GatewaySecuritySchemeType;

import java.io.Serial;
import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 中立安全方案定义。
 *
 * <p>用于配置层约束，不直接依赖 swagger 的 SecurityScheme。</p>
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewaySecurityScheme implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 安全类型。
     */
    private GatewaySecuritySchemeType type;

    /**
     * 描述（可选）。
     */
    private String description;

    /**
     * apiKey 名称。
     */
    private String name;

    /**
     * apiKey 所在位置。
     */
    private GatewaySecuritySchemeIn in;

    /**
     * HTTP 认证 scheme（如 bearer/basic）。
     */
    private String scheme;

    /**
     * bearer format（可选）。
     */
    private String bearerFormat;

    /**
     * OAuth2 flows。
     */
    private GatewayOAuthFlows flows;

    /**
     * OpenID Connect discovery URL。
     */
    private String openIdConnectUrl;

    /**
     * 自定义扩展字段（x-*）。
     */
    private Map<String, Object> extensions = new LinkedHashMap<>();

    public GatewaySecuritySchemeType getType() {
        return type;
    }

    public void setType(GatewaySecuritySchemeType type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public GatewaySecuritySchemeIn getIn() {
        return in;
    }

    public void setIn(GatewaySecuritySchemeIn in) {
        this.in = in;
    }

    public String getScheme() {
        return scheme;
    }

    public void setScheme(String scheme) {
        this.scheme = scheme;
    }

    public String getBearerFormat() {
        return bearerFormat;
    }

    public void setBearerFormat(String bearerFormat) {
        this.bearerFormat = bearerFormat;
    }

    public GatewayOAuthFlows getFlows() {
        return flows;
    }

    public void setFlows(GatewayOAuthFlows flows) {
        this.flows = flows;
    }

    public String getOpenIdConnectUrl() {
        return openIdConnectUrl;
    }

    public void setOpenIdConnectUrl(String openIdConnectUrl) {
        this.openIdConnectUrl = openIdConnectUrl;
    }

    public Map<String, Object> getExtensions() {
        return extensions;
    }

    public void setExtensions(Map<String, Object> extensions) {
        this.extensions = extensions;
    }
}

