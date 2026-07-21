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
 * Jackson 无关的 JSON 节点抽象，隔离 Jackson 2/3 断代。
 */
public interface DocJsonNode {

    /**
     * 是否为对象节点。
     */
    boolean isObject();

    /**
     * 是否为数组节点。
     */
    boolean isArray();

    /**
     * 转为对象节点；非对象时返回 null。
     */
    DocObjectNode asObject();

    /**
     * 转为数组节点；非数组时返回 null。
     */
    DocArrayNode asArray();

    /**
     * 转为字符串值；非文本节点返回 null。
     */
    default String asText() {
        return null;
    }

    /**
     * 深拷贝当前节点。
     */
    DocJsonNode deepCopy();
}
