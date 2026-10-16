package top.nextdoc4j.demo.springboot.configuration;

import org.springframework.stereotype.Component;
import top.nextdoc4j.security.core.enhancer.NextDoc4jPathExcluder;

import java.util.Set;

/**
 * 路径排除生成器
 *
 * @author echo
 * @date 2026/03/24
 */
@Component
public class PathExclusionBuilder implements NextDoc4jPathExcluder {


    @Override
    public Set<String> getExcludedPaths() {
        return Set.of("/api/auth/login");
    }
}
