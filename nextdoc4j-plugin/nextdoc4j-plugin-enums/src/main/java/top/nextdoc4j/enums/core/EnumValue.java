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
package top.nextdoc4j.enums.core;

import java.io.Serializable;
import java.util.Objects;

/**
 * 枚举值接口
 * <p>
 * 该接口只定义核心的 getValue() 方法，getDescription() 提供默认实现
 * 这样可以兼容两种枚举定义方式：
 * 1. 只有 value 的枚举（使用 name() 作为描述）
 * 2. 同时有 value 和 description 的枚举
 * </p>
 *
 * @param <T> value 类型
 * @author echo
 * @since 1.1.3
 */
public interface EnumValue<T extends Serializable> {

    /**
     * 枚举值
     * <p>
     * 必须实现，用于序列化和反序列化
     * </p>
     *
     * @return 枚举值
     */
    T getValue();

    /**
     * 枚举描述
     * <p>
     * 默认实现返回枚举常量名称，子类可以覆盖此方法提供自定义描述
     * </p>
     *
     * @return 枚举描述
     */
    default String getDescription() {
        if (this instanceof Enum<?> enumConstant) {
            return enumConstant.name();
        }
        return String.valueOf(getValue());
    }

    /**
     * 根据枚举值获取枚举实例
     *
     * @param value 枚举值
     * @param clazz 枚举类
     * @param <E>   枚举类型
     * @param <T>   值类型
     * @return 枚举对象，未找到返回 null
     */
    static <E extends Enum<E> & EnumValue<?>, T> E getByValue(T value, Class<E> clazz) {
        if (value == null || clazz == null) {
            return null;
        }
        for (E e : clazz.getEnumConstants()) {
            if (Objects.equals(e.getValue(), value)) {
                return e;
            }
        }
        return null;
    }

    /**
     * 根据枚举描述获取枚举实例
     *
     * @param description 枚举描述
     * @param clazz       枚举类
     * @param <E>         枚举类型
     * @return 枚举对象，未找到返回 null
     */
    static <E extends Enum<E> & EnumValue<?>> E getByDescription(String description, Class<E> clazz) {
        if (description == null || clazz == null) {
            return null;
        }
        for (E e : clazz.getEnumConstants()) {
            if (Objects.equals(e.getDescription(), description)) {
                return e;
            }
        }
        return null;
    }

    /**
     * 判断枚举值是否有效
     *
     * @param value 枚举值
     * @param clazz 枚举类
     * @param <E>   枚举类型
     * @param <T>   值类型
     * @return 是否有效
     */
    static <E extends Enum<E> & EnumValue<?>, T> boolean isValidValue(T value, Class<E> clazz) {
        return getByValue(value, clazz) != null;
    }
}
