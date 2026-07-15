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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonMapperLoader;
import top.nextdoc4j.core.json.DocJsonNode;
import top.nextdoc4j.core.json.DocObjectNode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Jackson2 适配器：直接测实现 + 在仅有 Jackson2 的 classpath 时验证 Loader 选择。
 */
class Jackson2DocJsonMapperLoaderTest {

    @AfterEach
    void tearDown() throws Exception {
        var m = DocJsonMapperLoader.class.getDeclaredMethod("clearCache");
        m.setAccessible(true);
        m.invoke(null);
    }

    @Test
    void jackson2MapperRoundTripsJson() throws Exception {
        DocJsonMapper mapper = new Jackson2DocJsonMapper();
        DocJsonNode root = mapper.readTree("{\"hello\":\"world\"}");
        DocObjectNode object = root.asObject();
        assertNotNull(object);
        assertEquals("{\"hello\":\"world\"}", mapper.writeValueAsString(object).replace(" ", ""));
    }

    @Test
    @EnabledIf("jackson2OnlyClasspath")
    void loaderSelectsJackson2WhenToolsJacksonAbsent() {
        assertFalse(isPresent("tools.jackson.databind.ObjectMapper"));
        assertTrue(isPresent("com.fasterxml.jackson.databind.ObjectMapper"));
        DocJsonMapper mapper = DocJsonMapperLoader.get();
        assertEquals(Jackson2DocJsonMapper.class, mapper.getClass());
    }

    static boolean jackson2OnlyClasspath() {
        return isPresent("com.fasterxml.jackson.databind.ObjectMapper")
            && !isPresent("tools.jackson.databind.ObjectMapper");
    }

    private static boolean isPresent(String className) {
        try {
            Class.forName(className, false, Thread.currentThread().getContextClassLoader());
            return true;
        } catch (ClassNotFoundException | NoClassDefFoundError ex) {
            return false;
        }
    }
}
