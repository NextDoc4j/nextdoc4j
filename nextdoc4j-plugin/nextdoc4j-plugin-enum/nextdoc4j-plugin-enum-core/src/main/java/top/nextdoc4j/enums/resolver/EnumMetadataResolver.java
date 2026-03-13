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

import top.nextdoc4j.enums.model.NextDoc4jEnumMetadata;

import java.util.List;

/**
 * 枚举元数据解析器接口
 * <p>
 * 提供扩展点，允许项目自定义枚举解析逻辑
 * 支持选择性重写，只需实现 supports() 和需要自定义的方法即可
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public interface EnumMetadataResolver {

    /**
     * 判断是否支持该枚举类型（必须实现）
     *
     * @param enumClass 枚举类
     * @return 是否支持
     */
    boolean supports(Class<?> enumClass);

    /**
     * 获取枚举接口类型
     * <p>
     * 用于泛型提取，必须重写以支持自定义枚举接口
     * </p>
     *
     * @return 枚举接口类型，返回 null 表示使用默认的 EnumValue.class
     */
    default Class<?> getEnumInterfaceType() {
        return null;
    }

    /**
     * 获取枚举值方法名
     *
     * @return 获取值的方法名
     */
    default String getValueMethodName() {
        return "getValue";
    }

    /**
     * 获取枚举描述方法名
     *
     * @return 获取描述的方法名
     */
    default String getDescriptionMethodName() {
        return "getDescription";
    }

    /**
     * 解析枚举类，返回 value 类型（用于 schema.type）
     * <p>
     * 返回值应该是 OpenAPI 标准类型：string / integer / number / long
     * </p>
     *
     * @param enumClass 枚举类
     * @return 值类型字符串，返回 null 表示使用默认实现
     */
    default String resolveValueType(Class<?> enumClass) {
        return null;
    }

    /**
     * 解析枚举类，返回 format（用于 schema.format）
     * <p>
     * 返回值应该是 OpenAPI 标准格式：int32 / int64 / double 或 null
     * </p>
     *
     * @param enumClass 枚举类
     * @return format 字符串，返回 null 表示使用默认实现
     */
    default String resolveFormat(Class<?> enumClass) {
        return null;
    }

    /**
     * 解析枚举类，返回所有枚举值列表（用于 schema.enum）
     *
     * @param enumClass 枚举类
     * @return 枚举值列表，返回 null 表示使用默认实现
     */
    default List<?> resolveEnumValues(Class<?> enumClass) {
        return null;
    }

    /**
     * 解析枚举类，返回扩展元数据（用于 x-nextdoc4j-enum）
     *
     * @param enumClass 枚举类
     * @return 枚举扩展元数据，返回 null 表示使用默认实现
     */
    default NextDoc4jEnumMetadata resolveMetadata(Class<?> enumClass) {
        return null;
    }
}