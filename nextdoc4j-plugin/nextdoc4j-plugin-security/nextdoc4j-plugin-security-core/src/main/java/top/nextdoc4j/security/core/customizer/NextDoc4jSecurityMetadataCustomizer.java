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

import io.swagger.v3.oas.models.Operation;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.core.Ordered;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.core.constant.NextDoc4jOpenApiExtensionConstants;
import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;

import java.util.Comparator;
import java.util.List;

/**
 * 安全元数据操作定制器
 * <p>
 * 收集所有 NextDoc4jSecurityMetadataResolver 实现，按优先级排序并应用，
 * 将权限和角色信息添加到 OpenAPI 操作的扩展字段中
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSecurityMetadataCustomizer implements GlobalOperationCustomizer, Ordered {

    private final List<NextDoc4jSecurityMetadataResolver> resolvers;

    public NextDoc4jSecurityMetadataCustomizer(List<NextDoc4jSecurityMetadataResolver> resolvers) {
        this.resolvers = resolvers;
    }

    @Override
    public int getOrder() {
        return 100;
    }

    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        // 创建安全元数据对象
        NextDoc4jSecurityMetadata metadata = new NextDoc4jSecurityMetadata();

        // 获取支持的解析器
        List<NextDoc4jSecurityMetadataResolver> supportedResolvers = resolvers.stream()
            .filter(resolver -> resolver.supports(handlerMethod))
            .sorted(Comparator.comparingInt(Ordered::getOrder))
            .toList();

        // 按优先级执行解析器
        for (NextDoc4jSecurityMetadataResolver resolver : supportedResolvers) {
            try {
                resolver.resolve(handlerMethod, operation, metadata);
            } catch (Exception e) {
                // 忽略解析器异常，继续执行其他解析器
            }
        }

        // 如果没有忽略，添加到扩展字段
        if (!metadata.isIgnore()) {
            operation.addExtension(NextDoc4jOpenApiExtensionConstants.X_NEXTDOC4J_SECURITY, metadata);
        }

        return operation;
    }
}
