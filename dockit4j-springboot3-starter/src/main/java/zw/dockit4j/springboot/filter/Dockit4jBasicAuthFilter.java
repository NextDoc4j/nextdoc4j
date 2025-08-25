package zw.dockit4j.springboot.filter;

import ch.qos.logback.core.joran.spi.HttpUtil;
import cn.hutool.core.util.StrUtil;
import io.swagger.v3.oas.models.OpenAPI;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import zw.dockit4j.core.configuration.Dockit4jExtension;
import zw.dockit4j.core.configuration.Dockit4jProperties;
import zw.dockit4j.core.configuration.extension.Dockit4jBasicAuth;
import zw.dockit4j.core.configuration.extension.Dockit4jBrand;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;
import zw.dockit4j.core.util.Dockit4jResourceUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;
import java.util.UUID;

/**
 * Dockit4j API文档基本认证过滤器
 *
 * <p>该过滤器提供以下功能：</p>
 * <ul>
 * <li>对指定路径进行HTTP Basic认证保护</li>
 * <li>支持会话保持，避免重复认证</li>
 * <li>自动生成默认密码（如果未配置）</li>
 * <li>提供友好的登录页面和注销功能</li>
 * <li>区分AJAX和浏览器请求，返回相应格式响应</li>
 * </ul>
 *
 * @author echo
 * @since 1.0.0
 */
public class Dockit4jBasicAuthFilter extends OncePerRequestFilter {

    // ==================== 常量定义 ====================
    /**
     * 日志记录器
     */
    private static final Logger log = LoggerFactory.getLogger(Dockit4jBasicAuthFilter.class);

    /**
     * Session中存储认证状态的键名
     */
    private static final String AUTH_SESSION_KEY = "dockit4j_authenticated";

    /**
     * 会话超时时间（秒）- 30分钟
     */
    private static final int SESSION_TIMEOUT_SECONDS = 30 * 60;

    /**
     * Basic认证头部前缀
     */
    private static final String BASIC_AUTH_PREFIX = "Basic ";

    /**
     * 注销操作参数值
     */
    private static final String LOGOUT_ACTION = "logout";

    /**
     * AJAX请求标识头
     */
    private static final String AJAX_HEADER = "X-Requested-With";

    /**
     * AJAX请求标识值
     */
    private static final String AJAX_HEADER_VALUE = "XMLHttpRequest";

    /**
     * 登录页面 HTML 文件路径
     */
    private static final String DOC_LOGIN = "classpath:/META-INF/resources/doclogin.html";

    // ==================== 成员变量 ====================

    public final Dockit4jProperties properties;

    /**
     * 基本认证配置对象
     */
    private final Dockit4jBasicAuth basicAuth;

    /**
     * dockit4j扩展
     */
    public final Dockit4jExtension dockit4jExtension;

    /**
     * 资源加载器
     */
    private final ResourceLoader resourceLoader;

    /**
     * 开放api
     */
    private final OpenAPI openAPI;

    // ==================== 构造方法 ====================

    /**
     * 构造函数
     *
     * @param properties     属性
     * @param resourceLoader 资源加载器
     * @param openAPI        OpenAPI对象
     */
    public Dockit4jBasicAuthFilter(Dockit4jProperties properties, ResourceLoader resourceLoader, OpenAPI openAPI) {

        this.resourceLoader = Objects.requireNonNull(resourceLoader, "ResourceLoader cannot be null");
        this.properties = properties;
        this.openAPI = openAPI;
        this.basicAuth = properties.getAuth();
        this.dockit4jExtension = properties.getExtension();
        // 初始化默认密码（如果需要）
        initializeDefaultPassword();
    }

    // ==================== 核心过滤逻辑 ====================

    /**
     * 过滤器核心处理方法
     *
     * <p>处理流程：</p>
     * <ol>
     * <li>检查路径是否需要认证</li>
     * <li>处理注销请求</li>
     * <li>检查会话认证状态</li>
     * <li>验证Basic认证信息</li>
     * <li>返回登录页面或继续处理</li>
     * </ol>
     *
     * @param request     HTTP请求对象
     * @param response    HTTP响应对象
     * @param filterChain 过滤器链
     * @throws ServletException Servlet异常
     * @throws IOException      IO异常
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String uri = request.getRequestURI();
        final String method = request.getMethod();

        // 1. 检查是否为需要认证的路径
        if (!isAuthenticationRequired(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. 处理注销请求
        if (isLogoutRequest(method, request)) {
            handleLogout(request, response);
            return;
        }

        // 3. 检查会话认证状态
        if (isSessionAuthenticated(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. 尝试基本认证
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith(BASIC_AUTH_PREFIX)) {

            if (validateBasicAuthentication(authHeader)) {
                // 认证成功
                createAuthenticatedSession(request);
                handleAuthenticationSuccess(request, response);
            } else {
                // 认证失败
                handleAuthenticationFailure(request, response);
            }
            return;
        }

        // 5. 显示登录页面
        showLoginPage(response);
    }

    // ==================== 私有辅助方法 ====================

    /**
     * 初始化默认密码
     * 如果启用了认证但未配置密码，则自动生成一个UUID作为默认密码
     */
    private void initializeDefaultPassword() {

        if (basicAuth.getPassword() == null || basicAuth.getPassword().trim().isEmpty()) {
            final String generatedPassword = UUID.randomUUID().toString().replace("-", "");
            basicAuth.setPassword(generatedPassword);

            log.info("╔══════════════════════════════════════════════════════════════════════════════════════╗");
            log.info("║                          Dockit4j 基本认证已启用                                        ║");
            log.info("║                                                                                      ║");
            log.info("║  未配置密码，已自动生成默认密码，请妥善保管：                                                  ║");
            log.info("║  密码: {}                                           ║", generatedPassword);
            log.info("║                                                                                      ║");
            log.info("║  建议：请在配置文件中设置自定义密码以确保安全性                                                 ║");
            log.info("╚══════════════════════════════════════════════════════════════════════════════════════╝");
        }
    }

    /**
     * 检查路径是否需要认证
     *
     * @param uri 请求URI
     * @return true表示需要认证，false表示不需要认证
     */
    private boolean isAuthenticationRequired(String uri) {
        if (!basicAuth.isEnabled()) {
            return false;
        }

        // 精确路径匹配
        for (String exactPath : Dockit4jFilterConstant.BlockedPaths.EXACT_PATHS) {
            if (uri.equals(exactPath)) {
                return true;
            }
        }

        // 前缀路径匹配
        for (String prefix : Dockit4jFilterConstant.BlockedPaths.PREFIX_PATHS) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }

        // 正则表达式匹配
        for (String pattern : Dockit4jFilterConstant.BlockedPaths.REGEX_PATTERNS) {
            if (uri.matches(pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断是否为注销请求
     *
     * @param method  HTTP方法
     * @param request HTTP请求对象
     * @return true表示是注销请求
     */
    private boolean isLogoutRequest(String method, HttpServletRequest request) {
        return HttpUtil.RequestMethod.GET.name().equalsIgnoreCase(method) && LOGOUT_ACTION.equals(request
            .getParameter("action"));
    }

    /**
     * 检查会话是否已认证
     *
     * @param request HTTP请求对象
     * @return true表示已认证
     */
    private boolean isSessionAuthenticated(HttpServletRequest request) {
        final HttpSession session = request.getSession(false);
        return session != null && Boolean.TRUE.equals(session.getAttribute(AUTH_SESSION_KEY));
    }

    /**
     * 验证Basic认证信息
     *
     * @param authHeader Authorization头部值
     * @return true表示认证成功
     */
    private boolean validateBasicAuthentication(String authHeader) {
        try {
            // 解码Base64认证信息
            final String base64Credentials = authHeader.substring(BASIC_AUTH_PREFIX.length());
            final String credentials = new String(Base64.getDecoder()
                .decode(base64Credentials), StandardCharsets.UTF_8);

            // 提取密码（格式：username:password，这里只验证密码）
            final int colonIndex = credentials.indexOf(':');
            final String password = (colonIndex != -1) ? credentials.substring(colonIndex + 1) : credentials;

            // 验证密码
            return basicAuth.getPassword().equals(password);

        } catch (Exception e) {
            log.debug("Failed to validate basic authentication", e);
            return false;
        }
    }

    /**
     * 创建已认证的会话
     *
     * @param request HTTP请求对象
     */
    private void createAuthenticatedSession(HttpServletRequest request) {
        final HttpSession session = request.getSession(true);
        session.setAttribute(AUTH_SESSION_KEY, true);
        session.setMaxInactiveInterval(SESSION_TIMEOUT_SECONDS);
    }

    /**
     * 处理认证成功的响应
     *
     * @param request  HTTP请求对象
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    private void handleAuthenticationSuccess(HttpServletRequest request,
                                             HttpServletResponse response) throws IOException {
        if (isAjaxRequest(request)) {
            // AJAX请求返回JSON响应
            sendJsonResponse(response, HttpServletResponse.SC_OK, true, "认证成功");
        } else {
            // 浏览器请求重定向到原始URL，避免显示JSON内容
            final String redirectUrl = buildRedirectUrl(request);
            response.sendRedirect(redirectUrl);
        }
    }

    /**
     * 处理认证失败的响应
     *
     * @param request  HTTP请求对象
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    private void handleAuthenticationFailure(HttpServletRequest request,
                                             HttpServletResponse response) throws IOException {
        if (isAjaxRequest(request)) {
            // AJAX请求返回错误JSON
            sendJsonResponse(response, HttpServletResponse.SC_UNAUTHORIZED, false, "认证失败");
        } else {
            // 浏览器请求清除认证缓存
            clearBrowserAuthCache(response);
        }
    }

    /**
     * 处理注销请求
     *
     * @param request  HTTP请求对象
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    private void handleLogout(HttpServletRequest request, HttpServletResponse response) throws IOException {

        // 销毁会话
        final HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // 清除浏览器认证缓存
        clearBrowserAuthCache(response);

        // 重定向到登录页面
        response.sendRedirect(request.getRequestURI());
    }

    /**
     * 显示登录页面
     *
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    private void showLoginPage(HttpServletResponse response) throws IOException {
        // 设置响应头
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/html;charset=UTF-8");
        setNoCacheHeaders(response);

        // 输出登录页面HTML
        final String loginPageHtml = loadLoginPageFromResources();
        response.getWriter().write(loginPageHtml);
    }

    /**
     * 判断是否为AJAX请求
     *
     * <p>判断标准：</p>
     * <ul>
     * <li>包含X-Requested-With: XMLHttpRequest头</li>
     * <li>Accept头明确请求JSON且不包含HTML</li>
     * <li>疑似Fetch API请求（基于多个头部综合判断）</li>
     * </ul>
     *
     * @param request HTTP请求对象
     * @return true表示是AJAX请求
     */
    private boolean isAjaxRequest(HttpServletRequest request) {
        final String xRequestedWith = request.getHeader(AJAX_HEADER);
        final String accept = request.getHeader(HttpHeaders.ACCEPT);

        // 1. 标准AJAX请求标识
        if (AJAX_HEADER_VALUE.equals(xRequestedWith)) {
            return true;
        }

        // 2. 明确请求JSON格式
        if (accept != null && accept.contains(MediaType.APPLICATION_JSON_VALUE) && !accept
            .contains(MediaType.TEXT_HTML_VALUE)) {
            return true;
        }

        // 3. 检测Fetch API请求（更复杂的启发式判断）
        return isFetchApiRequest(request, accept);
    }

    /**
     * 检测是否为Fetch API请求
     *
     * @param request HTTP请求对象
     * @param accept  Accept头部值
     * @return true表示疑似Fetch API请求
     */
    private boolean isFetchApiRequest(HttpServletRequest request, String accept) {
        final String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        final String referer = request.getHeader(HttpHeaders.REFERER);

        // Fetch API通常使用 */* 作为Accept头，且有Referer
        return accept != null && accept.contains("*/*") && userAgent != null && userAgent
            .contains("Chrome") && referer != null && referer.contains(request.getServerName());
    }

    /**
     * 发送JSON格式响应
     * 使用工具类进行JSON字符串转义
     *
     * @param response   HTTP响应对象
     * @param statusCode HTTP状态码
     * @param success    是否成功
     * @param message    消息内容
     * @throws IOException IO异常
     */
    private void sendJsonResponse(HttpServletResponse response,
                                  int statusCode,
                                  boolean success,
                                  String message) throws IOException {
        response.setStatus(statusCode);
        response.setContentType(MediaType.APPLICATION_JSON_UTF8_VALUE);

        // 使用工具类进行JSON转义
        final String jsonResponse = """
            {
              "success": %s,
              "message": "%s"
            }
            """.formatted(success, Dockit4jResourceUtils.escapeJsonString(message));

        response.getWriter().write(jsonResponse);
    }

    /**
     * 构建重定向URL
     *
     * @param request HTTP请求对象
     * @return 重定向URL
     */
    private String buildRedirectUrl(HttpServletRequest request) {
        return request.getRequestURI() + "?t=" + System.currentTimeMillis();
    }

    /**
     * 清除浏览器认证缓存
     *
     * @param response HTTP响应对象
     */
    private void clearBrowserAuthCache(HttpServletResponse response) {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Basic realm=\"Dockit4j API Documentation\"");
        setNoCacheHeaders(response);
    }

    /**
     * 设置无缓存响应头
     *
     * @param response HTTP响应对象
     */
    private void setNoCacheHeaders(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
        response.setHeader(HttpHeaders.EXPIRES, "0");
    }

    /**
     * 获取客户端IP地址
     *
     * @param request HTTP请求对象
     * @return 客户端IP地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");

        if (clientIp == null || clientIp.isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
            clientIp = request.getHeader("X-Real-IP");
        }

        if (clientIp == null || clientIp.isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
            clientIp = request.getRemoteAddr();
        }

        // 处理多个IP的情况（取第一个）
        if (clientIp != null && clientIp.contains(",")) {
            clientIp = clientIp.split(",")[0].trim();
        }

        return clientIp != null ? clientIp : "unknown";
    }

    /**
     * 从resources目录加载登录页面HTML
     * <p>页面功能特性：</p>
     * <ul>
     * <li>AJAX提交表单</li>
     * <li>加载状态提示</li>
     * <li>错误消息显示</li>
     * </ul>
     *
     * @return 登录页面HTML内容
     */
    private String loadLoginPageFromResources() {
        try {
            // 使用工具类加载HTML模板
            String htmlTemplate = Dockit4jResourceUtils.readResourceContent(DOC_LOGIN, resourceLoader);
            if (htmlTemplate == null) {
                throw new RuntimeException("无法加载登录页面模板");
            }

            // 检查模板是否包含替换标记
            if (!isTemplateWithPlaceholders(htmlTemplate)) {
                return htmlTemplate;
            }

            // 模板包含替换标记，执行替换逻辑
            return processTemplateWithPlaceholders(htmlTemplate);

        } catch (Exception e) {
            throw new RuntimeException("加载登录页面资源失败: " + e.getMessage(), e);
        }
    }

    /**
     * 检查模板是否包含需要替换的占位符
     */
    private boolean isTemplateWithPlaceholders(String template) {
        // 检查是否包含任何一个占位符标记
        return template.contains("LOGO_SRC_PLACEHOLDER") || template.contains("LOGO_CLASS_PLACEHOLDER") || template
            .contains("TITLE_CLASS_PLACEHOLDER") || template.contains("TITLE_PLACEHOLDER") || template
                .contains("<!-- LOGO_PLACEHOLDER_START -->") || template
                    .contains("<!-- LOGO_PLACEHOLDER_END -->") || template.contains("${title}");
    }

    /**
     * 处理包含占位符的模板
     */
    private String processTemplateWithPlaceholders(String htmlTemplate) {
        // 初始化默认值
        String logo = "";
        String title = "Dockit4j - API文档认证";

        // 安全获取配置
        if (dockit4jExtension != null) {
            Dockit4jBrand brand = dockit4jExtension.getBrand();
            if (brand != null) {
                // 使用工具类获取logo
                logo = Dockit4jResourceUtils.resolveLogo(brand.getLogo(), resourceLoader);

                // 获取标题
                if (StrUtil.isNotBlank(brand.getTitle())) {
                    title = brand.getTitle();
                }
            }
        }

        // 如果brand中没有title,尝试从OpenAPI获取
        if (title.equals("Dockit4j - API文档认证") && openAPI != null && openAPI.getInfo() != null) {
            String apiTitle = openAPI.getInfo().getTitle();
            if (StrUtil.isNotBlank(apiTitle)) {
                title = apiTitle;
            }
        }

        // 处理Logo显示逻辑
        if (StrUtil.isNotBlank(logo)) {
            // 使用工具类确保logo格式正确
            logo = Dockit4jResourceUtils.ensureDataUrlFormat(logo);

            // 替换logo相关占位符
            htmlTemplate = replacePlaceholder(htmlTemplate, "LOGO_SRC_PLACEHOLDER", logo);
            htmlTemplate = replacePlaceholder(htmlTemplate, "LOGO_CLASS_PLACEHOLDER", StrUtil.isBlank(title)
                ? "logo-only"
                : "");
            htmlTemplate = replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "with-logo");
        } else {
            // 没有logo时,移除整个logo容器
            htmlTemplate = removeLogoContainer(htmlTemplate);
            htmlTemplate = replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "");
        }

        // 使用工具类进行HTML转义并替换标题
        htmlTemplate = replacePlaceholder(htmlTemplate, "TITLE_PLACEHOLDER", Dockit4jResourceUtils.escapeHtml(title));
        htmlTemplate = replacePlaceholder(htmlTemplate, "${title}", Dockit4jResourceUtils.escapeHtml(title));

        return htmlTemplate;
    }

    /**
     * 安全替换占位符，只有占位符存在时才替换
     */
    private String replacePlaceholder(String template, String placeholder, String value) {
        if (template.contains(placeholder)) {
            return template.replace(placeholder, value);
        }
        return template;
    }

    /**
     * 移除Logo容器标记
     */
    private String removeLogoContainer(String htmlTemplate) {
        // 检查是否存在Logo容器标记
        String startMarker = "<!-- LOGO_PLACEHOLDER_START -->";
        String endMarker = "<!-- LOGO_PLACEHOLDER_END -->";

        int startIndex = htmlTemplate.indexOf(startMarker);
        int endIndex = htmlTemplate.indexOf(endMarker);

        if (startIndex != -1 && endIndex != -1 && endIndex > startIndex) {
            // 移除整个logo容器，包括结束标记
            endIndex = endIndex + endMarker.length();
            return htmlTemplate.substring(0, startIndex) + htmlTemplate.substring(endIndex);
        }
        return htmlTemplate;
    }

}
