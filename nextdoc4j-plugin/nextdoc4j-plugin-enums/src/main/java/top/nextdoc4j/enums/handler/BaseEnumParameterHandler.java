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
 * BaseEnum 枚举参数处理器
 *
 * <p>用于在 Swagger / OpenAPI 参数与模型解析时，对实现 BaseEnum 的枚举类型进行特殊处理：
 * <ul>
 * <li>为参数 Schema 设置正确的枚举值类型（integer/string/long 等）</li>
 * <li>设置枚举值列表（enum）</li>
 * <li>自动追加描述，用于显示 value → description 的映射关系</li>
 * </ul>
 *
 * <p>该类同时实现：
 * <ul>
 * <li>{@link ParameterCustomizer} —— 用于处理请求参数的 Schema</li>
 * <li>{@link ModelResolver} —— 用于处理模型字段的 Schema</li>
 * </ul>
 *
 * @author echo
 * @since 1.0.0
 */
public class BaseEnumParameterHandler extends ModelResolver implements ParameterCustomizer {

    /**
     * 枚举插件配置，包含描述颜色、是否显示描述等配置项
     */
    private final EnumsPluginProperties properties;

    /**
     * ObjectMapper，用于解析 Type 为原始 Class
     */
    private final ObjectMapper objectMapper;

    /**
     * 构造方法
     *
     * @param properties 枚举插件配置
     * @param mapper     ObjectMapper
     */
    public BaseEnumParameterHandler(EnumsPluginProperties properties, ObjectMapper mapper) {
        super(mapper);
        this.properties = properties;
        this.objectMapper = mapper;
    }

    /**
     * 对参数进行自定义处理
     *
     * <p>当方法参数类型为实现 BaseEnum 的枚举类时：
     * <ul>
     * <li>设置 enum 列表</li>
     * <li>设置 type 与 format</li>
     * <li>追加描述（value → description 映射）</li>
     * </ul>
     *
     * @param parameterModel  参数模型
     * @param methodParameter 反射方法参数
     * @return 处理后的参数模型
     */
    @Override
    public Parameter customize(Parameter parameterModel, MethodParameter methodParameter) {
        Class<?> parameterType = methodParameter.getParameterType();

        if (!ClassUtil.isAssignable(BaseEnum.class, parameterType)) {
            return parameterModel;
        }

        String description = parameterModel.getDescription();
        if (CharSequenceUtil.contains(description, "color:" + properties.getDescriptionColor())) {
            return parameterModel;
        }

        configureSchema(parameterModel.getSchema(), parameterType);
        parameterModel.setDescription(appendEnumDescription(description, parameterType));
        return parameterModel;
    }

    /**
     * 对 Model / Schema 进行处理
     *
     * <p>当模型字段类型为实现 BaseEnum 的枚举类时：
     * <ul>
     * <li>设置 enum 列表</li>
     * <li>设置 type 与 format</li>
     * <li>追加 description</li>
     * </ul>
     *
     * @param type    注解类型
     * @param context 上下文
     * @param chain   模型解析链
     * @return 处理后的 Schema
     */
    @Override
    public Schema resolve(AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
        Schema resolve = super.resolve(type, context, chain);

        Class<?> rawClass = resolveRawClass(type.getType());
        if (!ClassUtil.isAssignable(BaseEnum.class, rawClass)) {
            return resolve;
        }

        configureSchema(resolve, rawClass);
        resolve.setDescription(appendEnumDescription(resolve.getDescription(), rawClass));
        return resolve;
    }

    /**
     * 配置 Schema 的枚举相关属性
     *
     * <p>主要设置以下内容：
     * <ul>
     * <li>schema.enum = 所有枚举值列表</li>
     * <li>schema.type = OpenAPI 类型（string/integer/...）</li>
     * <li>schema.format = OpenAPI format（int32/int64/...）</li>
     * </ul>
     *
     * @param schema    Schema 对象
     * @param enumClass 枚举类型
     */
    private void configureSchema(Schema schema, Class<?> enumClass) {
        BaseEnum[] enums = (BaseEnum[])enumClass.getEnumConstants();

        List<String> valueList = Arrays.stream(enums).map(e -> e.getValue().toString()).toList();

        schema.setEnum(valueList);
        String enumValueType = EnumsUtils.getEnumValueTypeAsString(enumClass);
        schema.setType(enumValueType);
        schema.setFormat(EnumsUtils.resolveFormat(enumValueType));
    }

    /**
     * 为描述追加枚举 value → description 映射内容
     *
     * <p>例如："{1=正常, 2=禁用}"
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
     * 将 Type 解析为原始 Class 类型
     *
     * @param type 类型对象
     * @return 原始 Class
     */
    private Class<?> resolveRawClass(Type type) {
        return objectMapper.constructType(type).getRawClass();
    }
}
