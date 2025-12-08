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

import top.nextdoc4j.enums.core.BaseEnum;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 枚举工具类，用于解析实现 BaseEnum 的枚举类型的值类型、描述映射等辅助能力。
 * 该工具类主要应用于：
 * - OpenAPI / Swagger schema 构建
 * - 枚举元数据生成
 * - 序列化/反序列化增强
 *
 * @author echo
 * @since 1.0.0
 */
public class EnumsUtils {

    /**
     * 默认类型
     */
    public static final String TYPE_STRING = "string";

    /**
     * OpenAPI 通用类型
     */
    public static final String TYPE_INTEGER = "integer";
    public static final String TYPE_LONG = "long";
    public static final String TYPE_NUMBER = "number";

    /**
     * OpenAPI format 类型
     */
    public static final String FORMAT_INT32 = "int32";
    public static final String FORMAT_INT64 = "int64";
    public static final String FORMAT_DOUBLE = "double";

    /**
     * BaseEnum 泛型类型映射表：Java 类型 → OpenAPI type
     */
    private static final Map<Class<?>, String> ENUM_VALUE_TYPE_MAP = Map.of(
            Integer.class, TYPE_INTEGER,
            Long.class, TYPE_LONG,
            Double.class, TYPE_NUMBER,
            String.class, TYPE_STRING
    );


    private EnumsUtils() {
    }


    /**
     * 获取枚举值类型（字符串形式）
     * <p>
     * 解析 BaseEnum<T> 中 T 的具体类型，用于 OpenAPI schema。
     *
     * @param enumClass 枚举类
     * @return 类型字符串（如 integer / long / number / string）
     */
    public static String getEnumValueTypeAsString(Class<?> enumClass) {
        if (enumClass == null) {
            return TYPE_STRING;
        }

        // 遍历所有实现的接口
        for (Type type : enumClass.getGenericInterfaces()) {

            // 是否为 BaseEnum<T> 泛型接口
            if (type instanceof ParameterizedType parameterizedType &&
                    parameterizedType.getRawType() == BaseEnum.class) {

                // 获取泛型 T
                Type actualType = parameterizedType.getActualTypeArguments()[0];

                if (actualType instanceof Class<?> actualClass) {
                    return ENUM_VALUE_TYPE_MAP.getOrDefault(actualClass, TYPE_STRING);
                }
            }
        }

        return TYPE_STRING;
    }

    /**
     * 获取 OpenAPI 中 format 字段
     *
     * @param enumValueType 类型（integer/long/number/string）
     * @return format 字符串
     */
    public static String resolveFormat(String enumValueType) {
        if (enumValueType == null) {
            return null;
        }

        return switch (enumValueType) {
            case TYPE_INTEGER -> FORMAT_INT32;
            case TYPE_LONG -> FORMAT_INT64;
            case TYPE_NUMBER -> FORMAT_DOUBLE;
            default -> enumValueType;
        };
    }

    /**
     * 获取 value -> description 的有序 Map（使用枚举定义顺序）。
     */
    public static Map<Object, String> getDescMap(Class<?> enumClass) {
        if (enumClass == null || !enumClass.isEnum()) {
            return Collections.emptyMap();
        }

        Object[] constants = enumClass.getEnumConstants();
        if (constants == null || constants.length == 0) {
            return Collections.emptyMap();
        }

        // 运行期检查：是否实现了 BaseEnum
        if (!(constants[0] instanceof BaseEnum)) {
            return Collections.emptyMap();
        }

        // 此处我们知道每个 enum 常量都实现了 BaseEnum，所以可以安全地强转为 BaseEnum<?>
        return Arrays.stream(constants)
                .map(e -> (BaseEnum<?>) e)
                .collect(Collectors.toMap(
                        BaseEnum::getValue,
                        BaseEnum::getDescription,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }
}