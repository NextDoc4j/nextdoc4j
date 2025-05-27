package zw.dockit4j.core.extension;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

/**
 * 扩展解析器
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jExtensionResolver {

    private static final Logger log = LoggerFactory.getLogger(Dockit4jExtensionResolver.class);

    private final ResourceLoader resourceLoader;
    private final ResourcePatternResolver resourcePatternResolver;

    public Dockit4jExtensionResolver(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.resourcePatternResolver = ResourcePatternUtils.getResourcePatternResolver(resourceLoader);
    }

    /**
     * 构建完整的扩展数据
     *
     * @param extension 扩展配置
     * @return 完整的扩展数据Map
     */
    public Map<String, Object> buildExtensionData(Dockit4jExtension extension) {
        Map<String, Object> extensionData = new HashMap<>();

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

        return extensionData;
    }

    /**
     * 构建品牌数据
     */
    private Map<String, Object> buildBrandData(Dockit4jBrand brand) {
        Map<String, Object> brandData = new HashMap<>();

        if (brand == null) {
            return brandData;
        }

        // 解析 Logo
        String logoBase64 = resolveLogo(brand.getLogo());
        if (logoBase64 != null) {
            brandData.put("logo", logoBase64);
        }

        // 设置标题
        if (StringUtils.hasText(brand.getTitle())) {
            brandData.put("title", brand.getTitle());
        }

        // 设置页脚文本
        if (StringUtils.hasText(brand.getFooterText())) {
            brandData.put("footerText", brand.getFooterText());
        }

        return brandData;
    }

    /**
     * 构建 Markdown 数据（支持通配符）
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
                    result.addAll(resolveWildcardMarkdown(markdown));
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
     * 判断是否为通配符路径
     */
    private boolean isWildcardPath(String location) {
        return StringUtils.hasText(location) && (location.contains("*") || location.contains("?"));
    }

    /**
     * 解析通配符 Markdown 路径
     */
    private List<Map<String, Object>> resolveWildcardMarkdown(Dockit4jMarkdown template) {
        List<Map<String, Object>> results = new ArrayList<>();

        try {
            Resource[] resources = resourcePatternResolver.getResources(template.getLocation());

            for (Resource resource : resources) {
                if (resource.exists() && resource.isReadable()) {
                    String content = readResourceContent(resource);
                    if (content != null) {
                        Map<String, Object> markdownData = new HashMap<>();

                        // 使用模板的 group 信息
                        if (StringUtils.hasText(template.getGroup())) {
                            markdownData.put("group", template.getGroup());
                        }

                        // 生成文档名称：优先使用模板名称，否则使用文件名
                        String name = generateMarkdownName(template.getName(), resource);
                        markdownData.put("name", name);
                        markdownData.put("content", content);
                        markdownData.put("filename", resource.getFilename());

                        results.add(markdownData);
                    }
                }
            }

            // 按文件名排序
            results.sort(Comparator.comparing(map -> (String)map.get("filename")));

        } catch (Exception e) {
            log.error("Failed to resolve wildcard markdown pattern: {}", template.getLocation(), e);
        }

        return results;
    }

    /**
     * 解析单个 Markdown 文件
     */
    private Map<String, Object> resolveSingleMarkdown(Dockit4jMarkdown markdown) {
        try {
            String content = resolveMarkdownContent(markdown.getLocation());
            if (content == null) {
                return null;
            }

            Map<String, Object> result = new HashMap<>();
            if (StringUtils.hasText(markdown.getGroup())) {
                result.put("group", markdown.getGroup());
            }
            result.put("name", markdown.getName());
            result.put("content", content);
            return result;
        } catch (Exception e) {
            log.error("Failed to resolve single markdown: {}", markdown.getLocation(), e);
            return null;
        }
    }

    /**
     * 生成 Markdown 文档名称
     */
    private String generateMarkdownName(String templateName, Resource resource) {
        if (StringUtils.hasText(templateName)) {
            return templateName;
        }

        // 使用文件名（去掉扩展名）作为默认名称
        String filename = resource.getFilename();
        if (filename != null) {
            int dotIndex = filename.lastIndexOf('.');
            return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
        }

        return "未命名文档";
    }

    /**
     * 解析 Logo 文件为 Base64
     */
    private String resolveLogo(String logoPath) {
        if (!StringUtils.hasText(logoPath)) {
            return null;
        }

        try {
            Resource resource = resourceLoader.getResource(logoPath);
            if (!resource.exists()) {
                log.warn("Logo file not found: {}", logoPath);
                return null;
            }

            byte[] logoBytes = readResourceBytes(resource);
            String mimeType = determineMimeType(logoPath);
            return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(logoBytes);
        } catch (Exception e) {
            log.error("Failed to resolve logo: {}", logoPath, e);
            return null;
        }
    }

    /**
     * 解析 Markdown 文件内容
     */
    private String resolveMarkdownContent(String location) {
        if (!StringUtils.hasText(location)) {
            return null;
        }

        try {
            Resource resource = resourceLoader.getResource(location);
            if (!resource.exists()) {
                log.warn("Markdown file not found: {}", location);
                return null;
            }

            return readResourceContent(resource);
        } catch (Exception e) {
            log.error("Failed to resolve markdown content: {}", location, e);
            return null;
        }
    }

    /**
     * 读取资源文件内容（文本）
     */
    private String readResourceContent(Resource resource) throws IOException {
        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
        }
    }

    /**
     * 读取资源文件内容（字节）
     */
    private byte[] readResourceBytes(Resource resource) throws IOException {
        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToByteArray(inputStream);
        }
    }

    /**
     * 根据文件扩展名确定 MIME 类型
     */
    private String determineMimeType(String filePath) {
        String extension = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
        return switch (extension) {
            case "svg" -> "image/svg+xml";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "ico" -> "image/x-icon";
            default -> "application/octet-stream";
        };
    }

}
