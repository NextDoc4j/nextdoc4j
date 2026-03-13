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

import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;
import top.nextdoc4j.security.satoken.constant.NextDoc4jSaTokenConstant;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;

/**
 * Sa-Token 注解解析器。
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSaTokenAnnotationResolver implements NextDoc4jSecurityMetadataResolver {

    @Override
    public void resolve(Class<?> beanType, Method method, NextDoc4jSecurityMetadata metadata) {
        if (isIgnore(beanType, method)) {
            metadata.setIgnore(true);
            return;
        }

        resolvePermissionCheck(beanType, method, metadata);
        resolveRoleCheck(beanType, method, metadata);
    }

    @Override
    public int getOrder() {
        return 100;
    }

    @Override
    public boolean supports(Class<?> beanType, Method method) {
        return hasAnnotation(method.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS))
            || hasAnnotation(method.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS))
            || hasAnnotation(method.getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS))
            || hasAnnotation(beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS))
            || hasAnnotation(beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS))
            || hasAnnotation(beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS));
    }

    @Override
    public String getName() {
        return "NextDoc4jSaTokenAnnotationResolver";
    }

    private boolean isIgnore(Class<?> beanType, Method method) {
        if (hasAnnotation(method.getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS))) {
            return true;
        }
        return hasAnnotation(beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS));
    }

    private void resolvePermissionCheck(Class<?> beanType, Method method, NextDoc4jSecurityMetadata metadata) {
        Annotation methodAnnotation = method.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS);
        Annotation classAnnotation = beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS);

        if (hasAnnotation(methodAnnotation)) {
            resolvePermissionAnnotation(metadata, methodAnnotation);
        }
        if (hasAnnotation(classAnnotation)) {
            resolvePermissionAnnotation(metadata, classAnnotation);
        }
    }

    private void resolvePermissionAnnotation(NextDoc4jSecurityMetadata metadata, Annotation annotation) {
        try {
            Object value = getAnnotationValue(annotation, "value");
            Object mode = getAnnotationValue(annotation, "mode");
            Object type = getAnnotationValue(annotation, "type");
            Object orRole = getAnnotationValue(annotation, "orRole");

            String[] values = convertToStringArray(value);
            String modeStr = mode != null ? mode.toString() : "AND";
            String typeStr = type != null ? type.toString() : "";
            String[] orRoles = convertToStringArray(orRole);

            metadata.addPermission(values, modeStr, typeStr, orRoles);
        } catch (Exception ignored) {
            // keep current behavior
        }
    }

    private void resolveRoleCheck(Class<?> beanType, Method method, NextDoc4jSecurityMetadata metadata) {
        Annotation methodAnnotation = method.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS);
        Annotation classAnnotation = beanType.getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS);

        if (hasAnnotation(methodAnnotation)) {
            resolveRoleAnnotation(metadata, methodAnnotation);
        }
        if (hasAnnotation(classAnnotation)) {
            resolveRoleAnnotation(metadata, classAnnotation);
        }
    }

    private void resolveRoleAnnotation(NextDoc4jSecurityMetadata metadata, Annotation annotation) {
        try {
            Object value = getAnnotationValue(annotation, "value");
            Object mode = getAnnotationValue(annotation, "mode");
            Object type = getAnnotationValue(annotation, "type");

            String[] values = convertToStringArray(value);
            String modeStr = mode != null ? mode.toString() : "AND";
            String typeStr = type != null ? type.toString() : "";

            metadata.addRole(values, modeStr, typeStr);
        } catch (Exception ignored) {
            // keep current behavior
        }
    }

    private boolean hasAnnotation(Annotation annotation) {
        return annotation != null;
    }

    private Object getAnnotationValue(Annotation annotation, String attributeName) {
        try {
            return annotation.annotationType().getMethod(attributeName).invoke(annotation);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String[] convertToStringArray(Object value) {
        if (value == null) {
            return new String[0];
        }
        if (value instanceof String[]) {
            return (String[])value;
        }
        if (value instanceof String) {
            return new String[] {(String)value};
        }
        return new String[0];
    }
}
