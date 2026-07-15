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
package top.nextdoc4j.plugin.gateway.rewrite;

import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.Scopes;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;
import top.nextdoc4j.core.gateway.enums.GatewaySecuritySchemeIn;
import top.nextdoc4j.core.gateway.enums.GatewaySecuritySchemeType;
import top.nextdoc4j.core.gateway.model.GatewayOAuthFlow;
import top.nextdoc4j.core.gateway.model.GatewayOAuthFlows;
import top.nextdoc4j.core.gateway.model.GatewaySecurityScheme;
import top.nextdoc4j.core.gateway.validation.GatewaySecuritySchemeValidationResult;
import top.nextdoc4j.core.gateway.validation.GatewaySecuritySchemeValidator;
import top.nextdoc4j.core.json.DocArrayNode;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonNode;
import top.nextdoc4j.core.json.DocObjectNode;
import top.nextdoc4j.core.util.NextDoc4jPathMatcherUtils;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;
import top.nextdoc4j.plugin.gateway.constant.GatewayMetadataConstants;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * 网关 OpenAPI 文档改写（Jackson 无关，经 {@link DocJsonMapper} 操作 JSON）。
 */
public class GatewayDocOpenApiRewriter {

    private static final Logger log = LoggerFactory.getLogger(GatewayDocOpenApiRewriter.class);

    private final GatewayDocProperties properties;
    private final DocJsonMapper jsonMapper;
    private final Function<String, String> serviceIdResolver;
    private final Set<String> warnedMessages = ConcurrentHashMap.newKeySet();

    public GatewayDocOpenApiRewriter(GatewayDocProperties properties,
                                     DocJsonMapper jsonMapper,
                                     Function<String, String> serviceIdResolver) {
        this.properties = properties;
        this.jsonMapper = jsonMapper;
        this.serviceIdResolver = serviceIdResolver != null ? serviceIdResolver : path -> null;
    }

    /**
     * 是否为 swagger-config 请求。
     */
    public boolean isSwaggerConfig(String path) {
        return StringUtils.hasText(path) && path.endsWith(GatewayMetadataConstants.SWAGGER_CONFIG_SUFFIX);
    }

    /**
     * 是否需要改写 OpenAPI 响应。
     */
    public boolean shouldRewrite(String path) {
        return StringUtils.hasText(path) && path.contains(GatewayMetadataConstants.API_DOCS_PATH);
    }

    /**
     * 改写 OpenAPI 文档 JSON 文本；失败时返回原文。
     */
    public String rewriteBody(String path, String sourceBody) {
        if (!StringUtils.hasText(sourceBody)) {
            return sourceBody;
        }
        try {
            DocJsonNode jsonNode = jsonMapper.readTree(sourceBody);
            DocObjectNode objectNode = jsonNode != null ? jsonNode.asObject() : null;
            if (objectNode == null) {
                return sourceBody;
            }
            rewriteApiDocs(path, objectNode);
            return jsonMapper.writeValueAsString(objectNode);
        } catch (Exception e) {
            return sourceBody;
        }
    }

    /**
     * 改写 OpenAPI 文档结构。
     */
    private void rewriteApiDocs(String path, DocObjectNode root) {
        List<String> globalRequirementSchemes = mergeGlobalSecuritySchemes(root);
        rewriteOperationSecurity(path, root, globalRequirementSchemes);
        rewriteServers(path, root);
    }

    /**
     * 合并全局安全定义到 components.securitySchemes。
     */
    private List<String> mergeGlobalSecuritySchemes(DocObjectNode root) {
        Map<String, GatewaySecurityScheme> globalSchemes = properties.getSecurity().getGlobalSchemes();
        if (globalSchemes == null || globalSchemes.isEmpty()) {
            return Collections.emptyList();
        }

        DocObjectNode componentsNode = root.withObject("components");
        DocObjectNode localSecuritySchemesNode = componentsNode.withObject("securitySchemes");
        DocObjectNode mergedSecuritySchemesNode = jsonMapper.createObjectNode();
        List<String> validGlobalSchemeNames = new ArrayList<>();

        for (Map.Entry<String, GatewaySecurityScheme> entry : globalSchemes.entrySet()) {
            SecurityScheme scheme = toSecurityScheme(entry.getKey(), entry.getValue());
            if (scheme == null) {
                continue;
            }
            DocJsonNode serialized = serializeSecurityScheme(entry.getKey(), scheme);
            if (serialized == null) {
                continue;
            }
            mergedSecuritySchemesNode.set(entry.getKey(), serialized);
            validGlobalSchemeNames.add(entry.getKey());
        }

        localSecuritySchemesNode.forEachField(mergedSecuritySchemesNode::set);

        if (mergedSecuritySchemesNode.isEmptyObject()) {
            return Collections.emptyList();
        }

        componentsNode.set("securitySchemes", mergedSecuritySchemesNode);

        if (validGlobalSchemeNames.isEmpty()) {
            return Collections.emptyList();
        }
        return validGlobalSchemeNames;
    }

    /**
     * 序列化 SecurityScheme：优先 swagger-core 的 ObjectMapper，失败再走 DocJsonMapper。
     */
    private DocJsonNode serializeSecurityScheme(String schemeName, SecurityScheme scheme) {
        try {
            Class<?> jsonClass = Class.forName("io.swagger.v3.core.util.Json");
            Object swaggerMapper = jsonClass.getMethod("mapper").invoke(null);
            String json = (String)swaggerMapper.getClass()
                .getMethod("writeValueAsString", Object.class)
                .invoke(swaggerMapper, scheme);
            return jsonMapper.readTree(json);
        } catch (Exception ex) {
            try {
                return jsonMapper.valueToTree(scheme);
            } catch (Exception fallbackEx) {
                warnOnce(schemeName, "serialize failed: " + fallbackEx.getMessage());
                return null;
            }
        }
    }

    /**
     * 将网关侧安全方案配置转换为 swagger-core {@link SecurityScheme}。
     *
     * @param schemeName 方案名称（用于告警去重键）
     * @param source     网关配置模型
     * @return 合法时返回 swagger SecurityScheme；校验失败返回 {@code null}
     */
    private SecurityScheme toSecurityScheme(String schemeName, GatewaySecurityScheme source) {
        GatewaySecuritySchemeValidationResult validationResult = GatewaySecuritySchemeValidator.validate(source);
        validationResult.getMessages().forEach(message -> warnOnce(schemeName, message));
        if (!validationResult.isValid()) {
            return null;
        }

        SecurityScheme target = new SecurityScheme();
        target.setType(toSwaggerType(source.getType()));
        target.setDescription(source.getDescription());
        target.setName(source.getName());
        target.setScheme(source.getScheme());
        target.setBearerFormat(source.getBearerFormat());
        target.setOpenIdConnectUrl(source.getOpenIdConnectUrl());

        if (source.getIn() != null) {
            target.setIn(toSwaggerIn(source.getIn()));
        }

        if (source.getFlows() != null) {
            OAuthFlows flows = toSwaggerFlows(source.getFlows());
            if (flows != null) {
                target.setFlows(flows);
            }
        }

        validationResult.getValidExtensions().forEach(target::addExtension);
        return target;
    }

    /**
     * 将网关 OAuth flows 配置转换为 swagger-core {@link OAuthFlows}。
     *
     * @param source 网关 OAuth flows 配置
     * @return 至少一个合法 flow 时返回对象；否则 {@code null}
     */
    private OAuthFlows toSwaggerFlows(GatewayOAuthFlows source) {
        OAuthFlows target = new OAuthFlows();
        boolean hasAnyFlow = false;

        if (GatewaySecuritySchemeValidator.isImplicitFlowValid(source.getImplicit())) {
            target.setImplicit(toSwaggerFlow(source.getImplicit()));
            hasAnyFlow = true;
        }
        if (GatewaySecuritySchemeValidator.isTokenFlowValid(source.getPassword())) {
            target.setPassword(toSwaggerFlow(source.getPassword()));
            hasAnyFlow = true;
        }
        if (GatewaySecuritySchemeValidator.isTokenFlowValid(source.getClientCredentials())) {
            target.setClientCredentials(toSwaggerFlow(source.getClientCredentials()));
            hasAnyFlow = true;
        }
        if (GatewaySecuritySchemeValidator.isAuthorizationCodeFlowValid(source.getAuthorizationCode())) {
            target.setAuthorizationCode(toSwaggerFlow(source.getAuthorizationCode()));
            hasAnyFlow = true;
        }

        return hasAnyFlow ? target : null;
    }

    private OAuthFlow toSwaggerFlow(GatewayOAuthFlow source) {
        OAuthFlow target = new OAuthFlow();
        target.setAuthorizationUrl(source.getAuthorizationUrl());
        target.setTokenUrl(source.getTokenUrl());
        target.setRefreshUrl(source.getRefreshUrl());

        Map<String, String> scopes = source.getScopes();
        Scopes targetScopes = new Scopes();
        if (scopes != null) {
            targetScopes.putAll(new LinkedHashMap<>(scopes));
        }
        target.setScopes(targetScopes);
        return target;
    }

    private SecurityScheme.Type toSwaggerType(GatewaySecuritySchemeType type) {
        return switch (type) {
            case API_KEY -> SecurityScheme.Type.APIKEY;
            case HTTP -> SecurityScheme.Type.HTTP;
            case MUTUAL_TLS -> SecurityScheme.Type.MUTUALTLS;
            case OAUTH2 -> SecurityScheme.Type.OAUTH2;
            case OPEN_ID_CONNECT -> SecurityScheme.Type.OPENIDCONNECT;
        };
    }

    private SecurityScheme.In toSwaggerIn(GatewaySecuritySchemeIn in) {
        return switch (in) {
            case HEADER -> SecurityScheme.In.HEADER;
            case QUERY -> SecurityScheme.In.QUERY;
            case COOKIE -> SecurityScheme.In.COOKIE;
        };
    }

    private void warnOnce(String schemeName, String message) {
        String key = schemeName + "|" + message;
        if (warnedMessages.add(key)) {
            log.warn("Invalid gateway security scheme [{}]: {}", schemeName, message);
        }
    }

    /**
     * 将默认鉴权写入接口，并按 anonymous 规则移除 security。
     */
    private void rewriteOperationSecurity(String requestPath,
                                          DocObjectNode root,
                                          List<String> globalRequirementSchemes) {
        DocJsonNode pathsNode = root.get("paths");
        DocObjectNode pathsObjectNode = pathsNode != null ? pathsNode.asObject() : null;
        if (pathsObjectNode == null) {
            return;
        }

        String serviceId = serviceIdResolver.apply(requestPath);
        List<String> anonymousPaths = resolveAnonymousPaths(serviceId);
        DocArrayNode defaultSecurityRequirement = resolveDefaultSecurityRequirement(root, globalRequirementSchemes);
        boolean hasDefaultSecurityRequirement = defaultSecurityRequirement != null && !defaultSecurityRequirement
            .isEmptyArray();
        if (!hasDefaultSecurityRequirement && anonymousPaths.isEmpty()) {
            return;
        }

        pathsObjectNode.forEachField((apiPath, pathItemNode) -> {
            DocObjectNode pathItemObjectNode = pathItemNode != null ? pathItemNode.asObject() : null;
            if (pathItemObjectNode == null) {
                return;
            }

            boolean anonymous = isAnonymousPath(apiPath, anonymousPaths);
            pathItemObjectNode.forEachField((method, operationNode) -> {
                if (!isHttpMethod(method)) {
                    return;
                }
                DocObjectNode operationObjectNode = operationNode != null ? operationNode.asObject() : null;
                if (operationObjectNode == null) {
                    return;
                }

                if (anonymous) {
                    operationObjectNode.remove("security");
                    return;
                }

                if (hasDefaultSecurityRequirement) {
                    DocJsonNode existingSecurity = operationObjectNode.get("security");
                    if (existingSecurity == null || !existingSecurity.isArray() || existingSecurity
                        .asArray() == null || existingSecurity.asArray().isEmptyArray()) {
                        operationObjectNode.set("security", defaultSecurityRequirement.deepCopyArray());
                    }
                }
            });
        });

        if (hasDefaultSecurityRequirement) {
            root.remove("security");
        }
    }

    /**
     * 解析默认安全要求：优先全局 scheme 列表，否则回退 OpenAPI root.security。
     *
     * @param root                     OpenAPI 根对象节点
     * @param globalRequirementSchemes 网关合并后的全局 scheme 名称
     * @return 默认 security 数组；无则返回 null
     */
    private DocArrayNode resolveDefaultSecurityRequirement(DocObjectNode root, List<String> globalRequirementSchemes) {
        if (globalRequirementSchemes != null && !globalRequirementSchemes.isEmpty()) {
            return createSecurityRequirement(globalRequirementSchemes);
        }

        DocJsonNode rootSecurity = root.get("security");
        DocArrayNode rootSecurityArray = rootSecurity != null ? rootSecurity.asArray() : null;
        if (rootSecurityArray != null && !rootSecurityArray.isEmptyArray()) {
            return rootSecurityArray.deepCopyArray();
        }
        return null;
    }

    /**
     * 按 serviceId 收集匿名路径规则。
     *
     * @param serviceId 网关路由对应的服务 ID
     * @return 匿名路径模式列表，无配置时为空列表
     */
    private List<String> resolveAnonymousPaths(String serviceId) {
        if (!StringUtils.hasText(serviceId)) {
            return Collections.emptyList();
        }

        List<GatewayDocProperties.AnonymousRule> anonymousRules = properties.getSecurity().getAnonymous();
        if (anonymousRules == null || anonymousRules.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> paths = new LinkedHashSet<>();
        for (GatewayDocProperties.AnonymousRule rule : anonymousRules) {
            if (rule == null || !StringUtils.hasText(rule.getServiceId()) || !serviceId.equalsIgnoreCase(rule
                .getServiceId())) {
                continue;
            }
            List<String> rulePaths = rule.getPaths();
            if (rulePaths == null || rulePaths.isEmpty()) {
                continue;
            }
            for (String path : rulePaths) {
                if (StringUtils.hasText(path)) {
                    paths.add(path.trim());
                }
            }
        }
        return new ArrayList<>(paths);
    }

    private boolean isAnonymousPath(String apiPath, List<String> anonymousPaths) {
        if (!StringUtils.hasText(apiPath) || anonymousPaths == null || anonymousPaths.isEmpty()) {
            return false;
        }
        for (String pattern : anonymousPaths) {
            if (NextDoc4jPathMatcherUtils.match(pattern, apiPath)) {
                return true;
            }
        }
        return false;
    }

    private boolean isHttpMethod(String method) {
        if (!StringUtils.hasText(method)) {
            return false;
        }
        return "delete".equalsIgnoreCase(method) || "get".equalsIgnoreCase(method) || "head"
            .equalsIgnoreCase(method) || "options".equalsIgnoreCase(method) || "patch"
                .equalsIgnoreCase(method) || "post".equalsIgnoreCase(method) || "put"
                    .equalsIgnoreCase(method) || "trace".equalsIgnoreCase(method);
    }

    private DocArrayNode createSecurityRequirement(List<String> schemeNames) {
        DocArrayNode securityArray = jsonMapper.createArrayNode();
        DocObjectNode securityRequirement = jsonMapper.createObjectNode();
        for (String schemeName : schemeNames) {
            if (!StringUtils.hasText(schemeName)) {
                continue;
            }
            securityRequirement.set(schemeName, jsonMapper.createArrayNode());
        }
        if (!securityRequirement.isEmptyObject()) {
            securityArray.add(securityRequirement);
        }
        return securityArray;
    }

    /**
     * 根据请求路径修正 servers.url。
     */
    private void rewriteServers(String path, DocObjectNode root) {
        int apiDocsIndex = path.indexOf(GatewayMetadataConstants.API_DOCS_PATH);
        if (apiDocsIndex <= 0) {
            return;
        }

        String serverPrefix = path.substring(0, apiDocsIndex);
        if (!StringUtils.hasText(serverPrefix)) {
            return;
        }

        String normalizedPrefix = normalizePrefix(serverPrefix);
        DocArrayNode serversNode = jsonMapper.createArrayNode();
        DocObjectNode serverNode = jsonMapper.createObjectNode();
        serverNode.put("url", normalizedPrefix);
        serversNode.add(serverNode);
        root.set("servers", serversNode);
    }

    /**
     * 归一化路径前缀，消除重复斜杠。
     */
    private String normalizePrefix(String prefix) {
        String normalized = prefix.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.replaceAll(GatewayMetadataConstants.MULTIPLE_SLASH_PATTERN, "/");
    }
}
