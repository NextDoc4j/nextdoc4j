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
package top.nextdoc4j.core.json;

/**
 * JSON 读写抽象，隔离 Jackson 2（fasterxml）与 Jackson 3（tools.jackson）。
 */
public interface DocJsonMapper {

    /**
     * 解析 JSON 文本。
     */
    DocJsonNode readTree(String json) throws Exception;

    /**
     * 序列化节点为 JSON 文本。
     */
    String writeValueAsString(DocJsonNode node) throws Exception;

    /**
     * 创建空对象节点。
     */
    DocObjectNode createObjectNode();

    /**
     * 创建空数组节点。
     */
    DocArrayNode createArrayNode();

    /**
     * POJO 转树节点。
     */
    DocJsonNode valueToTree(Object value);
}
