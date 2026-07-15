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
package top.nextdoc4j.spring.common.filter;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link NextDoc4jDocPathFilter}：自定义 doc-path 时默认 /doc.html 必须 404。
 */
class NextDoc4jDocPathFilterTest {

    @Test
    void customPath_defaultDocHtmlReturns404() throws Exception {
        NextDoc4jProperties properties = new NextDoc4jProperties();
        properties.setDocPath("/internal-docs.html");
        NextDoc4jDocPathFilter filter = new NextDoc4jDocPathFilter(properties);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/doc.html");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();

        filter.doFilter(request, response, chain);

        assertEquals(404, response.getStatus());
        assertTrue(chain.invocations == 0);
    }

    @Test
    void customPath_effectiveEntryPassesThrough() throws Exception {
        NextDoc4jDocPathFilter filter = new NextDoc4jDocPathFilter("/internal-docs.html");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal-docs.html");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();

        filter.doFilter(request, response, chain);

        assertEquals(1, chain.invocations);
        assertEquals(200, response.getStatus());
    }

    @Test
    void defaultPath_noOpOnDocHtml() throws Exception {
        NextDoc4jDocPathFilter filter = new NextDoc4jDocPathFilter((String)null);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/doc.html");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();

        filter.doFilter(request, response, chain);

        assertEquals(1, chain.invocations);
    }

    private static final class RecordingChain implements FilterChain {
        int invocations;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
            invocations++;
        }
    }
}
