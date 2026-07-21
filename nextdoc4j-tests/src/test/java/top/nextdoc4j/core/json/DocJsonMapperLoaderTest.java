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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 验证 {@link DocJsonMapperLoader} 按宿主 ObjectMapper 类型选择实现，而非 adapter 依赖传递。
 */
class DocJsonMapperLoaderTest {

    @AfterEach
    void tearDown() {
        DocJsonMapperLoader.clearCache();
    }

    @Test
    void resolveImplementationClassName_prefersToolsJacksonWhenPresent() {
        boolean hasJ3 = DocJsonMapperLoader.isPresent(DocJsonMapperLoader.JACKSON3_OBJECT_MAPPER);
        boolean hasJ2 = DocJsonMapperLoader.isPresent(DocJsonMapperLoader.JACKSON2_OBJECT_MAPPER);
        if (hasJ3) {
            assertEquals(DocJsonMapperLoader.JACKSON3_IMPL, DocJsonMapperLoader.resolveImplementationClassName());
            return;
        }
        if (hasJ2) {
            assertEquals(DocJsonMapperLoader.JACKSON2_IMPL, DocJsonMapperLoader.resolveImplementationClassName());
            return;
        }
        IllegalStateException ex = assertThrows(IllegalStateException.class, DocJsonMapperLoader::resolveImplementationClassName);
        assertTrue(ex.getMessage().contains("No Jackson ObjectMapper"));
    }

    @Test
    void isPresent_returnsFalseForMissingClass() {
        assertFalse(DocJsonMapperLoader.isPresent("top.nextdoc4j.definitely.Missing" + System.nanoTime()));
    }
}
