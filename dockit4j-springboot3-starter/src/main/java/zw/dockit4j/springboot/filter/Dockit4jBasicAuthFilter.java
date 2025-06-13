package zw.dockit4j.springboot.filter;

import ch.qos.logback.core.joran.spi.HttpUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import zw.dockit4j.core.configuration.extension.Dockit4jBasicAuth;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
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

    // ==================== 成员变量 ====================

    /**
     * 基本认证配置对象
     */
    private final Dockit4jBasicAuth basicAuth;

    // ==================== 构造方法 ====================

    /**
     * 构造函数
     *
     * @param basicAuth 基本认证配置对象，不能为null
     * @throws IllegalArgumentException 如果basicAuth为null
     */
    public Dockit4jBasicAuthFilter(Dockit4jBasicAuth basicAuth) {
        if (basicAuth == null) {
            throw new IllegalArgumentException("basicAuth配置不能为null");
        }

        this.basicAuth = basicAuth;

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
        final String loginPageHtml = generateLoginPageHtml();
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

        final String jsonResponse = """
            {
              "success": %s,
              "message": "%s"
            }
            """.formatted(success, escapeJsonString(message));

        response.getWriter().write(jsonResponse);
    }

    /**
     * 转义JSON字符串中的特殊字符
     *
     * @param str 原始字符串
     * @return 转义后的字符串
     */
    private String escapeJsonString(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
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

    // ==================== HTML页面生成 ====================

    /**
     * 生成登录页面HTML
     *
     * <p>页面功能特性：</p>
     * <ul>
     * <li>响应式设计，支持移动端</li>
     * <li>现代化UI风格</li>
     * <li>AJAX提交表单</li>
     * <li>加载状态提示</li>
     * <li>错误消息显示</li>
     * <li>注销状态提示</li>
     * </ul>
     *
     * @return 登录页面HTML字符串
     */
    private String generateLoginPageHtml() {
        return """
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dockit4j - API文档认证</title>
                <style>
                    /* 基础样式重置 */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    /* 页面主体样式 */
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                                     'Helvetica Neue', Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        color: #333;
                    }

                    /* 登录容器样式 */
                    .login-container {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        padding: 2.5rem;
                        border-radius: 16px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 400px;
                        margin: 1rem;
                        transition: transform 0.3s ease;
                    }

                    .login-container:hover {
                        transform: translateY(-2px);
                    }

                    /* 标题样式 */
                    .title {
                        text-align: center;
                        margin-bottom: 0.5rem;
                        font-size: 2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }

                    .subtitle {
                        text-align: center;
                        margin-bottom: 2rem;
                        color: #666;
                        font-size: 0.95rem;
                    }

                    /* 注销提示样式 */
                    .logout-info {
                        background: linear-gradient(135deg, #3498db22, #2980b922);
                        color: #2980b9;
                        margin-bottom: 1.5rem;
                        padding: 1rem;
                        border-radius: 8px;
                        border-left: 4px solid #3498db;
                        font-size: 0.9rem;
                        display: none;
                    }

                    /* 表单样式 */
                    .form-group {
                        margin-bottom: 1.5rem;
                    }

                    .form-group label {
                        display: block;
                        margin-bottom: 0.5rem;
                        font-weight: 600;
                        color: #555;
                    }

                    .form-group input {
                        width: 100%;
                        padding: 0.875rem;
                        border: 2px solid #e1e8ed;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                        background: #fff;
                    }

                    .form-group input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    }

                    /* 按钮样式 */
                    .login-btn {
                        width: 100%;
                        padding: 0.875rem;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .login-btn:hover:not(:disabled) {
                        transform: translateY(-1px);
                        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                    }

                    .login-btn:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none;
                    }

                    /* 消息提示样式 */
                    .message {
                        margin-top: 1rem;
                        padding: 0.75rem;
                        border-radius: 6px;
                        font-size: 0.9rem;
                        text-align: center;
                        display: none;
                        animation: slideIn 0.3s ease;
                    }

                    .message.error {
                        background: #fee;
                        color: #c53030;
                        border: 1px solid #feb2b2;
                    }

                    .message.success {
                        background: #f0fff4;
                        color: #2f855a;
                        border: 1px solid #9ae6b4;
                    }

                    /* 动画效果 */
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    /* 加载动画 */
                    .spinner {
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid #ffffff33;
                        border-radius: 50%;
                        border-top-color: #fff;
                        animation: spin 1s ease-in-out infinite;
                        margin-right: 0.5rem;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    /* 响应式设计 */
                    @media (max-width: 480px) {
                        .login-container {
                            padding: 2rem 1.5rem;
                            margin: 0.5rem;
                        }

                        .title {
                            font-size: 1.75rem;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h1 class="title">Dockit4j</h1>
                    <p class="subtitle">请输入密码以访问API文档</p>

                    <!-- 注销提示信息 -->
                    <div id="logoutInfo" class="logout-info">
                        <strong>安全提示：</strong> 您已安全退出，请重新进行身份认证
                    </div>

                    <!-- 登录表单 -->
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="password">访问密码</label>
                            <input type="password" id="password" placeholder="请输入密码" required
                                   autocomplete="current-password">
                        </div>
                        <button type="submit" class="login-btn" id="loginBtn">
                            <span id="btnText">访问文档</span>
                        </button>
                        <div id="message" class="message"></div>
                    </form>
                </div>

                <script>
                    // ==================== 页面初始化 ====================

                    /**
                     * 页面加载完成后的初始化操作
                     */
                    document.addEventListener('DOMContentLoaded', function() {
                        // 检查是否来自注销操作
                        if (window.location.search.includes('action=logout')) {
                            document.getElementById('logoutInfo').style.display = 'block';
                            // 清理URL中的logout参数，避免刷新时重复显示
                            history.replaceState({}, '', window.location.pathname);
                        }

                        // 自动聚焦到密码输入框
                        document.getElementById('password').focus();
                    });

                    // ==================== 表单提交处理 ====================

                    /**
                     * 处理登录表单提交
                     */
                    document.getElementById('loginForm').addEventListener('submit', function(e) {
                        e.preventDefault();

                        const password = document.getElementById('password').value.trim();
                        const loginBtn = document.getElementById('loginBtn');
                        const btnText = document.getElementById('btnText');
                        const messageEl = document.getElementById('message');

                        // 验证输入
                        if (!password) {
                            showMessage('请输入访问密码', 'error');
                            return;
                        }

                        // 设置加载状态
                        setLoadingState(true);
                        hideMessage();

                        // 构造认证信息（用户名为空，只使用密码）
                        const credentials = btoa(':' + password);

                        // 发送认证请求
                        fetch(window.location.href, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Basic ' + credentials,
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                                'Cache-Control': 'no-cache'
                            }
                        })
                        .then(response => {
                            if (response.ok) {
                                // 认证成功
                                return response.json().then(data => {
                                    showMessage('认证成功，正在跳转到文档页面...', 'success');
                                    // 延迟跳转，让用户看到成功提示
                                    setTimeout(() => {
                                        window.location.href = window.location.pathname + '?t=' + Date.now();
                                    }, 1200);
                                });
                            } else if (response.status === 401) {
                                // 认证失败
                                return response.json().then(data => {
                                    showMessage(data.message || '密码错误，请重新输入', 'error');
                                    // 清空密码输入框
                                    document.getElementById('password').value = '';
                                    document.getElementById('password').focus();
                                }).catch(() => {
                                    showMessage('密码错误，请重新输入', 'error');
                                    document.getElementById('password').value = '';
                                    document.getElementById('password').focus();
                                });
                            } else {
                                // 其他HTTP错误
                                showMessage('服务器响应异常，请稍后重试', 'error');
                            }
                        })
                        .catch(error => {
                            console.error('认证请求失败:', error);
                            showMessage('网络连接异常，请检查网络后重试', 'error');
                        })
                        .finally(() => {
                            // 恢复按钮状态
                            setLoadingState(false);
                        });
                    });

                    // ==================== 辅助函数 ====================

                    /**
                     * 设置按钮加载状态
                     * @param {boolean} loading 是否为加载状态
                     */
                    function setLoadingState(loading) {
                        const loginBtn = document.getElementById('loginBtn');
                        const btnText = document.getElementById('btnText');

                        if (loading) {
                            loginBtn.disabled = true;
                            btnText.innerHTML = '<span class="spinner"></span>认证中...';
                        } else {
                            loginBtn.disabled = false;
                            btnText.textContent = '访问文档';
                        }
                    }

                    /**
                     * 显示消息提示
                     * @param {string} text 消息内容
                     * @param {string} type 消息类型：'success' | 'error'
                     */
                    function showMessage(text, type) {
                        const messageEl = document.getElementById('message');
                        messageEl.textContent = text;
                        messageEl.className = 'message ' + type;
                        messageEl.style.display = 'block';

                        // 自动隐藏成功消息
                        if (type === 'success') {
                            setTimeout(() => {
                                hideMessage();
                            }, 3000);
                        }
                    }

                    /**
                     * 隐藏消息提示
                     */
                    function hideMessage() {
                        const messageEl = document.getElementById('message');
                        messageEl.style.display = 'none';
                    }

                    // ==================== 键盘事件处理 ====================

                    /**
                     * 处理键盘快捷键
                     */
                    document.addEventListener('keydown', function(e) {
                        // Ctrl/Cmd + Enter 提交表单
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
                        }

                        // ESC 清空输入和消息
                        if (e.key === 'Escape') {
                            document.getElementById('password').value = '';
                            hideMessage();
                            document.getElementById('password').focus();
                        }
                    });

                    // ==================== 页面可见性处理 ====================

                    /**
                     * 处理页面可见性变化（防止页面长时间后台运行）
                     */
                    document.addEventListener('visibilitychange', function() {
                        if (!document.hidden) {
                            // 页面重新可见时，聚焦到密码输入框
                            document.getElementById('password').focus();
                        }
                    });
                </script>
            </body>
            </html>
            """;
    }
}
