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
package top.nextdoc4j.springboot.configuration;

import org.junit.jupiter.api.Test;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 启动 fail-fast：{@link NextDoc4jDocPathValidator} 驱动真实校验。
 */
class NextDoc4jDocPathValidatorTest {

    @Test
    void blankAndSingleSegment_ok() throws Exception {
        NextDoc4jProperties blank = new NextDoc4jProperties();
        assertDoesNotThrow(() -> new NextDoc4jDocPathValidator(blank).afterPropertiesSet());

        NextDoc4jProperties single = new NextDoc4jProperties();
        single.setDocPath("/internal-docs.html");
        assertDoesNotThrow(() -> new NextDoc4jDocPathValidator(single).afterPropertiesSet());
    }

    @Test
    void multiSegment_failsFast() {
        NextDoc4jProperties properties = new NextDoc4jProperties();
        properties.setDocPath("/api/console");
        NextDoc4jDocPathValidator validator = new NextDoc4jDocPathValidator(properties);

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::afterPropertiesSet);
        assertTrue(ex.getMessage().contains("single-segment") || ex.getMessage().contains("nextdoc4j.doc-path"));
    }
}
