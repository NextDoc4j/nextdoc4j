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
 * 枚举接口
 *
 * @param <T> value 类型
 * @author Charles7c
 * @since 1.0.0
 */
@SuppressWarnings("unchecked")
public interface BaseEnum<T extends Serializable> {

    /**
     * 枚举值
     *
     * @return 枚举值
     */
    T getValue();

    /**
     * 枚举描述
     *
     * @return 枚举描述
     */
    String getDescription();

    /**
     * 根据枚举值获取
     *
     * @param value 枚举值
     * @param clazz 枚举类
     * @return 枚举对象
     * @since 2.8.1
     */
    static <E extends Enum<E> & BaseEnum, T> E getByValue(T value, Class<E> clazz) {
        for (E e : clazz.getEnumConstants()) {
            if (Objects.equals(e.getValue(), value)) {
                return e;
            }
        }
        return null;
    }

    /**
     * 根据枚举描述获取
     *
     * @param description 枚举描述
     * @param clazz       枚举类
     * @return 枚举对象
     * @since 2.8.1
     */
    static <E extends Enum<E> & BaseEnum> E getByDescription(String description, Class<?> clazz) {
        for (Object e : clazz.getEnumConstants()) {
            if (e instanceof BaseEnum<?> baseEnum && Objects.equals(baseEnum.getDescription(), description)) {
                return (E)baseEnum;
            }
        }
        return null;
    }

    /**
     * 判断枚举值是否有效
     *
     * @param value 枚举值
     * @param clazz 枚举类
     * @return 是否有效
     * @since 2.8.1
     */
    static <E extends Enum<E> & BaseEnum, T> boolean isValidValue(T value, Class<E> clazz) {
        return getByValue(value, clazz) != null;
    }
}
