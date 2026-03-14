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
package top.nextdoc4j.plugin.gateway.model;

import java.io.Serial;
import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * OAuth2 单个 flow 配置。
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayOAuthFlow implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 授权地址（implicit/authorizationCode 必填）。
     */
    private String authorizationUrl;

    /**
     * token 地址（password/clientCredentials/authorizationCode 必填）。
     */
    private String tokenUrl;

    /**
     * refresh 地址（可选）。
     */
    private String refreshUrl;

    /**
     * scope 配置（可选）。
     */
    private Map<String, String> scopes = new LinkedHashMap<>();

    public String getAuthorizationUrl() {
        return authorizationUrl;
    }

    public void setAuthorizationUrl(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }

    public String getTokenUrl() {
        return tokenUrl;
    }

    public void setTokenUrl(String tokenUrl) {
        this.tokenUrl = tokenUrl;
    }

    public String getRefreshUrl() {
        return refreshUrl;
    }

    public void setRefreshUrl(String refreshUrl) {
        this.refreshUrl = refreshUrl;
    }

    public Map<String, String> getScopes() {
        return scopes;
    }

    public void setScopes(Map<String, String> scopes) {
        this.scopes = scopes;
    }
}
