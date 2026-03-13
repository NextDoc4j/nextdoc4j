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

import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.parameters.Parameter;
import org.springdoc.core.customizers.ParameterCustomizer;
import org.springframework.core.MethodParameter;
import top.nextdoc4j.core.constant.NextDoc4jOpenApiExtensionConstants;
import top.nextdoc4j.enums.model.NextDoc4jEnumMetadata;
import top.nextdoc4j.enums.resolver.DefaultEnumMetadataResolver;
import top.nextdoc4j.enums.resolver.EnumMetadataResolver;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * 枚举处理器
 * <p>
 * 用于在 Swagger / OpenAPI 参数与模型解析时，对枚举类型进行特殊处理：
 * <ul>
 * <li>设置 schema.type 和 schema.format（OpenAPI 原生字段）</li>
 * <li>设置 schema.enum（OpenAPI 原生字段）</li>
 * <li>设置 x-nextdoc4j-enum 扩展字段（仅当有自定义描述时）</li>
 * </ul>
 * <p>
 * 支持通过注入多个 {@link EnumMetadataResolver} 来扩展枚举解析逻辑
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jEnumParameterHandler implements ParameterCustomizer, ModelConverter {

    /**
     * 枚举元数据解析器列表（支持多个解析器，按优先级处理）
     */
    private final List<EnumMetadataResolver> resolvers;

    /**
     * 默认解析器
     */
    private final DefaultEnumMetadataResolver defaultResolver;

    /**
     * ObjectMapper，用于序列化扩展字段
     */
    private final ObjectMapper objectMapper;

    /**
     * 构造方法
     *
     * @param resolvers    枚举元数据解析器列表
     * @param objectMapper ObjectMapper
     */
    public NextDoc4jEnumParameterHandler(List<EnumMetadataResolver> resolvers, ObjectMapper objectMapper) {
        this.resolvers = resolvers;
        this.defaultResolver = new DefaultEnumMetadataResolver();
        this.objectMapper = objectMapper;
    }

    /**
     * 对参数进行自定义处理
     *
     * @param parameterModel  参数模型
     * @param methodParameter 反射方法参数
     * @return 处理后的参数模型
     */
    @Override
    public Parameter customize(Parameter parameterModel, MethodParameter methodParameter) {
        if (parameterModel == null || methodParameter == null) {
            return parameterModel;
        }

        Class<?> parameterType = methodParameter.getParameterType();
        Schema<?> schema = parameterModel.getSchema();

        if (schema != null) {
            configureEnumSchema(schema, parameterType);
        }

        return parameterModel;
    }

    @Override
    public Schema resolve(AnnotatedType annotatedType, ModelConverterContext context, Iterator<ModelConverter> chain) {
        Schema schema = chain.hasNext() ? chain.next().resolve(annotatedType, context, chain) : null;

        if (schema == null || annotatedType == null) {
            return schema;
        }

        // 解析原始 Class
        Class<?> rawClass = resolveRawClass(annotatedType);
        if (rawClass == null || !rawClass.isEnum()) {
            return schema;
        }

        // 枚举 Schema 增强
        configureEnumSchema(schema, rawClass);

        return schema;
    }

    /**
     * 配置枚举 Schema
     * <p>
     * 使用解析器链处理枚举类型，设置：
     * <ul>
     * <li>schema.type - OpenAPI 类型（string/integer/...）</li>
     * <li>schema.format - OpenAPI 格式（int32/int64/...）</li>
     * <li>schema.enum - 枚举值列表</li>
     * <li>x-nextdoc4j-enum - 扩展字段（仅当有描述时）</li>
     * </ul>
     *
     * @param schema    Schema 对象
     * @param enumClass 枚举类型
     */
    private void configureEnumSchema(Schema<?> schema, Class<?> enumClass) {
        if (enumClass == null || !enumClass.isEnum()) {
            return;
        }

        // 查找支持该枚举的解析器
        EnumMetadataResolver resolver = findResolver(enumClass);
        if (resolver == null) {
            return;
        }

        // 设置 OpenAPI 原生字段（支持降级到默认实现）
        String valueType = resolveValueType(resolver, enumClass);
        if (valueType != null) {
            schema.setType(valueType);
        }

        String format = resolveFormat(resolver, enumClass);
        if (format != null) {
            schema.setFormat(format);
        }

        List<?> enumValues = resolveEnumValues(resolver, enumClass);
        if (enumValues != null && !enumValues.isEmpty()) {
            schema.setEnum((List)enumValues);
        }

        // 2. 设置扩展字段（仅当有自定义描述时）
        NextDoc4jEnumMetadata metadata = resolveMetadata(resolver, enumClass);
        if (metadata != null && metadata.getItems() != null && !metadata.getItems().isEmpty()) {
            Map metadataMap = objectMapper.convertValue(metadata, Map.class);
            schema.addExtension(NextDoc4jOpenApiExtensionConstants.X_NEXTDOC4J_ENUM, metadataMap);
        }
    }

    /**
     * 查找支持该枚举类的解析器
     *
     * @param enumClass 枚举类
     * @return 解析器，未找到返回 null
     */
    private EnumMetadataResolver findResolver(Class<?> enumClass) {
        // 优先使用自定义解析器
        for (EnumMetadataResolver resolver : resolvers) {
            if (resolver.supports(enumClass)) {
                return resolver;
            }
        }
        // 如果没有自定义解析器，尝试使用默认解析器
        return defaultResolver.supports(enumClass) ? defaultResolver : null;
    }

    /**
     * 解析 valueType，支持降级到默认实现
     */
    private String resolveValueType(EnumMetadataResolver resolver, Class<?> enumClass) {
        String result = resolver.resolveValueType(enumClass);
        if (result == null) {
            result = defaultResolver.doResolveValueType(resolver, enumClass);
        }
        return result;
    }

    /**
     * 解析 format，支持降级到默认实现
     */
    private String resolveFormat(EnumMetadataResolver resolver, Class<?> enumClass) {
        String result = resolver.resolveFormat(enumClass);
        if (result == null) {
            result = defaultResolver.doResolveFormat(resolver, enumClass);
        }
        return result;
    }

    /**
     * 解析枚举值列表，支持降级到默认实现
     */
    private List<?> resolveEnumValues(EnumMetadataResolver resolver, Class<?> enumClass) {
        List<?> result = resolver.resolveEnumValues(enumClass);
        if (result == null) {
            result = defaultResolver.doResolveEnumValues(resolver, enumClass);
        }
        return result;
    }

    /**
     * 解析元数据，支持降级到默认实现
     */
    private NextDoc4jEnumMetadata resolveMetadata(EnumMetadataResolver resolver, Class<?> enumClass) {
        NextDoc4jEnumMetadata result = resolver.resolveMetadata(enumClass);
        if (result == null) {
            result = defaultResolver.doResolveMetadata(resolver, enumClass);
        }
        return result;
    }

    /**
     * 将 AnnotatedType 解析为原始 Class 类型
     *
     * @param type 注解类型
     * @return 原始 Class
     */
    private Class<?> resolveRawClass(AnnotatedType type) {
        try {
            return objectMapper.constructType(type.getType()).getRawClass();
        } catch (Exception e) {
            return null;
        }
    }

}
