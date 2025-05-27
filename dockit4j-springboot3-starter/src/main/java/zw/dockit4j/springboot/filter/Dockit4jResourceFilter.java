package zw.dockit4j.springboot.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import zw.dockit4j.core.constant.Dockit4jFilterConstant;

import java.io.IOException;

/**
 * 资源过滤器
 *
 * @author echo
 * @since 1.0.0
 */
public class Dockit4jResourceFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        // 如果是 dockit4j 资源请求，且未启用 dockit4j，则返回 404
        if (uri.equals(Dockit4jFilterConstant.BlockedPaths.DOCKIT_HTML) || uri
            .startsWith(Dockit4jFilterConstant.BlockedPaths.DOCKIT4J_PREFIX)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Dockit4j is disabled");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
