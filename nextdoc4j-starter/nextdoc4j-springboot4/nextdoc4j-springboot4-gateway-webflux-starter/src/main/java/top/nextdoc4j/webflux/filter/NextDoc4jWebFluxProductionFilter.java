package top.nextdoc4j.webflux.filter;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import top.nextdoc4j.core.util.NextDoc4jPathMatcherUtils;

/**
 * 当 nextdoc4j.production=true 时拦截文档相关资源。
 */
public class NextDoc4jWebFluxProductionFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (NextDoc4jPathMatcherUtils.shouldBlock(path)) {
            exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }
}
