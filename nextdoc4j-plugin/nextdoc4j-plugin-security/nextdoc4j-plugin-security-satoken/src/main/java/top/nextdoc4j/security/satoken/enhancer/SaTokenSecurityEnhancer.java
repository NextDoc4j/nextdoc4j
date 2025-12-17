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
package top.nextdoc4j.security.satoken.enhancer;

import top.nextdoc4j.security.core.enhancer.SecurityEnhancer;
import top.nextdoc4j.security.core.model.SecurityPluginMetadata;
import top.nextdoc4j.security.satoken.resolver.SaTokenPermissionResolver;
import io.swagger.v3.oas.models.Operation;
import org.springframework.web.method.HandlerMethod;

import java.util.List;

/**
 * Sa-Token 安全增强器
 *
 * @author echo
 * @since 1.1.3
 */
public class SaTokenSecurityEnhancer implements SecurityEnhancer {

    private final SaTokenPermissionResolver resolver;

    public SaTokenSecurityEnhancer(SaTokenPermissionResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public SecurityPluginMetadata enhance(Operation operation, HandlerMethod handlerMethod) {
        List<String> permissions = resolver.resolvePermissions(handlerMethod);

        if (permissions.isEmpty()) {
            return null;
        }

        return new SecurityPluginMetadata(permissions);
    }

    @Override
    public int getOrder() {
        return 100;
    }
}
