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
import top.nextdoc4j.enums.model.EnumPluginMetadata;
import top.nextdoc4j.enums.util.EnumUtils;

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

    @Override
    public String resolveValueType(Class<?> enumClass) {
        // 从泛型接口中提取值类型
        Class<?> valueClass = EnumUtils.extractGenericType(enumClass, EnumValue.class);
        return EnumUtils.toOpenApiType(valueClass);
    }

    @Override
    public String resolveFormat(Class<?> enumClass) {
        String valueType = resolveValueType(enumClass);
        return EnumUtils.getFormat(valueType);
    }

    @Override
    public List<?> resolveEnumValues(Class<?> enumClass) {
        Object[] constants = enumClass.getEnumConstants();
        if (constants == null || constants.length == 0) {
            return List.of();
        }

        return Arrays.stream(constants).map(e -> ((EnumValue<?>)e).getValue()).toList();
    }

    @Override
    public EnumPluginMetadata resolveMetadata(Class<?> enumClass) {
        Object[] constants = enumClass.getEnumConstants();
        if (constants == null || constants.length == 0) {
            return null;
        }

        List<EnumPluginMetadata.EnumItem> items = new ArrayList<>(constants.length);
        boolean hasCustomDescription = false;

        for (Object constant : constants) {
            EnumValue<?> enumValue = (EnumValue<?>)constant;
            Enum<?> enumConstant = (Enum<?>)constant;

            Object value = enumValue.getValue();
            String description = enumValue.getDescription();
            String name = enumConstant.name();

            // 判断是否有自定义描述（不等于 name() 的返回值）
            if (!name.equals(description)) {
                hasCustomDescription = true;
            }
            items.add(new EnumPluginMetadata.EnumItem(value, description));
        }

        // 如果没有任何自定义描述，返回 null（不添加扩展字段）
        return hasCustomDescription ? new EnumPluginMetadata(items) : null;
    }
}
