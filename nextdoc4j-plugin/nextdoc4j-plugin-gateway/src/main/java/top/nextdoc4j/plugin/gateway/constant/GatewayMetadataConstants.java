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
package top.nextdoc4j.plugin.gateway.constant;

import java.util.Map;

/**
 * Gateway 路由元数据 key 常量配置
 * <p>
 * 定义了从 RouteDefinition.metadata 中提取文档信息的标准 key 名称，
 * 支持 nextdoc4j 和 springdoc 两种配置方式
 * </p>
 * <p>
 * YAML 配置示例（扁平结构，推荐）：
 * <pre>
 * metadata:
 * nextdoc4j.name: 文件服务
 * nextdoc4j.doc-path: /file/v3/api-docs
 * </pre>
 * </p>
 * <p>
 * YAML 配置示例（嵌套结构）：
 * <pre>
 * metadata:
 * nextdoc4j:
 * name: 文件服务
 * doc-path: /file/v3/api-docs
 * </pre>
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
public final class GatewayMetadataConstants {

    private GatewayMetadataConstants() {
    }

    /**
     * NextDoc4j 命名空间前缀
     */
    public static final String NEXTDOC4J_PREFIX = "nextdoc4j";

    /**
     * NextDoc4j 文档路径 key
     */
    public static final String NEXTDOC4J_DOC_PATH = "nextdoc4j.doc-path";

    /**
     * NextDoc4j 显示名称 key
     */
    public static final String NEXTDOC4J_NAME = "nextdoc4j.name";

    /**
     * SpringDoc 文档路径 key（兼容 springdoc 配置）
     */
    public static final String SPRINGDOC_PATH = "springdoc.path";

    /**
     * 通用名称 key（兼容其他配置）
     */
    public static final String NAME = "name";

    /**
     * 从嵌套的 metadata Map 中获取值
     * <p>
     * 支持两种配置格式：
     * <pre>
     * # 扁平结构
     * metadata:
     * nextdoc4j.name: 文件服务
     *
     * # 嵌套结构
     * metadata:
     * nextdoc4j:
     * name: 文件服务
     * </pre>
     *
     * @param metadata    元数据 Map
     * @param topLevelKey 顶级 key（如 "nextdoc4j"）
     * @param nestedKey   嵌套 key（如 "name"）
     * @return 值，如果不存在返回 null
     */
    @SuppressWarnings("unchecked")
    public static String getNestedValue(Map<String, Object> metadata, String topLevelKey, String nestedKey) {
        if (metadata == null || !metadata.containsKey(topLevelKey)) {
            return null;
        }

        Object value = metadata.get(topLevelKey);

        // 扁平结构：value 直接是目标值
        if (!(value instanceof Map)) {
            return value != null ? value.toString() : null;
        }

        // 嵌套结构：value 是 Map，尝试获取嵌套的 key
        Map<String, Object> nestedMap = (Map<String, Object>)value;
        Object nestedValue = nestedMap.get(nestedKey);
        return nestedValue != null ? nestedValue.toString() : null;
    }
}
