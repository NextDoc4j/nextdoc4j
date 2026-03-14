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
package top.nextdoc4j.core.gateway.validation;

import top.nextdoc4j.core.gateway.model.GatewayOAuthFlow;
import top.nextdoc4j.core.gateway.model.GatewayOAuthFlows;
import top.nextdoc4j.core.gateway.model.GatewaySecurityScheme;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * SecurityScheme 核心校验器（中立实现）。
 *
 * @author echo
 * @since 1.2.0
 */
public final class GatewaySecuritySchemeValidator {

    private GatewaySecuritySchemeValidator() {
    }

    public static GatewaySecuritySchemeValidationResult validate(GatewaySecurityScheme source) {
        List<String> messages = new ArrayList<>();
        if (source == null) {
            messages.add("scheme config is null");
            return new GatewaySecuritySchemeValidationResult(false, messages, Map.of());
        }

        if (source.getType() == null) {
            messages.add("type is required");
            return new GatewaySecuritySchemeValidationResult(false, messages, Map.of());
        }

        boolean valid = switch (source.getType()) {
            case API_KEY -> validateApiKeyScheme(source, messages);
            case HTTP -> validateHttpScheme(source, messages);
            case OAUTH2 -> validateOauth2Scheme(source, messages);
            case OPEN_ID_CONNECT -> validateOpenIdScheme(source, messages);
            case MUTUAL_TLS -> true;
        };

        Map<String, Object> validExtensions = Map.of();
        if (valid) {
            validExtensions = filterValidExtensions(source.getExtensions(), messages);
        }
        return new GatewaySecuritySchemeValidationResult(valid, messages, validExtensions);
    }

    public static boolean isImplicitFlowValid(GatewayOAuthFlow flow) {
        return flow != null && hasText(flow.getAuthorizationUrl());
    }

    public static boolean isTokenFlowValid(GatewayOAuthFlow flow) {
        return flow != null && hasText(flow.getTokenUrl());
    }

    public static boolean isAuthorizationCodeFlowValid(GatewayOAuthFlow flow) {
        return flow != null && hasText(flow.getAuthorizationUrl()) && hasText(flow.getTokenUrl());
    }

    private static boolean validateApiKeyScheme(GatewaySecurityScheme source, List<String> messages) {
        if (!hasText(source.getName())) {
            messages.add("apiKey type requires `name`");
            return false;
        }
        if (source.getIn() == null) {
            messages.add("apiKey type requires `in`(HEADER/QUERY/COOKIE)");
            return false;
        }
        return true;
    }

    private static boolean validateHttpScheme(GatewaySecurityScheme source, List<String> messages) {
        if (!hasText(source.getScheme())) {
            messages.add("http type requires `scheme` (e.g. bearer/basic)");
            return false;
        }
        return true;
    }

    private static boolean validateOauth2Scheme(GatewaySecurityScheme source, List<String> messages) {
        if (!hasValidOauth2Flows(source.getFlows(), messages)) {
            messages.add("oauth2 type requires at least one valid flow");
            return false;
        }
        return true;
    }

    private static boolean validateOpenIdScheme(GatewaySecurityScheme source, List<String> messages) {
        if (!hasText(source.getOpenIdConnectUrl())) {
            messages.add("openIdConnect type requires `openIdConnectUrl`");
            return false;
        }
        return true;
    }

    private static boolean hasValidOauth2Flows(GatewayOAuthFlows flows, List<String> messages) {
        if (flows == null) {
            return false;
        }

        boolean implicitValid = isImplicitFlowValid(flows.getImplicit());
        boolean passwordValid = isTokenFlowValid(flows.getPassword());
        boolean clientCredentialsValid = isTokenFlowValid(flows.getClientCredentials());
        boolean authorizationCodeValid = isAuthorizationCodeFlowValid(flows.getAuthorizationCode());

        if (!implicitValid && flows.getImplicit() != null) {
            messages.add("oauth2 implicit flow requires `authorizationUrl`");
        }
        if (!passwordValid && flows.getPassword() != null) {
            messages.add("oauth2 password flow requires `tokenUrl`");
        }
        if (!clientCredentialsValid && flows.getClientCredentials() != null) {
            messages.add("oauth2 clientCredentials flow requires `tokenUrl`");
        }
        if (!authorizationCodeValid && flows.getAuthorizationCode() != null) {
            messages.add("oauth2 authorizationCode flow requires `authorizationUrl` and `tokenUrl`");
        }

        return implicitValid || passwordValid || clientCredentialsValid || authorizationCodeValid;
    }

    private static Map<String, Object> filterValidExtensions(Map<String, Object> extensions, List<String> messages) {
        if (extensions == null || extensions.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> validExtensions = new LinkedHashMap<>();
        extensions.forEach((key, value) -> {
            if (!hasText(key) || !key.startsWith("x-")) {
                messages.add("extensions key should start with 'x-': " + key);
                return;
            }
            validExtensions.put(key, value);
        });
        return validExtensions;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}

