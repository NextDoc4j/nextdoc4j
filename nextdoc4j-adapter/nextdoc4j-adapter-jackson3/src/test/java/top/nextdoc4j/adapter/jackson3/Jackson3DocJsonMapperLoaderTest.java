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
package top.nextdoc4j.adapter.jackson3;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import top.nextdoc4j.core.json.DocJsonMapper;
import top.nextdoc4j.core.json.DocJsonMapperLoader;
import top.nextdoc4j.core.json.DocJsonNode;
import top.nextdoc4j.core.json.DocObjectNode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 在仅有 Jackson3 的 classpath 上验证 Loader 选择 tools.jackson 实现并真正读写 JSON。
 */
class Jackson3DocJsonMapperLoaderTest {

    @AfterEach
    void tearDown() throws Exception {
        var m = DocJsonMapperLoader.class.getDeclaredMethod("clearCache");
        m.setAccessible(true);
        m.invoke(null);
    }

    @Test
    void loadsJackson3ImplementationAndRoundTripsJson() throws Exception {
        assertTrue(isPresent("tools.jackson.databind.ObjectMapper"));
        // Boot4 宿主也可能带 fasterxml（swagger），但优先 tools.jackson
        DocJsonMapper mapper = DocJsonMapperLoader.get();
        assertEquals(Jackson3DocJsonMapper.class, mapper.getClass());

        DocJsonNode root = mapper.readTree("{\"hello\":\"world\"}");
        DocObjectNode object = root.asObject();
        assertNotNull(object);
        String json = mapper.writeValueAsString(object);
        assertTrue(json.contains("hello") && json.contains("world"));
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
