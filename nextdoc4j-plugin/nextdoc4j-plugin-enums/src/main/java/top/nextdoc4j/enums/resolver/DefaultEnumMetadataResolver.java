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
package top.nextdoc4j.enums.resolver;

import cn.hutool.core.util.ClassUtil;
import top.nextdoc4j.enums.core.EnumValue;
import top.nextdoc4j.enums.model.NextDoc4jEnumMetadata;
import top.nextdoc4j.enums.util.EnumUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 默认枚举元数据解析器
 * <p>
 * 针对实现 EnumValue 接口的枚举类型提供默认解析逻辑
 * 该解析器不需要在 Spring 容器中注册，会作为兜底方案使用
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public class DefaultEnumMetadataResolver implements EnumMetadataResolver {

    @Override
    public boolean supports(Class<?> enumClass) {
        return enumClass != null && enumClass.isEnum() && ClassUtil.isAssignable(EnumValue.class, enumClass);
    }

    /**
     * 解析 value 类型（基于泛型提取）
     * <p>
     * 使用反射从枚举接口的泛型参数中提取值类型
     * 支持通过 getEnumInterfaceType() 自定义接口类型
     * </p>
     */
    public String doResolveValueType(EnumMetadataResolver resolver, Class<?> enumClass) {
        Class<?> interfaceType = resolver.getEnumInterfaceType();
        if (interfaceType == null) {
            interfaceType = EnumValue.class;
        }

        Class<?> valueClass = EnumUtils.extractGenericType(enumClass, interfaceType);
        return EnumUtils.toOpenApiType(valueClass);
    }

    /**
     * 解析 format（基于 valueType）
     */
    public String doResolveFormat(EnumMetadataResolver resolver, Class<?> enumClass) {
        String valueType = doResolveValueType(resolver, enumClass);
        return EnumUtils.getFormat(valueType);
    }

    /**
     * 解析枚举值列表（基于反射调用 getValue 方法）
     * <p>
     * 通过 getValueMethodName() 获取方法名，然后反射调用
     * </p>
     */
    public List<?> doResolveEnumValues(EnumMetadataResolver resolver, Class<?> enumClass) {
        Object[] constants = enumClass.getEnumConstants();
        if (constants == null || constants.length == 0) {
            return List.of();
        }

        String methodName = resolver.getValueMethodName();
        return Arrays.stream(constants).map(e -> invokeMethod(e, methodName)).toList();
    }

    /**
     * 解析枚举元数据（基于反射调用 getValue 和 getDescription 方法）
     * <p>
     * 通过 getValueMethodName() 和 getDescriptionMethodName() 获取方法名，然后反射调用
     * </p>
     */
    public NextDoc4jEnumMetadata doResolveMetadata(EnumMetadataResolver resolver, Class<?> enumClass) {
        Object[] constants = enumClass.getEnumConstants();
        if (constants == null || constants.length == 0) {
            return null;
        }

        List<NextDoc4jEnumMetadata.EnumItem> items = new ArrayList<>(constants.length);
        boolean hasCustomDescription = false;

        String valueMethodName = resolver.getValueMethodName();
        String descMethodName = resolver.getDescriptionMethodName();

        for (Object constant : constants) {
            Enum<?> enumConstant = (Enum<?>)constant;

            // 使用反射调用方法
            Object value = invokeMethod(constant, valueMethodName);
            String description = (String)invokeMethod(constant, descMethodName);
            String name = enumConstant.name();

            // 判断是否有自定义描述（不等于 name() 的返回值）
            if (!name.equals(description)) {
                hasCustomDescription = true;
            }
            items.add(new NextDoc4jEnumMetadata.EnumItem(value, description));
        }

        // 如果没有任何自定义描述，返回 null（不添加扩展字段）
        return hasCustomDescription ? new NextDoc4jEnumMetadata(items) : null;
    }

    /**
     * 反射调用方法
     *
     * @param target     目标对象
     * @param methodName 方法名
     * @return 方法返回值
     */
    protected Object invokeMethod(Object target, String methodName) {
        try {
            Method method = target.getClass().getMethod(methodName);
            // 设置方法可访问,解决匿名内部类枚举的访问权限问题
            method.setAccessible(true);
            return method.invoke(target);
        } catch (Exception e) {
            throw new RuntimeException("Failed to invoke method: " + methodName + " on " + target.getClass(), e);
        }
    }
}
