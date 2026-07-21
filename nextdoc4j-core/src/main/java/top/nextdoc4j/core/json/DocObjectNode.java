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

import java.util.function.BiConsumer;

/**
 * JSON 对象节点抽象。
 */
public interface DocObjectNode extends DocJsonNode {

    /**
     * 获取字段；不存在返回 null。
     */
    DocJsonNode get(String field);

    /**
     * 确保子对象字段存在并返回（等价 with / withObject）。
     */
    DocObjectNode withObject(String field);

    /**
     * 设置字段。
     */
    void set(String field, DocJsonNode value);

    /**
     * 写入字符串字段。
     */
    void put(String field, String value);

    /**
     * 移除字段。
     */
    void remove(String field);

    /**
     * 对象是否无字段。
     */
    boolean isEmptyObject();

    /**
     * 遍历字段。
     */
    void forEachField(BiConsumer<String, DocJsonNode> consumer);
}
