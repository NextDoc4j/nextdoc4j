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
package top.nextdoc4j.core.extension;

import cn.hutool.core.io.unit.DataSizeUtil;
import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternUtils;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.configuration.extension.NextDoc4jMarkdown;
import top.nextdoc4j.core.util.NextDoc4jResourceUtils;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * NextDoc4j扩展配置解析器
 * <p>
 * 该类负责解析和构建NextDoc4j的扩展配置（brand、markdown），主要功能包括：
 * <ul>
 * <li>解析和构建品牌信息（Logo、标题、页脚文本等）</li>
 * <li>解析Markdown文档配置，支持通配符模式</li>
 * <li>处理资源文件的加载和编码转换</li>
 * </ul>
 * </p>
 * <p>
 * <strong>注意：</strong>该类只在 {@code nextdoc4j.extension.enabled=true} 时才会被注入到 Spring 容器，
 * 用于处理品牌定制和 Markdown 文档等扩展功能。基础版本信息由
 * {@link top.nextdoc4j.core.extension.NextDoc4jExtensionOpenApiCustomizer} 直接提供。
 * </p>
 *
 * <p>
 * <strong>支持的功能特性：</strong>
 * <ul>
 * <li>Logo文件自动转换为Base64编码</li>
 * <li>支持多种图像格式（PNG、JPG、SVG、GIF、WebP、ICO）</li>
 * <li>Markdown文件通配符匹配（支持 * 和 ? 通配符）</li>
 * <li>自动文件名排序和命名</li>
 * <li>异常处理</li>
 * </ul>
 * </p>
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jExtensionResolver {

    /**
     * 日志记录器
     */
    private static final Logger log = LoggerFactory.getLogger(NextDoc4jExtensionResolver.class);

    /**
     * 默认文档名称，当无法从资源中提取名称时使用
     */
    private static final String DEFAULT_DOCUMENT_NAME = "未命名文档";

    /**
     * 支持的通配符字符集合
     */
    private static final Set<String> WILDCARD_CHARS = Set.of("*", "?");

    // ==================== 核心依赖服务 ====================

    /**
     * Spring资源加载器
     * 用于加载classpath、文件系统等各种位置的资源
     */
    private final ResourceLoader resourceLoader;

    /**
     * Spring资源模式解析器
     * 支持Ant风格的路径模式匹配，用于处理通配符路径
     */
    private final ResourcePatternResolver resourcePatternResolver;

    /**
     * Spring应用上下文
     * 用于获取Bean实例和应用配置信息
     */
    private final ApplicationContext applicationContext;

    /**
     * 构造函数 - 初始化扩展解析器
     *
     * @param resourceLoader     Spring资源加载器，不能为null
     * @param applicationContext Spring应用上下文，不能为null
     * @throws IllegalArgumentException 当参数为null时抛出
     */
    public NextDoc4jExtensionResolver(ResourceLoader resourceLoader, ApplicationContext applicationContext) {
        this.resourceLoader = Objects.requireNonNull(resourceLoader, "ResourceLoader cannot be null");
        this.applicationContext = Objects.requireNonNull(applicationContext, "ApplicationContext cannot be null");
        this.resourcePatternResolver = ResourcePatternUtils.getResourcePatternResolver(resourceLoader);
    }

    /**
     * 构建扩展配置数据
     * <p>
     * 这是该类的主入口方法，负责协调各个子模块的数据构建过程。
     * 只包含品牌和 Markdown 配置，不包含基础版本信息。
     * </p>
     *
     * @param extension 扩展配置对象，可以为null
     * @return 扩展配置数据Map，包含 brand、markdown 等字段
     */
    public Map<String, Object> buildExtensionConfig(NextDoc4jExtension extension) {
        Map<String, Object> extensionData = new HashMap<>();

        if (extension == null) {
            return extensionData;
        }

        try {
            // 构建品牌信息
            Map<String, Object> brandData = buildBrandData(extension.getBrand());
            if (!brandData.isEmpty()) {
                extensionData.put("brand", brandData);
            }

            // 构建 Markdown 信息（支持通配符）
            List<Map<String, Object>> markdownData = buildMarkdownData(extension.getMarkdown());
            if (!markdownData.isEmpty()) {
                extensionData.put("markdown", markdownData);
            }
        } catch (Exception e) {
            log.error("Failed to build extension data", e);
        }

        return extensionData;
    }

    /**
     * 构建自定义公司品牌信息
     * <p>
     * 主要处理以下品牌元素：
     * <ul>
     * <li>Logo图标 - 自动转换为Base64编码</li>
     * <li>标题 - 支持自定义或从OpenAPI配置中获取</li>
     * <li>页脚文本 - 显示在页面底部的版权或其他信息</li>
     * </ul>
     * </p>
     *
     * @param brand 品牌配置对象，可以为null
     * @return 品牌数据Map，包含logo、title、footerText等字段
     */
    private Map<String, Object> buildBrandData(NextDoc4jBrand brand) {
        Map<String, Object> brandData = new HashMap<>();

        if (brand == null) {
            return brandData;
        }

        try {
            // 使用工具类解析 Logo
            String logoBase64 = NextDoc4jResourceUtils.resolveLogo(brand.getLogo(), resourceLoader);
            if (logoBase64 != null) {
                brandData.put("logo", logoBase64);
            }

            // 设置标题
            String title = resolveTitle(brand.getTitle());
            if (StringUtils.hasText(title)) {
                brandData.put("title", title);
            }

            // 设置页脚文本
            if (StringUtils.hasText(brand.getFooterText())) {
                brandData.put("footerText", brand.getFooterText());
            }

        } catch (Exception e) {
            log.error("Error building brand data", e);
        }

        return brandData;
    }

    /**
     * 解析品牌标题
     * <p>
     * 标题解析优先级：
     * 1. 品牌配置中的自定义标题
     * 2. OpenAPI文档中的标题
     * 3. 返回null（不设置标题）
     * </p>
     *
     * @param customTitle 自定义标题
     * @return 解析后的标题，可能为null
     */
    private String resolveTitle(String customTitle) {
        if (StringUtils.hasText(customTitle)) {
            return customTitle;
        }

        try {
            OpenAPI openAPI = applicationContext.getBean(OpenAPI.class);
            if (openAPI.getInfo() != null) {
                String title = openAPI.getInfo().getTitle();
                if (StringUtils.hasText(title)) {
                    return title;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to get OpenAPI title, using custom title only", e);
        }

        return null;
    }

    /**
     * 构建 Markdown 文档数据
     * <p>
     * 支持两种模式：
     * <ul>
     * <li>单文件模式 - 直接指定文件路径</li>
     * <li>通配符模式 - 使用Ant风格模式匹配多个文件</li>
     * </ul>
     * </p>
     *
     * @param markdownList Markdown配置列表，可以为null或空
     * @return Markdown文档数据列表，每个元素包含group、filename、content等字段
     */
    private List<Map<String, Object>> buildMarkdownData(List<NextDoc4jMarkdown> markdownList) {
        if (CollectionUtils.isEmpty(markdownList)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();

        for (NextDoc4jMarkdown markdown : markdownList) {
            try {
                if (isWildcardPath(markdown.getLocation())) {
                    // 处理通配符路径
                    List<Map<String, Object>> wildcardResults = resolveWildcardMarkdown(markdown);
                    result.addAll(wildcardResults);
                } else {
                    // 处理单个文件
                    Map<String, Object> singleResult = resolveSingleMarkdown(markdown);
                    if (singleResult != null) {
                        result.add(singleResult);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to resolve markdown: {}", markdown.getLocation(), e);
            }
        }
        return result;
    }

    /**
     * 解析通配符模式的 Markdown 路径
     * <p>
     * 使用Spring的ResourcePatternResolver来解析Ant风格的路径模式
     * </p>
     *
     * @param template 模版配置，包含通配符路径和默认属性
     * @return 解析得到的Markdown文档数据列表，按文件名排序
     */
    private List<Map<String, Object>> resolveWildcardMarkdown(NextDoc4jMarkdown template) {
        List<Map<String, Object>> results = new ArrayList<>();
        String location = template.getLocation();

        try {
            Resource[] resources = resourcePatternResolver.getResources(location);

            if (resources.length == 0) {
                return results;
            }

            for (Resource resource : resources) {
                if (NextDoc4jResourceUtils.isResourceValid(resource)) {
                    try {
                        String content = NextDoc4jResourceUtils.readResourceContent(resource);
                        Map<String, Object> markdownData = createMarkdownDataMap(template, resource, content);
                        results.add(markdownData);
                    } catch (Exception e) {
                        log.error("Failed to process resource: {}", resource.getDescription(), e);
                    }
                }
            }

            // 按文件名排序，确保输出的一致性
            results.sort(Comparator.comparing(map -> (String)map.get("filename")));

        } catch (Exception e) {
            log.error("Failed to resolve wildcard markdown pattern: {}", location, e);
        }

        return results;
    }

    /**
     * 创建Markdown数据映射对象
     * 统一处理单文件和通配符文件，确保输出格式一致
     *
     * @param template 模版配置
     * @param resource 资源对象
     * @param content  文件内容
     * @return Markdown数据Map
     */
    private Map<String, Object> createMarkdownDataMap(NextDoc4jMarkdown template, Resource resource, String content) {
        Map<String, Object> markdownData = new HashMap<>();

        // 设置分组信息
        if (StringUtils.hasText(template.getGroup())) {
            markdownData.put("group", template.getGroup());
        }

        // 获取文件名和显示名称
        String filename = resource.getFilename();
        if (filename == null) {
            filename = DEFAULT_DOCUMENT_NAME + ".md";
        }

        String displayName = extractFileNameWithoutExtension(filename);

        // 统一的字段设置
        markdownData.put("filename", filename);
        markdownData.put("displayName", displayName);
        markdownData.put("content", content);

        // 添加额外的元数据
        try {
            LocalDateTime lastModified = Instant.ofEpochMilli(resource.lastModified())
                .atZone(ZoneId.of("Asia/Shanghai"))
                .toLocalDateTime();

            markdownData.put("lastModified", lastModified);
            markdownData.put("contentLength", DataSizeUtil.format(resource.contentLength()));
        } catch (IOException e) {
            log.debug("Failed to get resource metadata for: {}", resource.getDescription());
            // 设置默认值避免字段缺失
            markdownData.put("lastModified", 0L);
            markdownData.put("contentLength", content.length());
        }

        return markdownData;
    }

    /**
     * 解析单个 Markdown 文件
     * <p>
     * 处理单个指定路径的Markdown文件，不涉及模式匹配
     * </p>
     *
     * @param markdown Markdown配置对象
     * @return 单个Markdown文档数据Map，如果解析失败返回null
     */
    private Map<String, Object> resolveSingleMarkdown(NextDoc4jMarkdown markdown) {
        String location = markdown.getLocation();

        try {
            // 加载资源
            Resource resource = resourceLoader.getResource(location);
            if (!NextDoc4jResourceUtils.isResourceValid(resource)) {
                return null;
            }

            // 使用工具类读取内容
            String content = NextDoc4jResourceUtils.readResourceContent(resource);
            if (content == null) {
                return null;
            }

            // 使用统一的方法创建数据映射，确保格式一致
            return createMarkdownDataMap(markdown, resource, content);

        } catch (Exception e) {
            log.error("Failed to resolve single markdown: {}", location, e);
            return null;
        }
    }

    /**
     * 从location路径中提取文件名
     *
     * @param location 文件路径
     * @return 文件名
     */
    private String extractFilenameFromLocation(String location) {
        if (!StringUtils.hasText(location)) {
            return DEFAULT_DOCUMENT_NAME + ".md";
        }

        // 处理 classpath: 等前缀
        String path = location;
        if (path.contains(":")) {
            path = path.substring(path.lastIndexOf(":") + 1);
        }

        // 提取最后的文件名部分
        if (path.contains("/")) {
            path = path.substring(path.lastIndexOf("/") + 1);
        } else if (path.contains("\\")) {
            path = path.substring(path.lastIndexOf("\\") + 1);
        }

        return StringUtils.hasText(path) ? path : DEFAULT_DOCUMENT_NAME + ".md";
    }

    /**
     * 提取文件名（去掉扩展名）
     *
     * @param filename 完整文件名
     * @return 去掉扩展名的文件名
     */
    private String extractFileNameWithoutExtension(String filename) {
        if (!StringUtils.hasText(filename)) {
            return DEFAULT_DOCUMENT_NAME;
        }

        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            return filename.substring(0, dotIndex);
        }

        return filename;
    }

    /**
     * 判断路径是否包含通配符
     * <p>
     * 支持的通配符：
     * <ul>
     * <li>* - 匹配任意数量的字符</li>
     * <li>? - 匹配单个字符</li>
     * </ul>
     * </p>
     *
     * @param location 文件路径
     * @return 如果包含通配符返回true，否则返回false
     */
    private boolean isWildcardPath(String location) {
        if (!StringUtils.hasText(location)) {
            return false;
        }

        return WILDCARD_CHARS.stream().anyMatch(location::contains);
    }

    /**
     * 清除所有缓存
     * <p>
     * 委托给工具类处理
     * </p>
     */
    public void clearCache() {
        NextDoc4jResourceUtils.clearAllCaches();
    }

    /**
     * 获取缓存统计信息
     *
     * @return 包含缓存大小信息的Map
     */
    public Map<String, Integer> getCacheStats() {
        return NextDoc4jResourceUtils.getCacheStats();
    }

}
