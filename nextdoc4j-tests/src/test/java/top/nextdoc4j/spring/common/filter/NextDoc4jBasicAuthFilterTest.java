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

import io.swagger.v3.oas.models.OpenAPI;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class NextDoc4jBasicAuthFilterTest {

    @Test
    void invalidBrowserBasicCredentialsReturnUnauthorized() throws Exception {
        NextDoc4jProperties properties = new NextDoc4jProperties();
        properties.getAuth().setEnabled(true);
        properties.getAuth().setPassword("expected");
        NextDoc4jBasicAuthFilter filter = new NextDoc4jBasicAuthFilter(
            properties,
            new DefaultResourceLoader(),
            new OpenAPI());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/doc.html");
        request.addHeader("Authorization", "Basic YWJjOm5vdC1leHBlY3RlZA==");
        request.addHeader("Accept", "text/html");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RecordingChain chain = new RecordingChain();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertEquals("Basic realm=\"NextDoc4j API Documentation\"",
            response.getHeader("WWW-Authenticate"));
        assertFalse(chain.invoked);
    }

    private static final class RecordingChain implements FilterChain {

        private boolean invoked;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
            invoked = true;
        }
    }
}
