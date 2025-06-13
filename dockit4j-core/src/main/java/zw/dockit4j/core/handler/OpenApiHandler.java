package zw.dockit4j.core.handler;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.IoUtil;
import io.swagger.v3.core.jackson.TypeNameResolver;
import io.swagger.v3.core.util.AnnotationsUtils;
import io.swagger.v3.oas.annotations.tags.Tags;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.customizers.OpenApiBuilderCustomizer;
import org.springdoc.core.customizers.ServerBaseUrlCustomizer;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.providers.JavadocProvider;
import org.springdoc.core.service.OpenAPIService;
import org.springdoc.core.service.SecurityService;
import org.springdoc.core.utils.PropertyResolverUtils;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;

import java.io.StringReader;
import java.lang.reflect.Method;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * OpenAPI处理器类
 * <p>
 * 该类继承自OpenAPIService，主要负责：
 * 1. 构建和管理OpenAPI文档的标签信息
 * 2. 处理方法和类级别的注解标签
 * 3. 支持自定义标签名称（使用Javadoc注释）
 * 4. 管理安全需求配置
 * 5. 缓存OpenAPI文档实例
 * </p>
 *
 * @author echo
 * @since 1.0.0
 **/
@SuppressWarnings("all")
public class OpenApiHandler extends OpenAPIService {
    /**
     * 日志记录器
     */
    private static final Logger log = LoggerFactory.getLogger(OpenApiHandler.class);

    /**
     * 基础错误控制器类
     * 用于处理应用程序的错误响应
     */
    private static Class<?> basicErrorController;

    // ==================== 核心依赖服务 ====================

    /**
     * 安全解析服务
     * 负责解析和构建API的安全需求
     */
    private final SecurityService securityParser;

    /**
     * 属性解析工具
     * 用于解析配置属性和国际化消息
     */
    private final PropertyResolverUtils propertyResolverUtils;

    /**
     * SpringDoc配置属性
     * 包含所有SpringDoc相关的配置信息
     */
    private final SpringDocConfigProperties springDocConfigProperties;

    /**
     * Javadoc提供者（可选）
     * 用于从Java源码中提取文档注释
     */
    private final Optional<JavadocProvider> javadocProvider;

    // ==================== 自定义扩展 ====================

    /**
     * OpenAPI构建器自定义器列表（可选）
     * 允许用户自定义OpenAPI构建过程
     */
    private final Optional<List<OpenApiBuilderCustomizer>> openApiBuilderCustomizers;

    /**
     * 服务器基础URL自定义器列表（可选）
     * 允许动态定制服务器URL
     */
    private final Optional<List<ServerBaseUrlCustomizer>> serverBaseUrlCustomizers;

    // ==================== 缓存和映射 ====================

    /**
     * 映射信息缓存
     * 存储URL映射相关信息，提高查询效率
     */
    private final Map<String, Object> mappingsMap = new HashMap<>();

    /**
     * SpringDoc标签映射
     * 缓存HandlerMethod与Tag的对应关系
     */
    private final Map<HandlerMethod, Tag> springdocTags = new HashMap<>();

    /**
     * OpenAPI文档缓存
     * 按组名缓存已构建的OpenAPI文档实例
     */
    private final Map<String, OpenAPI> cachedOpenAPI = new HashMap<>();

    // ==================== 运行时状态 ====================

    /**
     * Spring应用上下文
     */
    private ApplicationContext context;

    /**
     * 当前OpenAPI文档实例
     */
    private OpenAPI openAPI;

    /**
     * 是否存在服务器配置标志
     */
    private boolean isServersPresent;

    /**
     * 服务器基础URL
     */
    private String serverBaseUrl;

    /**
     * 构造函数 - 初始化OpenAPI处理器
     *
     * @param openAPI                   OpenAPI文档实例（可选）
     * @param securityParser            安全解析服务
     * @param springDocConfigProperties SpringDoc配置属性
     * @param propertyResolverUtils     属性解析工具
     * @param openApiBuilderCustomizers OpenAPI构建器自定义器列表（可选）
     * @param serverBaseUrlCustomizers  服务器URL自定义器列表（可选）
     * @param javadocProvider           Javadoc提供者（可选）
     */
    public OpenApiHandler(Optional<OpenAPI> openAPI,
                          SecurityService securityParser,
                          SpringDocConfigProperties springDocConfigProperties,
                          PropertyResolverUtils propertyResolverUtils,
                          Optional<List<OpenApiBuilderCustomizer>> openApiBuilderCustomizers,
                          Optional<List<ServerBaseUrlCustomizer>> serverBaseUrlCustomizers,
                          Optional<JavadocProvider> javadocProvider) {

        // 调用父类构造函数
        super(openAPI, securityParser, springDocConfigProperties, propertyResolverUtils, openApiBuilderCustomizers, serverBaseUrlCustomizers, javadocProvider);

        // 初始化OpenAPI文档实例
        initializeOpenApiDocument(openAPI);

        // 设置依赖服务
        this.securityParser = securityParser;
        this.propertyResolverUtils = propertyResolverUtils;
        this.springDocConfigProperties = springDocConfigProperties;
        this.openApiBuilderCustomizers = openApiBuilderCustomizers;
        this.serverBaseUrlCustomizers = serverBaseUrlCustomizers;
        this.javadocProvider = javadocProvider;

        // 配置类型名称解析器
        configureTypeNameResolver();
    }

    /**
     * 初始化OpenAPI文档实例
     *
     * @param openAPI OpenAPI文档实例（可选）
     */
    private void initializeOpenApiDocument(Optional<OpenAPI> openAPI) {
        if (openAPI.isPresent()) {
            this.openAPI = openAPI.get();

            // 确保Components存在
            if (this.openAPI.getComponents() == null) {
                this.openAPI.setComponents(new Components());
            }

            // 确保Paths存在
            if (this.openAPI.getPaths() == null) {
                this.openAPI.setPaths(new Paths());
            }

            // 检查是否配置了服务器信息
            if (CollUtil.isNotEmpty(this.openAPI.getServers())) {
                this.isServersPresent = true;
            }
        }
    }

    /**
     * 配置类型名称解析器
     */
    private void configureTypeNameResolver() {
        if (springDocConfigProperties.isUseFqn()) {
            TypeNameResolver.std.setUseFqn(true);
        }
    }

    /**
     * 集合类型转换工具方法
     * <p>
     * 将Collection转化为Set集合，支持泛型转换
     * {@code Collection<E> -----> Set<T>}
     * </p>
     *
     * @param collection 需要转化的集合
     * @param function   类型转换函数 (E -> T)
     * @param <E>        源集合的泛型类型
     * @param <T>        目标Set的泛型类型
     * @return 转化后的Set集合，如果输入为空则返回空Set
     */
    public static <E, T> Set<T> toSet(Collection<E> collection, Function<E, T> function) {
        if (CollUtil.isEmpty(collection) || function == null) {
            return new HashSet<>();
        }

        return collection.stream().map(function).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    /**
     * 构建OpenAPI操作的标签信息
     * <p>
     * 该方法是标签构建的核心，按以下优先级处理标签：
     * 1. 方法级别的@Tag注解
     * 2. 类级别的@Tag注解
     * 3. SpringDoc预定义标签
     * 4. 自动生成标签（基于类名或Javadoc）
     * 5. 安全需求处理
     * </p>
     *
     * @param handlerMethod 处理器方法
     * @param operation     OpenAPI操作对象
     * @param openAPI       OpenAPI文档实例
     * @param locale        本地化配置
     * @return 更新后的Operation对象
     */
    @Override
    public Operation buildTags(HandlerMethod handlerMethod, Operation operation, OpenAPI openAPI, Locale locale) {
        // 初始化标签集合
        Set<Tag> tags = new HashSet<>();
        Set<String> tagNames = new HashSet<>();

        try {
            // 1. 构建方法级别标签
            buildTagsFromMethod(handlerMethod.getMethod(), tags, tagNames, locale);

            // 2. 构建类级别标签
            buildTagsFromClass(handlerMethod.getBeanType(), tags, tagNames, locale);

            // 3. 解析标签名称中的属性占位符
            tagNames = resolveTagNames(tagNames, locale);

            // 4. 处理SpringDoc预定义标签
            processSpringdocTags(handlerMethod, tagNames, openAPI);

            // 5. 设置操作标签
            setOperationTags(operation, tagNames);

            // 6. 处理自动标签生成
            processAutoTags(handlerMethod, operation, openAPI);

            // 7. 更新OpenAPI文档标签
            updateOpenApiTags(openAPI, tags);

            // 8. 处理安全需求
            processSecurityRequirements(handlerMethod, operation);

        } catch (Exception e) {
            log.error("构建方法标签时出错: {}.{}", handlerMethod.getBeanType().getSimpleName(), handlerMethod.getMethod()
                .getName(), e);
        }
        return operation;
    }

    /**
     * 从方法注解中构建标签
     *
     * @param method   目标方法
     * @param tags     标签集合
     * @param tagNames 标签名称集合
     * @param locale   本地化配置
     */
    private void buildTagsFromMethod(Method method, Set<Tag> tags, Set<String> tagNames, Locale locale) {
        // 查找所有@Tags注解
        Set<Tags> tagsSet = AnnotatedElementUtils.findAllMergedAnnotations(method, Tags.class);
        Set<io.swagger.v3.oas.annotations.tags.Tag> methodTags = tagsSet.stream()
            .flatMap(x -> Stream.of(x.value()))
            .collect(Collectors.toSet());

        // 添加直接的@Tag注解
        methodTags.addAll(AnnotatedElementUtils
            .findAllMergedAnnotations(method, io.swagger.v3.oas.annotations.tags.Tag.class));

        if (CollUtil.isNotEmpty(methodTags)) {
            // 提取标签名称
            tagNames.addAll(toSet(methodTags, tag -> propertyResolverUtils.resolve(tag.name(), locale)));

            // 添加标签对象
            List<io.swagger.v3.oas.annotations.tags.Tag> allTags = new ArrayList<>(methodTags);
            addTags(allTags, tags, locale);
        }
    }

    /**
     * 解析标签名称中的属性占位符
     *
     * @param tagNames 原始标签名称集合
     * @param locale   本地化配置
     * @return 解析后的标签名称集合
     */
    private Set<String> resolveTagNames(Set<String> tagNames, Locale locale) {
        if (CollUtil.isNotEmpty(tagNames)) {
            return tagNames.stream().map(str -> propertyResolverUtils.resolve(str, locale)).collect(Collectors.toSet());
        }
        return tagNames;
    }

    /**
     * 处理SpringDoc预定义标签
     *
     * @param handlerMethod 处理器方法
     * @param tagNames      标签名称集合
     * @param openAPI       OpenAPI文档实例
     */
    private void processSpringdocTags(HandlerMethod handlerMethod, Set<String> tagNames, OpenAPI openAPI) {
        if (springdocTags.containsKey(handlerMethod)) {
            Tag tag = springdocTags.get(handlerMethod);
            tagNames.add(tag.getName());

            // 确保标签添加到OpenAPI文档中
            if (openAPI.getTags() == null || !openAPI.getTags().contains(tag)) {
                openAPI.addTagsItem(tag);
            }
        }
    }

    /**
     * 设置操作的标签列表
     *
     * @param operation 操作对象
     * @param tagNames  标签名称集合
     */
    private void setOperationTags(Operation operation, Set<String> tagNames) {
        if (CollUtil.isNotEmpty(tagNames)) {
            if (CollUtil.isEmpty(operation.getTags())) {
                operation.setTags(new ArrayList<>(tagNames));
            } else {
                // 合并现有标签和新标签
                Set<String> operationTagsSet = new HashSet<>(operation.getTags());
                operationTagsSet.addAll(tagNames);
                operation.getTags().clear();
                operation.getTags().addAll(operationTagsSet);
            }
        }
    }

    /**
     * 处理自动标签生成
     * <p>
     * 支持两种模式：
     * 1. 使用Javadoc注释作为标签名（如果可用）
     * 2. 使用驼峰命名分割的类名作为标签名
     * </p>
     *
     * @param handlerMethod 处理器方法
     * @param operation     操作对象
     * @param openAPI       OpenAPI文档实例
     */
    private void processAutoTags(HandlerMethod handlerMethod, Operation operation, OpenAPI openAPI) {
        if (!isAutoTagClasses(operation)) {
            return;
        }

        if (javadocProvider.isPresent()) {
            processJavadocBasedTag(handlerMethod, operation, openAPI);
        } else {
            processClassNameBasedTag(handlerMethod, operation);
        }
    }

    /**
     * 基于Javadoc注释生成标签
     *
     * @param handlerMethod 处理器方法
     * @param operation     操作对象
     * @param openAPI       OpenAPI文档实例
     */
    private void processJavadocBasedTag(HandlerMethod handlerMethod, Operation operation, OpenAPI openAPI) {
        try {
            String description = javadocProvider.get().getClassJavadoc(handlerMethod.getBeanType());
            if (StringUtils.hasText(description)) {
                List<String> lines = IoUtil.readLines(new StringReader(description), new ArrayList<>());
                if (!lines.isEmpty()) {
                    String tagName = lines.get(0).trim(); // 使用第一行作为标签名

                    Tag tag = new Tag();
                    tag.setName(tagName);
                    tag.setDescription(description);

                    operation.addTagsItem(tagName);

                    if (openAPI.getTags() == null || openAPI.getTags()
                        .stream()
                        .noneMatch(t -> t.getName().equals(tagName))) {
                        openAPI.addTagsItem(tag);
                    }
                }
            }
        } catch (Exception e) {
            // 降级到类名标签模式
            processClassNameBasedTag(handlerMethod, operation);
        }
    }

    /**
     * 基于类名生成标签
     *
     * @param handlerMethod 处理器方法
     * @param operation     操作对象
     */
    private void processClassNameBasedTag(HandlerMethod handlerMethod, Operation operation) {
        String tagAutoName = splitCamelCase(handlerMethod.getBeanType().getSimpleName());
        operation.addTagsItem(tagAutoName);
    }

    /**
     * 更新OpenAPI文档的标签列表
     *
     * @param openAPI OpenAPI文档实例
     * @param tags    标签集合
     */
    private void updateOpenApiTags(OpenAPI openAPI, Set<Tag> tags) {
        if (CollUtil.isNotEmpty(tags)) {
            List<Tag> openApiTags = openAPI.getTags();
            if (CollUtil.isNotEmpty(openApiTags)) {
                tags.addAll(openApiTags);
            }
            openAPI.setTags(new ArrayList<>(tags));
        }
    }

    /**
     * 处理操作级别的安全需求
     *
     * @param handlerMethod 处理器方法
     * @param operation     操作对象
     */
    private void processSecurityRequirements(HandlerMethod handlerMethod, Operation operation) {
        io.swagger.v3.oas.annotations.security.SecurityRequirement[] securityRequirements = securityParser
            .getSecurityRequirements(handlerMethod);

        if (securityRequirements != null) {
            if (securityRequirements.length == 0) {
                // 明确设置为无安全需求
                operation.setSecurity(Collections.emptyList());
            } else {
                // 构建安全需求
                securityParser.buildSecurityRequirement(securityRequirements, operation);
            }
        }
    }

    /**
     * 添加标签对象到标签集合
     * <p>
     * 处理标签的属性解析和去重逻辑
     * </p>
     *
     * @param sourceTags 源标签列表
     * @param tags       目标标签集合
     * @param locale     本地化配置
     */
    private void addTags(List<io.swagger.v3.oas.annotations.tags.Tag> sourceTags, Set<Tag> tags, Locale locale) {
        Optional<Set<Tag>> optionalTagSet = AnnotationsUtils.getTags(sourceTags
            .toArray(new io.swagger.v3.oas.annotations.tags.Tag[0]), true);

        optionalTagSet.ifPresent(tagsSet -> {
            tagsSet.forEach(tag -> {
                // 解析标签名称和描述中的属性占位符
                tag.name(propertyResolverUtils.resolve(tag.getName(), locale));
                tag.description(propertyResolverUtils.resolve(tag.getDescription(), locale));

                // 避免重复添加相同名称的标签
                if (tags.stream().noneMatch(t -> t.getName().equals(tag.getName()))) {
                    tags.add(tag);
                }
            });
        });
    }

    // ==================== 抽象方法实现占位符 ====================
    // 注意：以下方法需要根据实际的父类OpenAPIService来实现

    /**
     * 检查是否启用自动类标签功能
     *
     * @param operation 操作对象
     * @return 是否启用自动类标签
     */
    public boolean isAutoTagClasses(Operation operation) {
        // 实现逻辑需要根据实际的SpringDoc配置
        return springDocConfigProperties.isAutoTagClasses();
    }

    /**
     * 分割驼峰命名字符串
     *
     * @param input 输入字符串
     * @return 分割后的字符串
     */
    public static String splitCamelCase(String input) {
        if (!StringUtils.hasText(input)) {
            return input;
        }
        return input.replaceAll("([a-z])([A-Z])", "$1 $2");
    }

    /**
     * 从类注解中构建标签
     *
     * @param beanType 控制器类
     * @param tags     标签集合
     * @param tagNames 标签名称集合
     * @param locale   本地化配置
     */
    public void buildTagsFromClass(Class<?> beanType, Set<Tag> tags, Set<String> tagNames, Locale locale) {
        // 实现逻辑类似于buildTagsFromMethod，但处理类级别的注解
        Set<Tags> tagsSet = AnnotatedElementUtils.findAllMergedAnnotations(beanType, Tags.class);
        Set<io.swagger.v3.oas.annotations.tags.Tag> classTags = tagsSet.stream()
            .flatMap(x -> Stream.of(x.value()))
            .collect(Collectors.toSet());

        classTags.addAll(AnnotatedElementUtils
            .findAllMergedAnnotations(beanType, io.swagger.v3.oas.annotations.tags.Tag.class));

        if (CollUtil.isNotEmpty(classTags)) {
            tagNames.addAll(toSet(classTags, tag -> propertyResolverUtils.resolve(tag.name(), locale)));
            List<io.swagger.v3.oas.annotations.tags.Tag> allTags = new ArrayList<>(classTags);
            addTags(allTags, tags, locale);
        }
    }
}
