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

import top.nextdoc4j.enums.core.EnumValue;
import top.nextdoc4j.enums.model.NextDoc4jEnumMetadata;
import top.nextdoc4j.enums.util.NextDoc4jEnumUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 默认枚举元数据解析器。
 *
 * @author echo
 * @since 1.1.3
 */
public class DefaultEnumMetadataResolver implements EnumMetadataResolver {

    @Override
    public boolean supports(Class<?> enumClass) {
        return enumClass != null && enumClass.isEnum() && EnumValue.class.isAssignableFrom(enumClass);
    }

    /**
     * 解析 value 类型（基于泛型提取）。
     */
    public String doResolveValueType(EnumMetadataResolver resolver, Class<?> enumClass) {
        Class<?> interfaceType = resolver.getEnumInterfaceType();
        if (interfaceType == null) {
            interfaceType = EnumValue.class;
        }

        Class<?> valueClass = NextDoc4jEnumUtils.extractGenericType(enumClass, interfaceType);
        return NextDoc4jEnumUtils.toOpenApiType(valueClass);
    }

    /**
     * 解析 format（基于 valueType）。
     */
    public String doResolveFormat(EnumMetadataResolver resolver, Class<?> enumClass) {
        String valueType = doResolveValueType(resolver, enumClass);
        return NextDoc4jEnumUtils.getFormat(valueType);
    }

    /**
     * 解析枚举值列表（基于反射调用 getValue 方法）。
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
     * 解析枚举元数据（基于反射调用 getValue 和 getDescription 方法）。
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
            Object value = invokeMethod(constant, valueMethodName);
            String description = (String)invokeMethod(constant, descMethodName);
            String name = enumConstant.name();

            if (!name.equals(description)) {
                hasCustomDescription = true;
            }
            items.add(new NextDoc4jEnumMetadata.EnumItem(value, description));
        }

        return hasCustomDescription ? new NextDoc4jEnumMetadata(items) : null;
    }

    /**
     * 反射调用方法。
     */
    protected Object invokeMethod(Object target, String methodName) {
        try {
            Method method = target.getClass().getMethod(methodName);
            method.setAccessible(true);
            return method.invoke(target);
        } catch (Exception e) {
            throw new RuntimeException("Failed to invoke method: " + methodName + " on " + target.getClass(), e);
        }
    }
}
