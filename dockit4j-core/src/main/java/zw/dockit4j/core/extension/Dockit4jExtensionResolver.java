package zw.dockit4j.core.extension;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternUtils;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;
import zw.dockit4j.core.configuration.Dockit4jExtension;
import zw.dockit4j.core.configuration.extension.Dockit4jBrand;
import zw.dockit4j.core.configuration.extension.Dockit4jMarkdown;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dockit4j扩展解析器
 * <p>
 * 该类负责解析和构建Dockit4j扩展配置，主要功能包括：
 * <ul>
 * <li>解析和构建品牌信息（Logo、标题、页脚文本等）</li>
 * <li>解析Markdown文档配置，支持通配符模式</li>
 * <li>处理资源文件的加载和编码转换</li>
 * <li>提供缓存机制以提高性能</li>
 * </ul>
 * </p>
 *
 * <p>
 * <strong>支持的功能特性：</strong>
 * <ul>
 * <li>Logo文件自动转换为Base64编码</li>
 * <li>支持多种图像格式（PNG、JPG、SVG、GIF、WebP、ICO）</li>
 * <li>Markdown文件通配符匹配（支持 * 和 ? 通配符）</li>
 * <li>自动文件名排序和命名</li>
 * <li>异常处理和日志记录</li>
 * </ul>
 * </p>
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jExtensionResolver {

    /**
     * 日志记录器
     */
    private static final Logger log = LoggerFactory.getLogger(Dockit4jExtensionResolver.class);

    /**
     * 默认文档名称，当无法从资源中提取名称时使用
     */
    private static final String DEFAULT_DOCUMENT_NAME = "未命名文档";

    /**
     * 支持的通配符字符集合
     */
    private static final Set<String> WILDCARD_CHARS = Set.of("*", "?");

    /**
     * MIME类型映射表，用于根据文件扩展名确定内容类型
     */
    private static final Map<String, String> MIME_TYPE_MAPPING = Map
        .of("svg", "image/svg+xml", "png", "image/png", "jpg", "image/jpeg", "jpeg", "image/jpeg", "gif", "image/gif", "webp", "image/webp", "ico", "image/x-icon");

    /**
     * 默认MIME类型，用于未知文件类型
     */
    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";

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

    // ==================== 缓存机制 ====================

    /**
     * 资源内容缓存
     * 缓存已读取的资源内容，避免重复IO操作
     */
    private final Map<String, String> contentCache = new ConcurrentHashMap<>();

    /**
     * Logo Base64编码缓存
     * 缓存已转换的Logo Base64数据
     */
    private final Map<String, String> logoCache = new ConcurrentHashMap<>();

    /**
     * 构造函数 - 初始化扩展解析器
     *
     * @param resourceLoader     Spring资源加载器，不能为null
     * @param applicationContext Spring应用上下文，不能为null
     * @throws IllegalArgumentException 当参数为null时抛出
     */
    public Dockit4jExtensionResolver(ResourceLoader resourceLoader, ApplicationContext applicationContext) {
        this.resourceLoader = Objects.requireNonNull(resourceLoader, "ResourceLoader cannot be null");
        this.applicationContext = Objects.requireNonNull(applicationContext, "ApplicationContext cannot be null");
        this.resourcePatternResolver = ResourcePatternUtils.getResourcePatternResolver(resourceLoader);
    }

    /**
     * 构建完整的扩展数据
     * <p>
     * 这是该类的主入口方法，负责协调各个子模块的数据构建过程
     * </p>
     *
     * @param extension 扩展配置对象，可以为null
     * @return 完整的扩展数据Map，键为扩展类型，值为对应的配置数据
     */
    public Map<String, Object> buildExtensionData(Dockit4jExtension extension) {
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
    private Map<String, Object> buildBrandData(Dockit4jBrand brand) {
        Map<String, Object> brandData = new HashMap<>();

        if (brand == null) {
            return brandData;
        }

        try {
            // 解析 Logo
            String logoBase64 = resolveLogo(brand.getLogo());
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
     * @return Markdown文档数据列表，每个元素包含group、name、content等字段
     */
    private List<Map<String, Object>> buildMarkdownData(List<Dockit4jMarkdown> markdownList) {
        if (CollectionUtils.isEmpty(markdownList)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();

        for (Dockit4jMarkdown markdown : markdownList) {
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
     * 解析通配符模式的 Markdown 路径
     * <p>
     * 使用Spring的ResourcePatternResolver来解析Ant风格的路径模式，
     * 支持以下模式：
     * <ul>
     * <li> classpath*:docs/** /*.md -匹配所有classpath中docs目录下的md文件</li>
     * <li>file:docs/*.md - 匹配指定目录下的md文件</li>
     * 
     * <li>**&#47;*.md - 递归匹配所有md文件</li>
     * </ul>
     * </p>
     *
     * @param template 模版配置，包含通配符路径和默认属性
     * @return 解析得到的Markdown文档数据列表，按文件名排序
     */
    private List<Map<String, Object>> resolveWildcardMarkdown(Dockit4jMarkdown template) {
        List<Map<String, Object>> results = new ArrayList<>();
        String location = template.getLocation();

        try {
            Resource[] resources = resourcePatternResolver.getResources(location);

            if (resources.length == 0) {
                return results;
            }

            for (Resource resource : resources) {
                if (resource.exists() && resource.isReadable()) {
                    try {
                        String content = readResourceContent(resource);
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
     *
     * @param template 模版配置
     * @param resource 资源对象
     * @param content  文件内容
     * @return Markdown数据Map
     */
    private Map<String, Object> createMarkdownDataMap(Dockit4jMarkdown template, Resource resource, String content) {
        Map<String, Object> markdownData = new HashMap<>();

        // 设置分组信息
        if (StringUtils.hasText(template.getGroup())) {
            markdownData.put("group", template.getGroup());
        }

        // 生成文档名称：优先使用模板名称，否则使用文件名
        String name = generateMarkdownName(template.getName(), resource);
        markdownData.put("name", name);
        markdownData.put("content", content);
        markdownData.put("filename", resource.getFilename());

        // 添加额外的元数据
        try {
            markdownData.put("lastModified", resource.lastModified());
            markdownData.put("contentLength", resource.contentLength());
        } catch (IOException e) {
            log.debug("Failed to get resource metadata for: {}", resource.getDescription());
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
    private Map<String, Object> resolveSingleMarkdown(Dockit4jMarkdown markdown) {
        String location = markdown.getLocation();

        try {
            String content = resolveMarkdownContent(location);
            if (content == null) {
                return null;
            }

            Map<String, Object> result = new HashMap<>();

            // 设置分组
            if (StringUtils.hasText(markdown.getGroup())) {
                result.put("group", markdown.getGroup());
            }

            // 设置名称
            String name = StringUtils.hasText(markdown.getName())
                ? markdown.getName()
                : extractFileNameWithoutExtension(location);
            result.put("name", name);
            result.put("content", content);
            result.put("location", location);

            return result;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 从文件路径中提取不带扩展名的文件名
     *
     * @param location 文件路径
     * @return 不带扩展名的文件名
     */
    private String extractFileNameWithoutExtension(String location) {
        if (!StringUtils.hasText(location)) {
            return DEFAULT_DOCUMENT_NAME;
        }

        // 提取文件名部分
        int lastSlash = Math.max(location.lastIndexOf('/'), location.lastIndexOf('\\'));
        String fileName = (lastSlash >= 0) ? location.substring(lastSlash + 1) : location;

        // 去掉扩展名
        int dotIndex = fileName.lastIndexOf('.');
        return (dotIndex > 0) ? fileName.substring(0, dotIndex) : fileName;
    }

    /**
     * 生成 Markdown 文档显示名称
     * <p>
     * 名称生成优先级：
     * 1. 模版中配置的自定义名称
     * 2. 从资源文件名提取（去掉扩展名）
     * 3. 默认名称
     * </p>
     *
     * @param templateName 模版名称，可以为null
     * @param resource     资源对象
     * @return 生成的文档名称，保证不为null
     */
    private String generateMarkdownName(String templateName, Resource resource) {
        // 优先使用模版名称
        if (StringUtils.hasText(templateName)) {
            return templateName;
        }

        // 从资源文件名中提取
        String filename = resource.getFilename();
        if (filename != null) {
            int dotIndex = filename.lastIndexOf('.');
            String nameWithoutExt = (dotIndex > 0) ? filename.substring(0, dotIndex) : filename;
            return StringUtils.hasText(nameWithoutExt) ? nameWithoutExt : DEFAULT_DOCUMENT_NAME;
        }

        return DEFAULT_DOCUMENT_NAME;
    }

    /**
     * 解析 Logo 文件并转换为 Base64 编码
     * <p>
     * 支持的图像格式：PNG、JPG、JPEG、GIF、SVG、WebP、ICO
     * 转换后的格式：data:[mimeType];base64,[base64Data]
     * </p>
     *
     * @param logoPath Logo文件路径，支持classpath:、file:等Spring资源路径格式
     * @return Base64编码的Data URL，如果处理失败返回null
     */
    private String resolveLogo(String logoPath) {
        if (!StringUtils.hasText(logoPath)) {
            return null;
        }

        // 检查缓存
        String cachedLogo = logoCache.get(logoPath);
        if (cachedLogo != null) {
            return cachedLogo;
        }

        try {
            Resource resource = resourceLoader.getResource(logoPath);
            if (!resource.exists()) {
                return null;
            }

            // 检查文件可读性
            if (!resource.isReadable()) {
                return null;
            }

            byte[] logoBytes = readResourceBytes(resource);
            if (logoBytes.length == 0) {
                return null;
            }

            String mimeType = determineMimeType(logoPath);
            String base64Data = Base64.getEncoder().encodeToString(logoBytes);
            String dataUrl = "data:" + mimeType + ";base64," + base64Data;

            // 缓存结果
            logoCache.put(logoPath, dataUrl);
            return dataUrl;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 解析 Markdown 文件内容
     * <p>
     * 支持缓存机制，避免重复读取相同文件
     * </p>
     *
     * @param location Markdown文件路径
     * @return 文件内容字符串，如果读取失败返回null
     */
    private String resolveMarkdownContent(String location) {
        if (!StringUtils.hasText(location)) {
            return null;
        }

        // 检查缓存
        String cachedContent = contentCache.get(location);
        if (cachedContent != null) {
            return cachedContent;
        }

        try {
            Resource resource = resourceLoader.getResource(location);
            if (!resource.exists()) {
                return null;
            }

            if (!resource.isReadable()) {
                return null;
            }

            String content = readResourceContent(resource);

            // 缓存内容
            contentCache.put(location, content);
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
    private String readResourceContent(Resource resource) throws IOException {
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
    private byte[] readResourceBytes(Resource resource) throws IOException {
        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToByteArray(inputStream);
        }
    }

    /**
     * 根据文件扩展名确定 MIME 类型
     * <p>
     * 支持常见的图像格式MIME类型识别，对于未知类型返回通用二进制类型
     * </p>
     *
     * @param filePath 文件路径
     * @return 对应的MIME类型字符串
     */
    private String determineMimeType(String filePath) {
        if (!StringUtils.hasText(filePath)) {
            return DEFAULT_MIME_TYPE;
        }

        int lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex < 0 || lastDotIndex == filePath.length() - 1) {
            return DEFAULT_MIME_TYPE;
        }

        String extension = filePath.substring(lastDotIndex + 1).toLowerCase();
        return MIME_TYPE_MAPPING.getOrDefault(extension, DEFAULT_MIME_TYPE);
    }

    /**
     * 清除所有缓存
     * <p>
     * 用于释放内存或在配置更新时清除旧的缓存数据
     * </p>
     */
    public void clearCache() {
        contentCache.clear();
        logoCache.clear();
    }

    /**
     * 获取缓存统计信息
     *
     * @return 包含缓存大小信息的Map
     */
    public Map<String, Integer> getCacheStats() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("contentCacheSize", contentCache.size());
        stats.put("logoCacheSize", logoCache.size());
        return stats;
    }

}
