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
package top.nextdoc4j.core.util;

import java.util.Base64;
import java.util.Map;

/**
 * NextDoc4j 资源处理纯 Java 工具类。
 *
 * @author echo
 * @since 1.2.0
 */
public final class NextDoc4jResourcePureUtils {

    private static final Map<String, String> MIME_TYPE_MAPPING = Map
        .of("svg", "image/svg+xml", "png", "image/png", "jpg", "image/jpeg", "jpeg", "image/jpeg", "gif",
            "image/gif", "webp", "image/webp", "ico", "image/x-icon");

    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";

    private NextDoc4jResourcePureUtils() {
        throw new AssertionError("Utility class should not be instantiated");
    }

    /**
     * 将字节数组转换为Data URL格式。
     */
    public static String convertToDataUrl(byte[] data, String filePath) {
        if (data == null || data.length == 0) {
            return null;
        }

        String mimeType = determineMimeType(filePath);
        String base64Data = Base64.getEncoder().encodeToString(data);
        return String.format("data:%s;base64,%s", mimeType, base64Data);
    }

    /**
     * 确保Logo字符串是完整的Data URL格式。
     */
    public static String ensureDataUrlFormat(String logo) {
        if (!hasText(logo)) {
            return null;
        }

        if (logo.startsWith("data:")) {
            return logo;
        }

        return "data:image/png;base64," + logo;
    }

    /**
     * 根据文件扩展名确定MIME类型。
     */
    public static String determineMimeType(String filePath) {
        if (!hasText(filePath)) {
            return DEFAULT_MIME_TYPE;
        }

        String extension = extractFileExtension(filePath);
        if (extension == null) {
            return DEFAULT_MIME_TYPE;
        }
        return MIME_TYPE_MAPPING.getOrDefault(extension.toLowerCase(), DEFAULT_MIME_TYPE);
    }

    /**
     * 判断是否为支持的图像格式。
     */
    public static boolean isSupportedImageFormat(String filePath) {
        if (!hasText(filePath)) {
            return false;
        }
        String extension = extractFileExtension(filePath);
        return extension != null && MIME_TYPE_MAPPING.containsKey(extension.toLowerCase());
    }

    /**
     * 提取文件扩展名。
     */
    public static String extractFileExtension(String filePath) {
        if (!hasText(filePath)) {
            return null;
        }

        int lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex < 0 || lastDotIndex == filePath.length() - 1) {
            return null;
        }
        return filePath.substring(lastDotIndex + 1);
    }

    /**
     * 从文件路径中提取不带扩展名的文件名。
     */
    public static String extractFileNameWithoutExtension(String filePath) {
        if (!hasText(filePath)) {
            return null;
        }

        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        String fileName = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;

        int dotIndex = fileName.lastIndexOf('.');
        return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    }

    /**
     * 提取文件名（包含扩展名）。
     */
    public static String extractFileName(String filePath) {
        if (!hasText(filePath)) {
            return null;
        }

        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    }

    /**
     * HTML 转义，防止XSS攻击。
     */
    public static String escapeHtml(String input) {
        if (input == null) {
            return "";
        }

        return input.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    /**
     * JSON 字符串转义。
     */
    public static String escapeJsonString(String str) {
        if (str == null) {
            return "";
        }

        return str.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
            .replace("\b", "\\b")
            .replace("\f", "\\f");
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
