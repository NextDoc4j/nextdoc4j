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
package top.nextdoc4j.adapter.jackson2;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import top.nextdoc4j.core.json.DocArrayNode;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonNode;
import top.nextdoc4j.core.json.DocObjectNode;

import java.util.function.BiConsumer;
import java.util.function.Consumer;

/**
 * Jackson 2（com.fasterxml）实现的 {@link DocJsonMapper}。
 */
public class Jackson2DocJsonMapper implements DocJsonMapper {

    private final ObjectMapper objectMapper;

    public Jackson2DocJsonMapper() {
        this(new ObjectMapper());
    }

    public Jackson2DocJsonMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public DocJsonNode readTree(String json) throws Exception {
        return wrap(objectMapper.readTree(json));
    }

    @Override
    public String writeValueAsString(DocJsonNode node) throws Exception {
        return objectMapper.writeValueAsString(unwrap(node));
    }

    @Override
    public DocObjectNode createObjectNode() {
        return new J2Object(objectMapper.createObjectNode());
    }

    @Override
    public DocArrayNode createArrayNode() {
        return new J2Array(objectMapper.createArrayNode());
    }

    @Override
    public DocJsonNode valueToTree(Object value) {
        return wrap(objectMapper.valueToTree(value));
    }

    /**
     * 包装原生 JsonNode。
     */
    private static DocJsonNode wrap(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node instanceof ObjectNode objectNode) {
            return new J2Object(objectNode);
        }
        if (node instanceof ArrayNode arrayNode) {
            return new J2Array(arrayNode);
        }
        return new J2Node(node);
    }

    /**
     * 解包为原生 JsonNode。
     */
    private static JsonNode unwrap(DocJsonNode node) {
        if (node instanceof J2Node j2Node) {
            return j2Node.delegate;
        }
        throw new IllegalArgumentException("Not a Jackson2 node: " + node);
    }

    private static class J2Node implements DocJsonNode {
        final JsonNode delegate;

        J2Node(JsonNode delegate) {
            this.delegate = delegate;
        }

        @Override
        public boolean isObject() {
            return delegate.isObject();
        }

        @Override
        public boolean isArray() {
            return delegate.isArray();
        }

        @Override
        public DocObjectNode asObject() {
            return delegate instanceof ObjectNode objectNode ? new J2Object(objectNode) : null;
        }

        @Override
        public DocArrayNode asArray() {
            return delegate instanceof ArrayNode arrayNode ? new J2Array(arrayNode) : null;
        }

        @Override
        public String asText() {
            return delegate.isTextual() ? delegate.asText() : null;
        }

        @Override
        public DocJsonNode deepCopy() {
            return wrap(delegate.deepCopy());
        }
    }

    private static final class J2Object extends J2Node implements DocObjectNode {
        private final ObjectNode object;

        J2Object(ObjectNode object) {
            super(object);
            this.object = object;
        }

        @Override
        public DocJsonNode get(String field) {
            JsonNode child = object.get(field);
            return child == null || child.isNull() || child.isMissingNode() ? null : wrap(child);
        }

        @Override
        public DocObjectNode withObject(String field) {
            return new J2Object(object.with(field));
        }

        @Override
        public void set(String field, DocJsonNode value) {
            object.set(field, unwrap(value));
        }

        @Override
        public void put(String field, String value) {
            object.put(field, value);
        }

        @Override
        public void remove(String field) {
            object.remove(field);
        }

        @Override
        public boolean isEmptyObject() {
            return object.isEmpty();
        }

        @Override
        public void forEachField(BiConsumer<String, DocJsonNode> consumer) {
            object.fields().forEachRemaining(entry -> consumer.accept(entry.getKey(), wrap(entry.getValue())));
        }
    }

    private static final class J2Array extends J2Node implements DocArrayNode {
        private final ArrayNode array;

        J2Array(ArrayNode array) {
            super(array);
            this.array = array;
        }

        @Override
        public void add(DocJsonNode node) {
            array.add(unwrap(node));
        }

        @Override
        public void forEachElement(Consumer<DocJsonNode> consumer) {
            array.forEach(node -> consumer.accept(wrap(node)));
        }

        @Override
        public boolean isEmptyArray() {
            return array.isEmpty();
        }

        @Override
        public DocArrayNode deepCopyArray() {
            return new J2Array(array.deepCopy());
        }
    }
}
