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

                // 如果是AJAX请求，返回JSON响应
                if (isAjaxRequest(request)) {
                    response.setContentType("application/json; charset=UTF-8");
                    response.getWriter().write("{\"success\": true, \"message\": \"认证成功\"}");
                    return;
                }

                filterChain.doFilter(request, response);
                return;
            } else {
                // 认证失败
                if (isAjaxRequest(request)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json; charset=UTF-8");
                    response.getWriter().write("{\"success\": false, \"message\": \"用户名或密码错误\"}");
                    return;
                }
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
            session.removeAttribute(AUTH_SESSION_KEY);
        }

        // 重定向到登录页面
        response.sendRedirect(request.getRequestURI());
    }

    /**
     * 判断是否为AJAX请求
     */
    private boolean isAjaxRequest(HttpServletRequest request) {
        return "XMLHttpRequest".equals(request.getHeader("X-Requested-With")) || "application/json".equals(request
            .getHeader("Accept")) || request.getHeader("Authorization") != null;
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

            // 分割用户名和密码
            String[] parts = credentials.split(":", 2);
            if (parts.length != 2) {
                return false;
            }

            String username = parts[0];
            String password = parts[1];

            // 验证用户名和密码
            return basicAuth.getUsername().equals(username) && basicAuth.getPassword().equals(password);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 要求客户端提供认证信息
     */
    private void requireAuthentication(HttpServletResponse response) throws IOException {
        response.setHeader("WWW-Authenticate", "Basic realm=\"Dockit4j API Documentation\"");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("text/html; charset=UTF-8");

        // 返回登录页面
        String loginPage = generateLoginPage();
        response.getWriter().write(loginPage);
    }

    /**
     * 生成登录页面HTML
     */
    private String generateLoginPage() {
        return """
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dockit4j - 登录验证</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }

                    .login-container {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        padding: 2.5rem;
                        border-radius: 16px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 420px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .login-header {
                        text-align: center;
                        margin-bottom: 2rem;
                    }

                    .login-header h1 {
                        color: #333;
                        font-size: 2rem;
                        font-weight: 700;
                        margin-bottom: 0.5rem;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }

                    .login-header p {
                        color: #666;
                        font-size: 0.95rem;
                    }

                    .form-group {
                        margin-bottom: 1.5rem;
                    }

                    .form-group label {
                        display: block;
                        margin-bottom: 0.5rem;
                        color: #555;
                        font-weight: 500;
                        font-size: 0.9rem;
                    }

                    .form-group input {
                        width: 100%;
                        padding: 0.875rem 1rem;
                        border: 2px solid #e1e5e9;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: all 0.2s ease;
                        background: rgba(255, 255, 255, 0.8);
                    }

                    .form-group input:focus {
                        outline: none;
                        border-color: #667eea;
                        background: rgba(255, 255, 255, 1);
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    }

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
                        transition: all 0.2s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .login-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    }

                    .login-btn:active {
                        transform: translateY(0);
                    }

                    .login-btn:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .message {
                        text-align: center;
                        margin-top: 1rem;
                        padding: 0.75rem;
                        border-radius: 6px;
                        font-size: 0.9rem;
                        display: none;
                    }

                    .message.error {
                        background: rgba(231, 76, 60, 0.1);
                        color: #e74c3c;
                        border: 1px solid rgba(231, 76, 60, 0.2);
                    }

                    .message.success {
                        background: rgba(46, 204, 113, 0.1);
                        color: #27ae60;
                        border: 1px solid rgba(46, 204, 113, 0.2);
                    }

                    .loading {
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top-color: #fff;
                        animation: spin 0.8s ease-in-out infinite;
                        margin-right: 8px;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .logout-info {
                        background: rgba(52, 152, 219, 0.1);
                        color: #3498db;
                        border: 1px solid rgba(52, 152, 219, 0.2);
                        margin-bottom: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <div class="login-header">
                        <h1>Dockit4j</h1>
                        <p>请输入用户名和密码访问API文档</p>
                    </div>

                    <div id="logoutInfo" class="message logout-info" style="display: none;">
                        您已安全退出，请重新登录
                    </div>

                    <form id="loginForm">
                        <div class="form-group">
                            <label for="username">用户名</label>
                            <input type="text" id="username" name="username" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="password">密码</label>
                            <input type="password" id="password" name="password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="login-btn" id="loginBtn">
                            <span id="btnText">登录</span>
                        </button>
                        <div id="message" class="message"></div>
                    </form>
                </div>

                <script>
                    // 检查是否是注销操作
                    if (window.location.search.includes('action=logout')) {
                        document.getElementById('logoutInfo').style.display = 'block';
                        // 清理URL中的logout参数
                        history.replaceState({}, '', window.location.pathname);
                    }

                    document.getElementById('loginForm').addEventListener('submit', function(e) {
                        e.preventDefault();

                        const username = document.getElementById('username').value.trim();
                        const password = document.getElementById('password').value;
                        const loginBtn = document.getElementById('loginBtn');
                        const btnText = document.getElementById('btnText');
                        const messageEl = document.getElementById('message');

                        if (!username || !password) {
                            showMessage('请输入用户名和密码', 'error');
                            return;
                        }

                        // 显示加载状态
                        loginBtn.disabled = true;
                        btnText.innerHTML = '<span class="loading"></span>登录中...';
                        hideMessage();

                        // 创建Basic Auth头部
                        const credentials = btoa(unescape(encodeURIComponent(username + ':' + password)));

                        // 发起认证请求
                        fetch(window.location.href, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Basic ' + credentials,
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        }).then(response => {
                            if (response.ok) {
                                // 认证成功
                                showMessage('登录成功，正在跳转...', 'success');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                // 认证失败
                                showMessage('用户名或密码错误，请重试', 'error');
                                resetButton();
                            }
                        }).catch(error => {
                            console.error('Login error:', error);
                            showMessage('登录失败，请稍后重试', 'error');
                            resetButton();
                        });

                        function resetButton() {
                            loginBtn.disabled = false;
                            btnText.textContent = '登录';
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

                    // 自动聚焦到用户名输入框
                    document.getElementById('username').focus();
                </script>
            </body>
            </html>
            """;
    }
}
