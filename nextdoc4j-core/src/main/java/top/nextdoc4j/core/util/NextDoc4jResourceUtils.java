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

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * NextDoc4j 资源处理工具类
 * <p>
 * 提供统一的资源加载、Logo处理、MIME类型识别等功能
 * 支持缓存机制以提高性能
 * </p>
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jResourceUtils {

    /**
     * MIME类型映射表，用于根据文件扩展名确定内容类型
     */
    private static final Map<String, String> MIME_TYPE_MAPPING = Map
        .of("svg", "image/svg+xml", "png", "image/png", "jpg", "image/jpeg", "jpeg", "image/jpeg", "gif", "image/gif", "webp", "image/webp", "ico", "image/x-icon");

    /**
     * 默认MIME类型，用于未知文件类型
     */
    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";

    /**
     * Logo Base64编码缓存
     * 缓存已转换的Logo Base64数据，避免重复处理
     */
    private static final Map<String, String> LOGO_CACHE = new ConcurrentHashMap<>();

    /**
     * 资源内容缓存
     * 缓存已读取的文本资源内容，避免重复IO操作
     */
    private static final Map<String, String> CONTENT_CACHE = new ConcurrentHashMap<>();

    /**
     * 私有构造函数，防止实例化
     */
    private NextDoc4jResourceUtils() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    // ==================== Logo处理相关方法 ====================

    /**
     * 解析Logo文件并转换为Base64编码的Data URL
     * <p>
     * 支持的图像格式：PNG、JPG、JPEG、GIF、SVG、WebP、ICO
     * 转换后的格式：data:[mimeType];base64,[base64Data]
     * </p>
     *
     * @param logoPath       Logo文件路径，支持classpath:、file:等Spring资源路径格式
     * @param resourceLoader Spring资源加载器
     * @return Base64编码的Data URL，如果处理失败返回null
     */
    public static String resolveLogo(String logoPath, ResourceLoader resourceLoader) {
        if (!StringUtils.hasText(logoPath) || resourceLoader == null) {
            return null;
        }

        // 检查缓存
        String cachedLogo = LOGO_CACHE.get(logoPath);
        if (cachedLogo != null) {
            return cachedLogo;
        }

        try {
            Resource resource = resourceLoader.getResource(logoPath);
            if (!isResourceValid(resource)) {
                return null;
            }

            byte[] logoBytes = readResourceBytes(resource);
            if (logoBytes == null || logoBytes.length == 0) {
                return null;
            }

            String dataUrl = convertToDataUrl(logoBytes, logoPath);

            // 缓存结果
            LOGO_CACHE.put(logoPath, dataUrl);
            return dataUrl;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 将字节数组转换为Data URL格式
     *
     * @param data     字节数组
     * @param filePath 文件路径（用于确定MIME类型）
     * @return Data URL字符串
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
     * 确保Logo字符串是完整的Data URL格式
     * 如果输入已经是Data URL格式，则直接返回
     * 如果是纯Base64字符串，则添加默认的PNG格式前缀
     *
     * @param logo Logo字符串（可能是Data URL或纯Base64）
     * @return 完整的Data URL格式字符串
     */
    public static String ensureDataUrlFormat(String logo) {
        if (!StringUtils.hasText(logo)) {
            return null;
        }

        if (logo.startsWith("data:")) {
            return logo;
        }

        // 默认假设为PNG格式
        return "data:image/png;base64," + logo;
    }

    // ==================== 资源读取相关方法 ====================

    /**
     * 读取资源文件内容（文本格式）
     * <p>
     * 使用UTF-8编码读取文本文件内容，支持缓存机制
     * </p>
     *
     * @param location       资源位置
     * @param resourceLoader Spring资源加载器
     * @return 文件内容字符串，读取失败返回null
     */
    public static String readResourceContent(String location, ResourceLoader resourceLoader) {
        if (!StringUtils.hasText(location) || resourceLoader == null) {
            return null;
        }

        // 检查缓存
        String cachedContent = CONTENT_CACHE.get(location);
        if (cachedContent != null) {
            return cachedContent;
        }

        try {
            Resource resource = resourceLoader.getResource(location);
            if (!isResourceValid(resource)) {
                return null;
            }

            String content = readResourceContent(resource);
            if (content != null) {
                // 缓存内容
                CONTENT_CACHE.put(location, content);
            }

            return content;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 读取资源文件内容（文本格式）
     * <p>
     * 使用UTF-8编码读取文本文件内容，自动关闭输入流
     * </p>
     *
     * @param resource Spring资源对象
     * @return 文件内容字符串
     * @throws IOException 当文件读取失败时抛出
     */
    public static String readResourceContent(Resource resource) throws IOException {
        if (resource == null) {
            return null;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
        }
    }

    /**
     * 读取资源文件内容（字节格式）
     * <p>
     * 用于读取二进制文件（如图片），自动关闭输入流
     * </p>
     *
     * @param resource Spring资源对象
     * @return 文件内容字节数组
     * @throws IOException 当文件读取失败时抛出
     */
    public static byte[] readResourceBytes(Resource resource) throws IOException {
        if (resource == null) {
            return null;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToByteArray(inputStream);
        }
    }

    // ==================== MIME类型相关方法 ====================

    /**
     * 根据文件扩展名确定MIME类型
     * <p>
     * 支持常见的图像格式MIME类型识别，对于未知类型返回通用二进制类型
     * </p>
     *
     * @param filePath 文件路径
     * @return 对应的MIME类型字符串
     */
    public static String determineMimeType(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return DEFAULT_MIME_TYPE;
        }

        String extension = extractFileExtension(filePath);
        if (extension == null) {
            return DEFAULT_MIME_TYPE;
        }

        return MIME_TYPE_MAPPING.getOrDefault(extension.toLowerCase(), DEFAULT_MIME_TYPE);
    }

    /**
     * 判断是否为支持的图像格式
     *
     * @param filePath 文件路径
     * @return true表示是支持的图像格式
     */
    public static boolean isSupportedImageFormat(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return false;
        }

        String extension = extractFileExtension(filePath);
        return extension != null && MIME_TYPE_MAPPING.containsKey(extension.toLowerCase());
    }

    // ==================== 文件名处理相关方法 ====================

    /**
     * 提取文件扩展名
     *
     * @param filePath 文件路径
     * @return 文件扩展名（不包含点号），如果没有扩展名返回null
     */
    public static String extractFileExtension(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return null;
        }

        int lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex < 0 || lastDotIndex == filePath.length() - 1) {
            return null;
        }

        return filePath.substring(lastDotIndex + 1);
    }

    /**
     * 从文件路径中提取不带扩展名的文件名
     *
     * @param filePath 文件路径
     * @return 不带扩展名的文件名
     */
    public static String extractFileNameWithoutExtension(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return null;
        }

        // 提取文件名部分
        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        String fileName = (lastSlash >= 0) ? filePath.substring(lastSlash + 1) : filePath;

        // 去掉扩展名
        int dotIndex = fileName.lastIndexOf('.');
        return (dotIndex > 0) ? fileName.substring(0, dotIndex) : fileName;
    }

    /**
     * 提取文件名（包含扩展名）
     *
     * @param filePath 文件路径
     * @return 文件名
     */
    public static String extractFileName(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return null;
        }

        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return (lastSlash >= 0) ? filePath.substring(lastSlash + 1) : filePath;
    }

    // ==================== 验证相关方法 ====================

    /**
     * 检查资源是否有效（存在且可读）
     *
     * @param resource Spring资源对象
     * @return true表示资源有效
     */
    public static boolean isResourceValid(Resource resource) {
        if (resource == null) {
            return false;
        }

        try {
            return resource.exists() && resource.isReadable();
        } catch (Exception e) {
            return false;
        }
    }

    // ==================== HTML处理相关方法 ====================

    /**
     * HTML转义，防止XSS攻击
     *
     * @param input 输入字符串
     * @return 转义后的字符串
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
     * JSON字符串转义
     *
     * @param str 原始字符串
     * @return 转义后的字符串
     */
    public static String escapeJsonString(String str) {
        if (str == null) {
            return "";
        }

        return str.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    // ==================== 缓存管理相关方法 ====================

    /**
     * 清除所有缓存
     * <p>
     * 用于释放内存或在配置更新时清除旧的缓存数据
     * </p>
     */
    public static void clearAllCaches() {
        LOGO_CACHE.clear();
        CONTENT_CACHE.clear();
    }

    /**
     * 清除Logo缓存
     */
    public static void clearLogoCache() {
        LOGO_CACHE.clear();
    }

    /**
     * 清除内容缓存
     */
    public static void clearContentCache() {
        CONTENT_CACHE.clear();
    }

    /**
     * 获取缓存统计信息
     *
     * @return 包含缓存大小信息的Map
     */
    public static Map<String, Integer> getCacheStats() {
        return Map.of("logoCacheSize", LOGO_CACHE.size(), "contentCacheSize", CONTENT_CACHE
            .size(), "totalCacheSize", LOGO_CACHE.size() + CONTENT_CACHE.size());
    }

    /**
     * 从缓存中移除指定的Logo
     *
     * @param logoPath Logo路径
     * @return 被移除的缓存值，如果不存在返回null
     */
    public static String removeLogoFromCache(String logoPath) {
        return LOGO_CACHE.remove(logoPath);
    }

    /**
     * 从缓存中移除指定的内容
     *
     * @param location 资源位置
     * @return 被移除的缓存值，如果不存在返回null
     */
    public static String removeContentFromCache(String location) {
        return CONTENT_CACHE.remove(location);
    }
}
