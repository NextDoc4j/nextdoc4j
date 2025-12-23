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
package top.nextdoc4j.core.constant;

/**
 * springdoc 扩展配置常量类
 *
 * @author echo
 * @since 1.1.3
 */
public final class NextDoc4jOpenApiExtensionConstants {

    private NextDoc4jOpenApiExtensionConstants() {
    }

    /**
     * OpenAPI 扩展统一前缀
     */
    private static final String X_PREFIX = "x-";

    /**
     * nextdoc4j OpenAPI 扩展根节点
     * <p>
     * x-nextdoc4j
     */
    public static final String X_NEXTDOC4J = X_PREFIX + "nextdoc4j";

    /**
     * 枚举扩展
     * <p>
     * x-nextdoc4j-enum
     * </p>
     */
    public static final String X_NEXTDOC4J_ENUM = X_NEXTDOC4J + "-enum";

    /**
     * 权限码展示扩展
     * <p>
     * x-nextdoc4j-security
     * </p>
     */
    public static final String X_NEXTDOC4J_SECURITY = X_NEXTDOC4J + "-security";

    /**
     * 网关聚合扩展
     * <p>
     * x-nextdoc4j-aggregation
     */
    public static final String X_NEXTDOC4J_AGGREGATION = X_NEXTDOC4J + "-aggregation";

}
