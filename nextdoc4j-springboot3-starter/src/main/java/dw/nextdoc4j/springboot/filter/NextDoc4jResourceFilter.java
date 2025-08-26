package dw.nextdoc4j.springboot.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import dw.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.io.IOException;

/**
 * 资源过滤器
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jResourceFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        // 如果是 NextDoc4j 资源请求，且未启用 NextDoc4j，则返回 404
        if (uri.equals(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML) || uri
            .startsWith(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "NextDoc4j is disabled");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
