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
package top.nextdoc4j.spring.common.core.util;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.util.NextDoc4jBasicAuthUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 验证登录页模板共用渲染路径（Servlet / WebFlux 过滤器均委托至此）。
 */
class NextDoc4jLoginPageTemplateTest {

    private static final String PLACEHOLDER_TEMPLATE = """
        <!-- LOGO_PLACEHOLDER_START -->
        <img src="LOGO_SRC_PLACEHOLDER" class="LOGO_CLASS_PLACEHOLDER"/>
        <!-- LOGO_PLACEHOLDER_END -->
        <h1 class="TITLE_CLASS_PLACEHOLDER">TITLE_PLACEHOLDER</h1>
        <title>${title}</title>
        """;

    @Test
    void processTemplate_withoutLogo_usesBrandTitleAndRemovesLogoContainer() {
        NextDoc4jExtension extension = new NextDoc4jExtension();
        extension.setEnabled(true);
        NextDoc4jBrand brand = new NextDoc4jBrand();
        brand.setTitle("My Brand <Docs>");
        extension.setBrand(brand);

        String html = NextDoc4jLoginPageTemplate
            .processTemplateWithPlaceholders(PLACEHOLDER_TEMPLATE, extension, null, null);

        assertFalse(html.contains("LOGO_PLACEHOLDER_START"));
        assertFalse(html.contains("LOGO_SRC_PLACEHOLDER"));
        assertTrue(html.contains("My Brand &lt;Docs&gt;"));
        assertFalse(html.contains("TITLE_PLACEHOLDER"));
        assertFalse(html.contains("${title}"));
    }

    @Test
    void processTemplate_fallsBackToOpenApiTitleWhenBrandTitleEmpty() {
        NextDoc4jExtension extension = new NextDoc4jExtension();
        extension.setEnabled(true);
        extension.setBrand(new NextDoc4jBrand());

        OpenAPI openAPI = new OpenAPI().info(new Info().title("OpenAPI Title"));

        String html = NextDoc4jLoginPageTemplate
            .processTemplateWithPlaceholders(PLACEHOLDER_TEMPLATE, extension, openAPI, null);

        assertTrue(html.contains("OpenAPI Title"));
        assertFalse(html.contains(NextDoc4jBasicAuthUtils.DEFAULT_LOGIN_TITLE));
    }

    @Test
    void processTemplate_withLogo_setsWithLogoClassAndSrc() {
        String location = "classpath:test-logo.png";
        byte[] pngish = new byte[] {(byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        ResourceLoader loader = new ResourceLoader() {
            @Override
            public Resource getResource(String locationArg) {
                if (location.equals(locationArg)) {
                    return new ByteArrayResource(pngish) {
                        @Override
                        public String getFilename() {
                            return "test-logo.png";
                        }

                        @Override
                        public boolean exists() {
                            return true;
                        }
                    };
                }
                return missingResource();
            }

            @Override
            public ClassLoader getClassLoader() {
                return NextDoc4jLoginPageTemplateTest.class.getClassLoader();
            }
        };

        NextDoc4jExtension extension = new NextDoc4jExtension();
        extension.setEnabled(true);
        NextDoc4jBrand brand = new NextDoc4jBrand();
        brand.setLogo(location);
        brand.setTitle("Logo Title");
        extension.setBrand(brand);

        String html = NextDoc4jLoginPageTemplate
            .processTemplateWithPlaceholders(PLACEHOLDER_TEMPLATE, extension, null, loader);

        assertFalse(html.contains("LOGO_SRC_PLACEHOLDER"));
        assertTrue(html.contains("data:image"));
        assertTrue(html.contains("with-logo"));
        assertTrue(html.contains("Logo Title"));
        assertFalse(html.contains("LOGO_PLACEHOLDER_START") && !html.contains("data:image"));
    }

    @Test
    void loadLoginPage_withoutPlaceholders_returnsRawTemplate() {
        String plain = "<html><body>plain-login</body></html>";
        String location = "classpath:plain-login.html";
        ResourceLoader loader = fixedResourceLoader(location, textResource(plain));

        String html = NextDoc4jLoginPageTemplate.loadLoginPage(location, loader, null, null);
        assertEquals(plain, html);
    }

    @Test
    void loadLoginPage_missingTemplate_throws() {
        ResourceLoader loader = fixedResourceLoader("classpath:other.html", missingResource());
        assertThrows(RuntimeException.class, () -> NextDoc4jLoginPageTemplate
            .loadLoginPage("classpath:missing.html", loader, null, null));
    }

    private static ResourceLoader fixedResourceLoader(String expectedLocation, Resource resource) {
        return new ResourceLoader() {
            @Override
            public Resource getResource(String locationArg) {
                if (expectedLocation.equals(locationArg)) {
                    return resource;
                }
                return missingResource();
            }

            @Override
            public ClassLoader getClassLoader() {
                return NextDoc4jLoginPageTemplateTest.class.getClassLoader();
            }
        };
    }

    private static Resource textResource(String content) {
        return new ByteArrayResource(content.getBytes(StandardCharsets.UTF_8)) {
            @Override
            public boolean exists() {
                return true;
            }

            @Override
            public String getFilename() {
                return "doclogin.html";
            }
        };
    }

    private static Resource missingResource() {
        return new ByteArrayResource(new byte[0]) {
            @Override
            public boolean exists() {
                return false;
            }
        };
    }
}
