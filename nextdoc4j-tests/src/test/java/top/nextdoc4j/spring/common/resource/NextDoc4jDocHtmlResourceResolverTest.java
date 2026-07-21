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
package top.nextdoc4j.spring.common.resource;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.resource.ResourceResolverChain;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 驱动真实 {@link NextDoc4jDocHtmlResourceResolver}：任意 requestPath 均落到物理 doc.html。
 */
class NextDoc4jDocHtmlResourceResolverTest {

    @Test
    void resolveResource_alwaysReturnsPhysicalDocHtml() {
        NextDoc4jDocHtmlResourceResolver resolver = new NextDoc4jDocHtmlResourceResolver();
        List<Resource> locations = List.of(new ClassPathResource("META-INF/resources/"));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/secret.html");
        ResourceResolverChain chain = new ResourceResolverChain() {
            @Override
            public Resource resolveResource(HttpServletRequest req, String requestPath, List<? extends Resource> locs) {
                return null;
            }

            @Override
            public String resolveUrlPath(String resourcePath, List<? extends Resource> locs) {
                return null;
            }
        };

        Resource resolved = resolver.resolveResource(request, "secret.html", locations, chain);

        assertNotNull(resolved);
        assertTrue(resolved.exists());
        assertTrue(resolved.getDescription().contains(NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML)
            || NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML.equals(resolved.getFilename()));
        assertEquals(NextDoc4jDocPathSupport.PHYSICAL_DOC_HTML, resolver.resolveUrlPath("anything", locations, chain));
    }
}
