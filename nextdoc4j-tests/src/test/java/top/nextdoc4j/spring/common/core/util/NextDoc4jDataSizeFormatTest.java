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
package top.nextdoc4j.spring.common.core.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 驱动真实 {@link NextDoc4jDataSizeFormat}，与 Hutool {@code DataSizeUtil.format} 契约对齐。
 */
class NextDoc4jDataSizeFormatTest {

    @Test
    void format_matchesHutoolContract() {
        assertEquals("0", NextDoc4jDataSizeFormat.format(0));
        assertEquals("0", NextDoc4jDataSizeFormat.format(-1));
        assertEquals("512 B", NextDoc4jDataSizeFormat.format(512));
        assertEquals("1 KB", NextDoc4jDataSizeFormat.format(1024));
        assertEquals("1.46 KB", NextDoc4jDataSizeFormat.format(1500));
        assertEquals("976.56 KB", NextDoc4jDataSizeFormat.format(1_000_000));
        assertEquals("1 MB", NextDoc4jDataSizeFormat.format(1024L * 1024));
    }
}
