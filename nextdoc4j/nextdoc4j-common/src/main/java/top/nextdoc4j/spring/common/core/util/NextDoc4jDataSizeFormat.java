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

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * 人类可读的数据大小格式化（1024 进制）。
 * <p>
 * 行为对齐原 Hutool {@code DataSizeUtil.format}（参考 stackoverflow 算法）：
 * {@code size <= 0 → "0"}；否则按 {@code log10(size)/log10(1024)} 选单位，
 * 用 {@code #,##0.##} 格式化后拼单位名。
 * <p>
 * Spring {@code DataSize} 侧重解析/换算，不提供同等展示格式。
 *
 * @author echo
 * @since 1.4.0
 */
public final class NextDoc4jDataSizeFormat {

    /**
     * 与 Hutool {@code DataUnit.UNIT_NAMES} 一致。
     */
    private static final String[] UNIT_NAMES = {"B", "KB", "MB", "GB", "TB", "PB", "EB"};

    private NextDoc4jDataSizeFormat() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * 将字节数格式化为可读字符串（对齐 Hutool {@code DataSizeUtil.format}）。
     *
     * @param size 字节数
     * @return 非空展示字符串；{@code size <= 0} 时为 {@code "0"}
     */
    public static String format(long size) {
        if (size <= 0) {
            return "0";
        }
        int digitGroups = Math.min(UNIT_NAMES.length - 1, (int)(Math.log10(size) / Math.log10(1024)));
        DecimalFormat df = new DecimalFormat("#,##0.##", DecimalFormatSymbols.getInstance(Locale.ROOT));
        return df.format(size / Math.pow(1024, digitGroups)) + " " + UNIT_NAMES[digitGroups];
    }
}
