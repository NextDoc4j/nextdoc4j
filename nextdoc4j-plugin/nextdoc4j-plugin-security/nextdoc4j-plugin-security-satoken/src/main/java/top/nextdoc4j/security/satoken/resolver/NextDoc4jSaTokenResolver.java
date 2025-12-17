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
package top.nextdoc4j.security.satoken.resolver;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.dev33.satoken.annotation.SaCheckRole;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.method.HandlerMethod;

import java.util.ArrayList;
import java.util.List;

/**
 * Sa-Token 权限解析器
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSaTokenResolver {

    public List<String> resolvePermissions(HandlerMethod handlerMethod) {
        List<String> permissions = new ArrayList<>();

        Class<?> beanType = handlerMethod.getBeanType();
        parsePermissionAnnotation(permissions, beanType, "class");
        parseRoleAnnotation(permissions, beanType, "class");

        parsePermissionAnnotation(permissions, handlerMethod.getMethod(), "method");
        parseRoleAnnotation(permissions, handlerMethod.getMethod(), "method");

        return permissions;
    }

    private void parsePermissionAnnotation(List<String> permissions, Object element, String scope) {
        SaCheckPermission annotation = AnnotatedElementUtils
            .findMergedAnnotation((java.lang.reflect.AnnotatedElement)element, SaCheckPermission.class);

        if (annotation != null) {
            for (String value : annotation.value()) {
                permissions.add(formatPermission(scope, "permission", value, annotation.type()));
            }

            for (String role : annotation.orRole()) {
                permissions.add(formatPermission(scope, "role", role, annotation.type()));
            }
        }
    }

    private void parseRoleAnnotation(List<String> permissions, Object element, String scope) {
        SaCheckRole annotation = AnnotatedElementUtils
            .findMergedAnnotation((java.lang.reflect.AnnotatedElement)element, SaCheckRole.class);

        if (annotation != null) {
            for (String value : annotation.value()) {
                permissions.add(formatPermission(scope, "role", value, annotation.type()));
            }
        }
    }

    private String formatPermission(String scope, String type, String value, String accountType) {
        if (accountType == null || accountType.isEmpty()) {
            return String.format("%s:%s:%s", scope, type, value);
        }
        return String.format("%s:%s:%s:%s", scope, type, value, accountType);
    }
}
