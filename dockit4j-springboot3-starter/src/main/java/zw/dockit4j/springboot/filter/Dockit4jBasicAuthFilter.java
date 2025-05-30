package zw.dockit4j.springboot.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.filter.OncePerRequestFilter;
import zw.dockit4j.core.configuration.extension.Dockit4jBasicAuth;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 基础认证过滤器
 *
 * @author echo
 * @since 1.0.0
 */
public class Dockit4jBasicAuthFilter extends OncePerRequestFilter {

    private final Dockit4jBasicAuth basicAuth;

    /**
     * Session中存储认证状态的key
     */
    private static final String AUTH_SESSION_KEY = "dockit4j_authenticated";

    public Dockit4jBasicAuthFilter(Dockit4jBasicAuth basicAuth) {
        this.basicAuth = basicAuth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        // 检查是否为需要认证的路径
        if (!needAuth(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 处理注销请求（通过特殊参数）
        if ("GET".equals(method) && "logout".equals(request.getParameter("action"))) {
            handleLogout(request, response);
            return;
        }

        // 检查Session中是否已经认证过
        HttpSession session = request.getSession(false);
        if (session != null && Boolean.TRUE.equals(session.getAttribute(AUTH_SESSION_KEY))) {
            filterChain.doFilter(request, response);
            return;
        }

        // 检查Basic Auth头部
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Basic ")) {
            if (validateBasicAuth(authHeader)) {
                // 认证成功，在Session中标记
                HttpSession newSession = request.getSession(true);
                newSession.setAttribute(AUTH_SESSION_KEY, true);
                // 设置Session超时时间（30分钟）
                newSession.setMaxInactiveInterval(30 * 60);

                // 修复：更严格的AJAX判断，只有明确的AJAX请求才返回JSON
                if (isStrictAjaxRequest(request)) {
                    response.setContentType("application/json; charset=UTF-8");
                    response.getWriter().write("{\"success\": true, \"message\": \"认证成功\"}");
                } else {
                    // 浏览器请求认证成功后，重定向到原始请求，避免显示JSON
                    response.sendRedirect(request.getRequestURI());
                }
                return;
            } else {
                // 认证失败
                if (isStrictAjaxRequest(request)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json; charset=UTF-8");
                    response.getWriter().write("{\"success\": false, \"message\": \"密码错误\"}");
                    return;
                }
                // 浏览器认证失败，清除可能的缓存认证信息
                clearAuthCache(response);
            }
        }

        // 认证失败或无认证信息，返回登录页面
        requireAuthentication(response);
    }

    /**
     * 处理注销
     */
    private void handleLogout(HttpServletRequest request, HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate(); // 完全销毁session
        }

        // 清除浏览器缓存的认证信息
        clearAuthCache(response);

        // 重定向到认证页面
        response.sendRedirect(request.getRequestURI());
    }

    /**
     * 清除浏览器缓存的认证信息
     */
    private void clearAuthCache(HttpServletResponse response) {
        // 设置响应头来清除浏览器缓存的认证信息
        response.setHeader("WWW-Authenticate", "Basic realm=\"Dockit4j API Documentation\"");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
    }

    /**
     * 更严格的AJAX请求判断
     */
    private boolean isStrictAjaxRequest(HttpServletRequest request) {
        // 只有明确标识为AJAX的请求才返回JSON
        String xRequestedWith = request.getHeader("X-Requested-With");
        String accept = request.getHeader("Accept");

        // 1. 标准的AJAX请求头
        if ("XMLHttpRequest".equals(xRequestedWith)) {
            return true;
        }

        // 2. 明确请求JSON格式
        if (accept != null && accept.contains("application/json") && !accept.contains("text/html")) {
            return true;
        }

        // 3. Fetch API请求（通常不包含X-Requested-With）
        String userAgent = request.getHeader("User-Agent");
        if (accept != null && accept.contains("*/*") && userAgent != null && userAgent.contains("Chrome")) {
            // 进一步检查是否是fetch请求
            String referer = request.getHeader("Referer");
            return referer != null && referer.contains(request.getServerName());
        }

        return false;
    }

    /**
     * 判断是否需要认证的路径
     */
    private boolean needAuth(String uri) {
        // 精确匹配
        for (String exactPath : Dockit4jFilterConstant.BlockedPaths.EXACT_PATHS) {
            if (uri.equals(exactPath)) {
                return true;
            }
        }

        // 前缀匹配
        for (String prefix : Dockit4jFilterConstant.BlockedPaths.PREFIX_PATHS) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }

        // 正则匹配
        for (String pattern : Dockit4jFilterConstant.BlockedPaths.REGEX_PATTERNS) {
            if (uri.matches(pattern)) {
                return true;
            }
        }

        System.out.println("路径不需要认证: " + uri);
        return false;
    }

    /**
     * 验证Basic认证
     */
    private boolean validateBasicAuth(String authHeader) {
        try {
            // 解码Base64
            String base64Credentials = authHeader.substring("Basic ".length());
            String credentials = new String(Base64.getDecoder().decode(base64Credentials), StandardCharsets.UTF_8);

            // 只取冒号后的部分
            int index = credentials.indexOf(':');
            String password = (index != -1) ? credentials.substring(index + 1) : credentials;

            // 校验密码
            return basicAuth.getPassword().equals(password);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 要求客户端提供认证信息
     */
    private void requireAuthentication(HttpServletResponse response) throws IOException {
        // 不设置WWW-Authenticate头部，避免浏览器弹出原生认证框
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/html; charset=UTF-8");

        // 设置缓存控制头，确保每次都重新验证
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");

        // 返回认证页面
        String loginPage = generateLoginPage();
        response.getWriter().write(loginPage);
    }

    /**
     * 生成认证页面HTML
     */
    private String generateLoginPage() {
        return """
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>Dockit4j - 认证验证</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .login-container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 300px; }
                    h1 { margin-bottom: 1rem; font-size: 1.5rem; color: #333; }
                    .form-group { margin-bottom: 1rem; }
                    .form-group label { display: block; margin-bottom: 0.5rem; color: #555; }
                    .form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
                    .login-btn { width: 100%; padding: 0.5rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    .login-btn:hover { background: #45a049; }
                    .message { margin-top: 1rem; font-size: 0.9rem; display: none; }
                    .message.error { color: #e74c3c; }
                    .message.success { color: #27ae60; }
                    .logout-info { background: #3498db22; color: #3498db; margin-bottom: 1rem; padding: 0.5rem; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h1>Dockit4j</h1>
                    <p>需要输入密码访问API文档</p>

                    <div id="logoutInfo" class="logout-info" style="display: none;">您已安全退出，请重新认证</div>

                    <form id="loginForm">
                        <div class="form-group">
                            <label for="password">密码</label>
                            <input type="password" id="password" required>
                        </div>
                        <button type="submit" class="login-btn" id="loginBtn"><span id="btnText">访问文档</span></button>
                        <div id="message" class="message"></div>
                    </form>
                </div>

                <script>
                    if (window.location.search.includes('action=logout')) {
                        document.getElementById('logoutInfo').style.display = 'block';
                        history.replaceState({}, '', window.location.pathname);
                    }

                    document.getElementById('loginForm').addEventListener('submit', function(e) {
                        e.preventDefault();

                        const password = document.getElementById('password').value;
                        const loginBtn = document.getElementById('loginBtn');
                        const btnText = document.getElementById('btnText');
                        const messageEl = document.getElementById('message');

                        if (!password) {
                            showMessage('请输入密码', 'error');
                            return;
                        }

                        loginBtn.disabled = true;
                        btnText.textContent = '认证中...';
                        hideMessage();

                        const credentials = btoa(':' + password);  // 只用密码，用户名为空
                        fetch(window.location.href, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Basic ' + credentials,
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json'
                            }
                        }).then(response => {
                            if (response.ok) {
                                return response.json().then(data => {
                                    showMessage('验证成功，正在跳转...', 'success');
                                    setTimeout(() => {
                                        window.location.href = window.location.pathname + '?t=' + Date.now();
                                    }, 1000);
                                });
                            } else {
                                return response.json().then(data => {
                                    showMessage(data.message || '密码错误', 'error');
                                    resetButton();
                                });
                            }
                        }).catch(() => {
                            showMessage('验证失败，请稍后重试', 'error');
                            resetButton();
                        });

                        function resetButton() {
                            loginBtn.disabled = false;
                            btnText.textContent = '访问文档';
                        }

                        function showMessage(text, type) {
                            messageEl.textContent = text;
                            messageEl.className = 'message ' + type;
                            messageEl.style.display = 'block';
                        }

                        function hideMessage() {
                            messageEl.style.display = 'none';
                        }
                    });
                </script>
            </body>
            </html>
            """;
    }
}
