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
package top.nextdoc4j.plugin.gateway.enums;

/**
 * 网关安全方案类型。
 *
 * @author echo
 * @since 1.2.0
 */
public enum GatewaySecuritySchemeType {

    /**
     * API Key 认证。
     */
    API_KEY,

    /**
     * HTTP 认证（例如 bearer/basic）。
     */
    HTTP,

    /**
     * Mutual TLS 认证。
     */
    MUTUAL_TLS,

    /**
     * OAuth2 认证。
     */
    OAUTH2,

    /**
     * OpenID Connect 认证。
     */
    OPEN_ID_CONNECT
}
