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

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * enabled=false / production 场景：自定义 doc-path 与默认 /doc.html 均须被拦截。
 * <p>
 * 直接驱动已交付的 {@link NextDoc4jResourceFilter} / {@link NextDoc4jProductionFilter}。
 */
class NextDoc4jDisabledAndProductionDocPathFilterTest {

    private static final String CUSTOM = "/internal-docs.html";

    @Test
    void resourceFilter_withCustomDocPath_blocksCustomAndDefault() throws Exception {
        // simulates nextdoc4j.enabled=false with nextdoc4j.doc-path=/internal-docs.html
        NextDoc4jResourceFilter filter = new NextDoc4jResourceFilter(CUSTOM);

        assertBlocked(filter, CUSTOM);
        assertBlocked(filter, "/doc.html");
        assertBlocked(filter, "/app" + CUSTOM);
        assertBlocked(filter, "/nextdoc/jse/x.js");
        assertBlocked(filter, "/v3/api-docs");
        assertPassed(filter, "/api/business");
    }

    @Test
    void productionFilter_withCustomDocPath_blocksCustomAndDefault() throws Exception {
        NextDoc4jProductionFilter filter = new NextDoc4jProductionFilter(CUSTOM);

        assertBlocked(filter, CUSTOM);
        assertBlocked(filter, "/doc.html");
        assertPassed(filter, "/health");
    }

    @Test
    void resourceFilter_withoutDocPath_stillBlocksDefaultOnlyForDocEntry() throws Exception {
        NextDoc4jResourceFilter filter = new NextDoc4jResourceFilter((String)null);
        assertBlocked(filter, "/doc.html");
        // custom path is not an entry when unset — should not be treated as UI entry by shouldBlock
        assertPassed(filter, CUSTOM);
    }

    private static void assertBlocked(jakarta.servlet.Filter filter, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();
        filter.doFilter(request, response, chain);
        assertEquals(404, response.getStatus(), "expected block for " + uri);
        assertEquals(0, chain.invocations, "chain must not continue for " + uri);
    }

    private static void assertPassed(jakarta.servlet.Filter filter, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();
        filter.doFilter(request, response, chain);
        assertEquals(1, chain.invocations, "chain must continue for " + uri);
    }

    private static final class RecordingChain implements FilterChain {
        int invocations;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
            invocations++;
        }
    }
}
