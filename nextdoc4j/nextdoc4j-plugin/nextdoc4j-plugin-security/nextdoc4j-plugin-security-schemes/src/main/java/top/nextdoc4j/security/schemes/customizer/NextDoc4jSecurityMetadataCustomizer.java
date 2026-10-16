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
package top.nextdoc4j.security.schemes.customizer;

import io.swagger.v3.oas.models.Operation;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.core.Ordered;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.core.constant.NextDoc4jOpenApiExtensionConstants;
import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;

import java.lang.reflect.Method;
import java.util.Comparator;
import java.util.List;

/**
 * 安全元数据操作定制器。
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
        NextDoc4jSecurityMetadata metadata = new NextDoc4jSecurityMetadata();
        Class<?> beanType = handlerMethod.getBeanType();
        Method method = handlerMethod.getMethod();

        List<NextDoc4jSecurityMetadataResolver> supportedResolvers = resolvers.stream()
            .filter(resolver -> resolver.supports(beanType, method))
            .sorted(Comparator.comparingInt(NextDoc4jSecurityMetadataResolver::getOrder))
            .toList();

        for (NextDoc4jSecurityMetadataResolver resolver : supportedResolvers) {
            try {
                resolver.resolve(beanType, method, metadata);
            } catch (Exception ignored) {
                // keep current behavior: ignore resolver exception
            }
        }

        if (!metadata.isIgnore()) {
            operation.addExtension(NextDoc4jOpenApiExtensionConstants.X_NEXTDOC4J_SECURITY, metadata);
        }

        return operation;
    }
}
