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

import org.junit.jupiter.api.Test;
import top.nextdoc4j.adapter.jackson2.Jackson2DocJsonMapper;
import top.nextdoc4j.adapter.jackson3.Jackson3DocJsonMapper;
import top.nextdoc4j.core.json.DocArrayNode;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonNode;
import top.nextdoc4j.core.json.DocObjectNode;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GatewayDocOpenApiRewriterTest {

    private final DocJsonMapper jsonMapper = new Jackson2DocJsonMapper();

    @Test
    void shouldRemoveDuplicatedServicePrefixFromSwaggerConfigUrls() throws Exception {
        GatewayDocOpenApiRewriter rewriter = createRewriter(new GatewayDocProperties());

        String result = rewriter.rewriteBody("/api/admin/v3/api-docs/swagger-config", """
            {"urls":[
              {"name":"登录管理","url":"/api/admin/v3/api-docs/auth"},
              {"name":"系统管理","url":"/v3/api-docs/sys"}
            ]}
            """);

        assertEquals(List.of("/v3/api-docs/auth", "/v3/api-docs/sys"), extractUrls(result, jsonMapper));
    }

    @Test
    void shouldNotRewriteGatewayRootSwaggerConfigUrls() throws Exception {
        GatewayDocOpenApiRewriter rewriter = createRewriter(new GatewayDocProperties());

        String result = rewriter.rewriteBody("/v3/api-docs/swagger-config", """
            {"urls":[{"name":"后台管理","url":"/api/admin/v3/api-docs"}]}
            """);

        assertEquals(List.of("/api/admin/v3/api-docs"), extractUrls(result, jsonMapper));
    }

    @Test
    void shouldSupportCustomDocPathWhenRewritingSwaggerConfigUrls() throws Exception {
        GatewayDocProperties properties = new GatewayDocProperties();
        properties.setDocPath("/docs");
        GatewayDocOpenApiRewriter rewriter = createRewriter(properties);

        String result = rewriter.rewriteBody("/api/admin/docs/swagger-config", """
            {"urls":[{"name":"登录管理","url":"/api/admin/docs/auth"}]}
            """);

        assertEquals(List.of("/docs/auth"), extractUrls(result, jsonMapper));
    }

    @Test
    void shouldRewriteSwaggerConfigUrlsWithJackson3() throws Exception {
        DocJsonMapper jackson3Mapper = new Jackson3DocJsonMapper();
        GatewayDocOpenApiRewriter rewriter = new GatewayDocOpenApiRewriter(new GatewayDocProperties(),
            jackson3Mapper,
            path -> null);

        String result = rewriter.rewriteBody("/api/admin/v3/api-docs/swagger-config", """
            {"urls":[{"name":"登录管理","url":"/api/admin/v3/api-docs/auth"}]}
            """);

        assertEquals(List.of("/v3/api-docs/auth"), extractUrls(result, jackson3Mapper));
    }

    /**
     * 创建使用 Jackson 2 JSON 适配器的网关文档重写器。
     *
     * @param properties 网关文档配置
     * @return 网关文档重写器
     */
    private GatewayDocOpenApiRewriter createRewriter(GatewayDocProperties properties) {
        return new GatewayDocOpenApiRewriter(properties, jsonMapper, path -> null);
    }

    /**
     * 从 swagger-config JSON 中提取所有分组文档 URL。
     *
     * @param json       swagger-config JSON 文本
     * @param jsonMapper JSON 映射器
     * @return 按原顺序排列的分组文档 URL
     * @throws Exception JSON 解析失败时抛出
     */
    private List<String> extractUrls(String json, DocJsonMapper jsonMapper) throws Exception {
        DocObjectNode root = jsonMapper.readTree(json).asObject();
        DocJsonNode urlsNode = root.get("urls");
        DocArrayNode urls = urlsNode.asArray();
        List<String> values = new ArrayList<>();
        urls.forEachElement(node -> values.add(node.asObject().get("url").asText()));
        return values;
    }
}
