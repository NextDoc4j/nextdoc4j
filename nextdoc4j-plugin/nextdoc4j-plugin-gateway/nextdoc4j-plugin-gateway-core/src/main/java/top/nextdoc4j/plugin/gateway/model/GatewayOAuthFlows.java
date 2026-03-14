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

/**
 * OAuth2 flows 配置集合。
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayOAuthFlows implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * implicit flow。
     */
    private GatewayOAuthFlow implicit;

    /**
     * password flow。
     */
    private GatewayOAuthFlow password;

    /**
     * client credentials flow。
     */
    private GatewayOAuthFlow clientCredentials;

    /**
     * authorization code flow。
     */
    private GatewayOAuthFlow authorizationCode;

    public GatewayOAuthFlow getImplicit() {
        return implicit;
    }

    public void setImplicit(GatewayOAuthFlow implicit) {
        this.implicit = implicit;
    }

    public GatewayOAuthFlow getPassword() {
        return password;
    }

    public void setPassword(GatewayOAuthFlow password) {
        this.password = password;
    }

    public GatewayOAuthFlow getClientCredentials() {
        return clientCredentials;
    }

    public void setClientCredentials(GatewayOAuthFlow clientCredentials) {
        this.clientCredentials = clientCredentials;
    }

    public GatewayOAuthFlow getAuthorizationCode() {
        return authorizationCode;
    }

    public void setAuthorizationCode(GatewayOAuthFlow authorizationCode) {
        this.authorizationCode = authorizationCode;
    }
}
