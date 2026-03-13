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
package top.nextdoc4j.plugin.gateway.enums;

/**
 * 网关路由文档路径解析策略枚举
 *
 * @author echo
 * @since 1.2.0
 */
public enum DocPathStrategy {

    /**
     * 自动（优先级：metadata.nextdoc4j.doc-path > URI > routeId）
     */
    AUTO,

    /**
     * 仅使用 metadata.nextdoc4j.doc-path
     */
    METADATA,

    /**
     * 从 Path 谓词提取
     */
    ROUTE_PREDICATE,

    /**
     * 仅使用手动配置
     */
    MANUAL_ONLY
}
