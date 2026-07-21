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

import java.util.List;

/**
 * 枚举扩展元数据。
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jEnumMetadata {

    /**
     * 枚举项列表（value 到 description 的映射）。
     */
    private List<EnumItem> items;

    public NextDoc4jEnumMetadata() {
    }

    public NextDoc4jEnumMetadata(List<EnumItem> items) {
        this.items = items;
    }

    /**
     * 枚举项（仅包含 value 和 description 映射关系）。
     */
    public static class EnumItem {

        private Object value;
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
