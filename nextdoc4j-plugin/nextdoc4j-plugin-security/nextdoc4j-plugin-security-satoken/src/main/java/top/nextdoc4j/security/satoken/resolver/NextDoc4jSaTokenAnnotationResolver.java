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

import io.swagger.v3.oas.models.Operation;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.security.core.enhancer.NextDoc4jSecurityMetadataResolver;
import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;
import top.nextdoc4j.security.satoken.constant.NextDoc4jSaTokenConstant;

import java.lang.annotation.Annotation;

/**
 * Sa-Token 注解解析器
 * <p>
 * 解析 Sa-Token 注解并提取权限和角色信息，构建安全元数据对象
 * 支持的注解：
 * - @SaCheckRole: 角色校验
 * - @SaCheckPermission: 权限校验
 * - @SaIgnore: 忽略校验
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSaTokenAnnotationResolver implements NextDoc4jSecurityMetadataResolver {

    @Override
    public void resolve(HandlerMethod handlerMethod, Operation operation, NextDoc4jSecurityMetadata metadata) {
        // 检查是否忽略校验
        if (isIgnore(handlerMethod)) {
            metadata.setIgnore(true);
            return;
        }

        // 解析权限校验
        resolvePermissionCheck(handlerMethod, metadata);

        // 解析角色校验
        resolveRoleCheck(handlerMethod, metadata);
    }

    @Override
    public int getOrder() {
        return 100;
    }

    @Override
    public boolean supports(HandlerMethod handlerMethod) {
        return hasAnnotation(handlerMethod
            .getMethodAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS)) || hasAnnotation(handlerMethod
                .getMethodAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS)) || hasAnnotation(handlerMethod
                    .getMethodAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS)) || hasAnnotation(handlerMethod
                        .getBeanType()
                        .getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS)) || hasAnnotation(handlerMethod
                            .getBeanType()
                            .getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS)) || hasAnnotation(handlerMethod
                                .getBeanType()
                                .getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS));
    }

    @Override
    public String getName() {
        return "NextDoc4jSaTokenAnnotationResolver";
    }

    /**
     * 检查是否忽略校验
     */
    private boolean isIgnore(HandlerMethod handlerMethod) {
        // 检查方法上的注解
        if (hasAnnotation(handlerMethod.getMethodAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS))) {
            return true;
        }
        // 检查类上的注解
        return hasAnnotation(handlerMethod.getBeanType().getAnnotation(NextDoc4jSaTokenConstant.SA_IGNORE_CLASS));
    }

    /**
     * 解析权限校验
     */
    private void resolvePermissionCheck(HandlerMethod handlerMethod, NextDoc4jSecurityMetadata metadata) {
        // 获取方法上的注解
        Annotation methodAnnotation = handlerMethod
            .getMethodAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS);
        // 获取类上的注解
        Annotation classAnnotation = handlerMethod.getBeanType()
            .getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_PERMISSION_CLASS);

        // 解析权限信息
        if (hasAnnotation(methodAnnotation)) {
            resolvePermissionAnnotation(metadata, methodAnnotation);
        }
        if (hasAnnotation(classAnnotation)) {
            resolvePermissionAnnotation(metadata, classAnnotation);
        }
    }

    /**
     * 解析权限注解
     */
    private void resolvePermissionAnnotation(NextDoc4jSecurityMetadata metadata, Annotation annotation) {
        try {
            // 反射获取注解属性
            Object value = getAnnotationValue(annotation, "value");
            Object mode = getAnnotationValue(annotation, "mode");
            Object type = getAnnotationValue(annotation, "type");
            Object orRole = getAnnotationValue(annotation, "orRole");

            String[] values = convertToStringArray(value);
            String modeStr = mode != null ? mode.toString() : "AND";
            String typeStr = type != null ? type.toString() : "";
            String[] orRoles = convertToStringArray(orRole);

            metadata.addPermission(values, modeStr, typeStr, orRoles);
        } catch (Exception e) {
            // 忽略解析错误
        }
    }

    /**
     * 解析角色校验
     */
    private void resolveRoleCheck(HandlerMethod handlerMethod, NextDoc4jSecurityMetadata metadata) {
        // 获取方法上的注解
        Annotation methodAnnotation = handlerMethod.getMethodAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS);
        // 获取类上的注解
        Annotation classAnnotation = handlerMethod.getBeanType()
            .getAnnotation(NextDoc4jSaTokenConstant.SA_CHECK_ROLE_CLASS);

        // 解析角色信息
        if (hasAnnotation(methodAnnotation)) {
            resolveRoleAnnotation(metadata, methodAnnotation);
        }
        if (hasAnnotation(classAnnotation)) {
            resolveRoleAnnotation(metadata, classAnnotation);
        }
    }

    /**
     * 解析角色注解
     */
    private void resolveRoleAnnotation(NextDoc4jSecurityMetadata metadata, Annotation annotation) {
        try {
            // 反射获取注解属性
            Object value = getAnnotationValue(annotation, "value");
            Object mode = getAnnotationValue(annotation, "mode");
            Object type = getAnnotationValue(annotation, "type");

            String[] values = convertToStringArray(value);
            String modeStr = mode != null ? mode.toString() : "AND";
            String typeStr = type != null ? type.toString() : "";

            metadata.addRole(values, modeStr, typeStr);
        } catch (Exception e) {
            // 忽略解析错误
        }
    }

    /**
     * 检查注解是否存在
     */
    private boolean hasAnnotation(Annotation annotation) {
        return annotation != null;
    }

    /**
     * 获取注解属性值
     */
    private Object getAnnotationValue(Annotation annotation, String attributeName) {
        try {
            return annotation.annotationType().getMethod(attributeName).invoke(annotation);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 转换为字符串数组
     */
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
