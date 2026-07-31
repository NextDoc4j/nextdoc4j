/*
 * Copyright (c) 2025-present echo. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of the NextDoc4j project.
 */
package top.nextdoc4j.security.satoken.excluder;

import cn.dev33.satoken.annotation.SaIgnore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 驱动真实 {@link NextDoc4JSaTokenExcluderNextDoc4j}：无映射软失败；有 {@link SaIgnore} 映射时收集路径。
 */
class NextDoc4JSaTokenExcluderNextDoc4jTest {

    @Test
    void missingHandlerMapping_returnsEmptySet() {
        ObjectProvider<RequestMappingHandlerMapping> empty = emptyProvider();
        NextDoc4JSaTokenExcluderNextDoc4j excluder = new NextDoc4JSaTokenExcluderNextDoc4j(empty);
        Set<String> paths = excluder.getExcludedPaths();
        assertNotNull(paths);
        assertTrue(paths.isEmpty());
    }

    @Test
    void nullProvider_returnsEmptySet() {
        NextDoc4JSaTokenExcluderNextDoc4j excluder = new NextDoc4JSaTokenExcluderNextDoc4j(null);
        assertTrue(excluder.getExcludedPaths().isEmpty());
    }

    @Test
    void withSaIgnoreMapping_collectsExcludedPaths() {
        try (AnnotationConfigWebApplicationContext context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(TestWebConfig.class);
            context.refresh();

            RequestMappingHandlerMapping mapping = context.getBean(RequestMappingHandlerMapping.class);
            assertNotNull(mapping);
            assertFalse(mapping.getHandlerMethods().isEmpty(), "handler methods must be registered");

            ObjectProvider<RequestMappingHandlerMapping> provider = new ObjectProvider<>() {
                @Override
                public RequestMappingHandlerMapping getObject() {
                    return mapping;
                }

                @Override
                public RequestMappingHandlerMapping getObject(Object... args) {
                    return mapping;
                }

                @Override
                public RequestMappingHandlerMapping getIfAvailable() {
                    return mapping;
                }

                @Override
                public RequestMappingHandlerMapping getIfUnique() {
                    return mapping;
                }

                @Override
                public Stream<RequestMappingHandlerMapping> stream() {
                    return Stream.of(mapping);
                }

                @Override
                public Stream<RequestMappingHandlerMapping> orderedStream() {
                    return Stream.of(mapping);
                }
            };

            NextDoc4JSaTokenExcluderNextDoc4j excluder = new NextDoc4JSaTokenExcluderNextDoc4j(provider);
            Set<String> paths = excluder.getExcludedPaths();

            assertNotNull(paths);
            assertFalse(paths.isEmpty(), "SaIgnore-annotated endpoint paths must be collected");
            assertTrue(paths.stream().anyMatch(p -> p.contains("ignored-login") || p.contains("/ignored-login")),
                "expected /ignored-login pattern in " + paths);
            assertTrue(paths.stream().noneMatch(p -> p.contains("secured")),
                "non-ignore endpoints must not be excluded: " + paths);
        }
    }

    @Test
    void multipleHandlerMappings_collectsExcludedPaths() {
        try (AnnotationConfigWebApplicationContext context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(TestWebConfig.class);
            context.refresh();

            RequestMappingHandlerMapping applicationMapping = context.getBean(RequestMappingHandlerMapping.class);
            RequestMappingHandlerMapping actuatorMapping = new RequestMappingHandlerMapping();
            ObjectProvider<RequestMappingHandlerMapping> provider = new ObjectProvider<>() {
                @Override
                public RequestMappingHandlerMapping getObject() {
                    return applicationMapping;
                }

                @Override
                public RequestMappingHandlerMapping getObject(Object... args) {
                    return applicationMapping;
                }

                @Override
                public RequestMappingHandlerMapping getIfAvailable() {
                    throw new AssertionError("multiple mappings must not use getIfAvailable()");
                }

                @Override
                public RequestMappingHandlerMapping getIfUnique() {
                    return null;
                }

                @Override
                public Stream<RequestMappingHandlerMapping> stream() {
                    return Stream.of(applicationMapping, actuatorMapping);
                }

                @Override
                public Stream<RequestMappingHandlerMapping> orderedStream() {
                    return Stream.of(applicationMapping, actuatorMapping);
                }
            };

            NextDoc4JSaTokenExcluderNextDoc4j excluder = new NextDoc4JSaTokenExcluderNextDoc4j(
                provider);
            Set<String> paths = excluder.getExcludedPaths();

            assertTrue(paths.stream().anyMatch(p -> p.contains("ignored-login") || p.contains("/ignored-login")),
                "expected /ignored-login pattern in " + paths);
            assertTrue(paths.stream().noneMatch(p -> p.contains("secured")),
                "non-ignore endpoints must not be excluded: " + paths);
        }
    }

    @Configuration
    @EnableWebMvc
    static class TestWebConfig {
        @Bean
        IgnoreController ignoreController() {
            return new IgnoreController();
        }

        @Bean
        SecuredController securedController() {
            return new SecuredController();
        }
    }

    @RestController
    static class IgnoreController {
        @SaIgnore
        @GetMapping("/ignored-login")
        public String login() {
            return "ok";
        }
    }

    @RestController
    static class SecuredController {
        @GetMapping("/secured/data")
        public String data() {
            return "secret";
        }
    }

    private static ObjectProvider<RequestMappingHandlerMapping> emptyProvider() {
        return new ObjectProvider<>() {
            @Override
            public RequestMappingHandlerMapping getObject() {
                return null;
            }

            @Override
            public RequestMappingHandlerMapping getObject(Object... args) {
                return null;
            }

            @Override
            public RequestMappingHandlerMapping getIfAvailable() {
                return null;
            }

            @Override
            public RequestMappingHandlerMapping getIfUnique() {
                return null;
            }

            @Override
            public Stream<RequestMappingHandlerMapping> stream() {
                return Stream.empty();
            }

            @Override
            public Stream<RequestMappingHandlerMapping> orderedStream() {
                return Stream.empty();
            }
        };
    }
}
