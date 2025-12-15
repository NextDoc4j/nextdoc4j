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
package top.nextdoc4j.enums.util;

import top.nextdoc4j.enums.core.EnumValue;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 枚举工具类，用于解析实现 EnumValue 的枚举类型的值类型、描述映射等辅助能力。
 * 该工具类主要应用于：
 * - OpenAPI / Swagger schema 构建
 * - 枚举元数据生成
 * - 序列化/反序列化增强
 *
 * @author echo
 * @since 1.1.3
 */
public class EnumUtils {

    /**
     * OpenAPI 类型常量
     */
    public static final String TYPE_STRING = "string";
    public static final String TYPE_INTEGER = "integer";
    public static final String TYPE_LONG = "long";
    public static final String TYPE_NUMBER = "number";

    /**
     * OpenAPI format 常量
     */
    public static final String FORMAT_INT32 = "int32";
    public static final String FORMAT_INT64 = "int64";
    public static final String FORMAT_DOUBLE = "double";

    /**
     * Java 类型到 OpenAPI 类型的映射
     */
    private static final Map<Class<?>, String> TYPE_MAPPING = Map
        .of(Integer.class, TYPE_INTEGER, int.class, TYPE_INTEGER, Long.class, TYPE_LONG, long.class, TYPE_LONG, Double.class, TYPE_NUMBER, double.class, TYPE_NUMBER, Float.class, TYPE_NUMBER, float.class, TYPE_NUMBER, String.class, TYPE_STRING);

    /**
     * OpenAPI 类型到 format 的映射
     */
    private static final Map<String, String> FORMAT_MAPPING = Map
        .of(TYPE_INTEGER, FORMAT_INT32, TYPE_LONG, FORMAT_INT64, TYPE_NUMBER, FORMAT_DOUBLE);

    private EnumUtils() {
    }

    /**
     * 从泛型接口中提取值类型
     * <p>
     * 例如：EnumValue&lt;String&gt; → String.class
     * </p>
     *
     * @param enumClass     枚举类
     * @param interfaceType 泛型接口类型（如 EnumValue.class）
     * @return 泛型参数的 Class，未找到返回 null
     */
    public static Class<?> extractGenericType(Class<?> enumClass, Class<?> interfaceType) {
        if (enumClass == null || interfaceType == null) {
            return null;
        }

        for (Type type : enumClass.getGenericInterfaces()) {
            if (type instanceof ParameterizedType parameterizedType && parameterizedType
                .getRawType() == interfaceType) {

                Type actualType = parameterizedType.getActualTypeArguments()[0];
                if (actualType instanceof Class<?> actualClass) {
                    return actualClass;
                }
            }
        }

        return null;
    }

    /**
     * 将 Java 类型转换为 OpenAPI 类型
     *
     * @param javaType Java 类型
     * @return OpenAPI 类型字符串
     */
    public static String toOpenApiType(Class<?> javaType) {
        if (javaType == null) {
            return TYPE_STRING;
        }
        return TYPE_MAPPING.getOrDefault(javaType, TYPE_STRING);
    }

    /**
     * 根据 OpenAPI 类型获取对应的 format
     *
     * @param openApiType OpenAPI 类型
     * @return format 字符串，可能为 null
     */
    public static String getFormat(String openApiType) {
        if (openApiType == null) {
            return null;
        }
        return FORMAT_MAPPING.get(openApiType);
    }
}