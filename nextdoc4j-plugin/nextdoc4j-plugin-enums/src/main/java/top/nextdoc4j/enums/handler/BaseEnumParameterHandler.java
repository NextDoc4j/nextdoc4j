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
package top.nextdoc4j.enums.handler;

import cn.hutool.core.text.CharSequenceUtil;
import cn.hutool.core.util.ClassUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.parameters.Parameter;
import org.springdoc.core.customizers.ParameterCustomizer;
import org.springframework.core.MethodParameter;
import top.nextdoc4j.enums.configuration.EnumsPluginProperties;
import top.nextdoc4j.enums.core.BaseEnum;
import top.nextdoc4j.enums.util.EnumsUtils;

import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * 自定义 BaseEnum 枚举参数处理器
 * <p>
 * 针对实现了 BaseEnum 的枚举，优化其枚举值和描述展示
 * </p>
 *
 * @author echo
 * @since 1.0.0
 */
public class BaseEnumParameterHandler extends ModelResolver implements ParameterCustomizer {

    private final EnumsPluginProperties properties;
    private final ObjectMapper objectMapper;

    public BaseEnumParameterHandler(EnumsPluginProperties properties, ObjectMapper mapper) {
        super(mapper);
        this.properties = properties;
        this.objectMapper = mapper;
    }

    @Override
    public Parameter customize(Parameter parameterModel, MethodParameter methodParameter) {
        Class<?> parameterType = methodParameter.getParameterType();
        // 判断是否为 BaseEnum 的子类型
        if (!ClassUtil.isAssignable(BaseEnum.class, parameterType)) {
            return parameterModel;
        }
        String description = parameterModel.getDescription();
        // 避免重复处理
        if (CharSequenceUtil.contains(description, "color:" + properties.getDescriptionColor())) {
            return parameterModel;
        }
        // 自定义枚举描述并封装参数配置
        configureSchema(parameterModel.getSchema(), parameterType);
        parameterModel.setDescription(appendEnumDescription(description, parameterType));
        return parameterModel;
    }

    @Override
    public Schema resolve(AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
        Schema resolve = super.resolve(type, context, chain);
        Class<?> rawClass = resolveRawClass(type.getType());
        // 判断是否为 BaseEnum 的子类型
        if (!ClassUtil.isAssignable(BaseEnum.class, rawClass)) {
            return resolve;
        }
        // 自定义参数描述并封装参数配置
        configureSchema(resolve, rawClass);
        resolve.setDescription(appendEnumDescription(resolve.getDescription(), rawClass));
        return resolve;
    }

    /**
     * 封装 Schema 配置
     *
     * @param schema    Schema
     * @param enumClass 枚举类型
     */
    private void configureSchema(Schema schema, Class<?> enumClass) {
        BaseEnum[] enums = (BaseEnum[]) enumClass.getEnumConstants();
        List<String> valueList = Arrays.stream(enums).map(e -> e.getValue().toString()).toList();
        schema.setEnum(valueList);
        String enumValueType = EnumsUtils.getEnumValueTypeAsString(enumClass);
        schema.setType(enumValueType);
        schema.setFormat(EnumsUtils.resolveFormat(enumValueType));
    }

    /**
     * 追加枚举描述
     *
     * @param originalDescription 原始描述
     * @param enumClass           枚举类型
     * @return 追加后的描述字符串
     */
    private String appendEnumDescription(String originalDescription, Class<?> enumClass) {
        if (!properties.isShowDescription()) {
            return originalDescription;
        }

        String color = properties.getDescriptionColor();
        return originalDescription + "<span style='color:" + color + "'>" + EnumsUtils
                .getDescMap(enumClass) + "</span>";
    }

    /**
     * 解析原始类
     *
     * @param type 类型
     * @return 原始类的 Class 对象
     */
    private Class<?> resolveRawClass(Type type) {
        return objectMapper.constructType(type).getRawClass();
    }
}
