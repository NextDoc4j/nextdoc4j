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
package top.nextdoc4j.enums.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 枚举扩展元数据
 * <p>
 * 用于 OpenAPI 扩展字段 x-nextdoc4j-enum 的标准结构
 * 只包含 SpringDoc 原生 schema 不支持的 value-description 映射关系
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class EnumPluginMetadata {

    /**
     * 枚举项列表（value 到 description 的映射）
     * 如果枚举没有自定义描述，此列表为空
     */
    private List<EnumItem> items;

    public EnumPluginMetadata() {
    }

    public EnumPluginMetadata(List<EnumItem> items) {
        this.items = items;
    }

    /**
     * 枚举项（仅包含 value 和 description 映射关系）
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class EnumItem {

        /**
         * 枚举值（对应序列化的值）
         */
        private Object value;

        /**
         * 枚举描述（业务含义说明）
         * 如果没有自定义描述，此字段为 null
         */
        private String description;

        public EnumItem() {
        }

        public EnumItem(Object value, String description) {
            this.value = value;
            this.description = description;
        }

        public Object getValue() {
            return value;
        }

        public void setValue(Object value) {
            this.value = value;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }

    public List<EnumItem> getItems() {
        return items;
    }

    public void setItems(List<EnumItem> items) {
        this.items = items;
    }
}