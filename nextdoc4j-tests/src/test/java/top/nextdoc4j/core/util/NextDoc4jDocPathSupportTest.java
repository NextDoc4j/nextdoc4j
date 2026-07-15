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
package top.nextdoc4j.core.util;

import org.junit.jupiter.api.Test;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link NextDoc4jDocPathSupport}：启动校验会抛；热路径解析永不抛。
 */
class NextDoc4jDocPathSupportTest {

    @Test
    void blankConfig_resolvesToDefaultDocHtml() {
        assertEquals("/doc.html", NextDoc4jDocPathSupport.effectiveDocPath(null));
        assertEquals("/doc.html", NextDoc4jDocPathSupport.effectiveDocPath(""));
        assertEquals("/doc.html", NextDoc4jDocPathSupport.effectiveDocPath("   "));
        assertFalse(NextDoc4jDocPathSupport.isCustomDocPath(null));
        assertFalse(NextDoc4jDocPathSupport.isCustomDocPath(""));
        assertDoesNotThrow(() -> NextDoc4jDocPathSupport.validateConfiguredDocPath(null));
        assertDoesNotThrow(() -> NextDoc4jDocPathSupport.validateConfiguredDocPath(""));
    }

    @Test
    void customConfig_normalizesAndMarksCustom() {
        assertEquals("/internal-docs.html", NextDoc4jDocPathSupport.effectiveDocPath("internal-docs.html"));
        assertEquals("/internal-docs.html", NextDoc4jDocPathSupport.effectiveDocPath("/internal-docs.html/"));
        assertTrue(NextDoc4jDocPathSupport.isCustomDocPath("/internal-docs.html"));
        assertFalse(NextDoc4jDocPathSupport.isCustomDocPath("/doc.html"));
        assertDoesNotThrow(() -> NextDoc4jDocPathSupport.validateConfiguredDocPath("/internal-docs.html"));
    }

    @Test
    void multiSegment_validateThrows_hotPathFallsBackWithoutThrow() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> NextDoc4jDocPathSupport.validateConfiguredDocPath("api/console"));
        assertTrue(ex.getMessage().contains("nextdoc4j.doc-path"));
        assertTrue(ex.getMessage().contains("single-segment"));

        assertThrows(IllegalStateException.class,
            () -> NextDoc4jDocPathSupport.validateConfiguredDocPath("/api/console"));
        assertThrows(IllegalStateException.class,
            () -> NextDoc4jDocPathSupport.validateConfiguredDocPath("/a/b.html"));

        // 热路径：不抛，降级默认
        assertEquals(NextDoc4jDocPathSupport.DEFAULT_DOC_PATH,
            NextDoc4jDocPathSupport.effectiveDocPath("api/console"));
        assertEquals(NextDoc4jDocPathSupport.DEFAULT_DOC_PATH,
            NextDoc4jDocPathSupport.effectiveDocPath("/api/console"));
        assertFalse(NextDoc4jDocPathSupport.isCustomDocPath("/api/console"));
        assertDoesNotThrow(() -> NextDoc4jPathMatcherUtils.shouldBlock("/doc.html", "/api/console"));
        assertDoesNotThrow(() -> NextDoc4jDocPathSupport.blockedUrlPatterns("/api/console"));
        assertDoesNotThrow(() -> NextDoc4jDocPathSupport.protectedExactDocPaths("/api/console"));
    }

    @Test
    void matchesDefaultAndEffectivePaths_withContextPath() {
        assertTrue(NextDoc4jDocPathSupport.matchesDefaultDocPath("/doc.html"));
        assertTrue(NextDoc4jDocPathSupport.matchesDefaultDocPath("/app/doc.html"));
        assertFalse(NextDoc4jDocPathSupport.matchesDefaultDocPath("/internal-docs.html"));

        assertTrue(NextDoc4jDocPathSupport.matchesEffectiveDocPath("/internal-docs.html", "/internal-docs.html"));
        assertTrue(NextDoc4jDocPathSupport.matchesEffectiveDocPath("/app/internal-docs.html", "internal-docs.html"));
        assertFalse(NextDoc4jDocPathSupport.matchesEffectiveDocPath("/doc.html", "/internal-docs.html"));
    }

    @Test
    void shouldBlock_usesEffectiveEntryAndStillProtectsDefaultWhenCustom() {
        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/doc.html", null));
        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/app/doc.html", null));
        assertFalse(NextDoc4jPathMatcherUtils.shouldBlock("/internal-docs.html", null));

        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/internal-docs.html", "/internal-docs.html"));
        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/doc.html", "/internal-docs.html"));
        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/nextdoc/jse/a.js", "/internal-docs.html"));
        assertTrue(NextDoc4jPathMatcherUtils.shouldBlock("/v3/api-docs", "/internal-docs.html"));
    }

    @Test
    void isNextDoc4jResource_followsEffectivePath() {
        assertTrue(NextDoc4jPathMatcherUtils.isNextDoc4jResource("/doc.html", null));
        assertTrue(NextDoc4jPathMatcherUtils.isNextDoc4jResource("/nextdoc/x.js", null));
        assertFalse(NextDoc4jPathMatcherUtils.isNextDoc4jResource("/internal-docs.html", null));

        assertTrue(NextDoc4jPathMatcherUtils.isNextDoc4jResource("/internal-docs.html", "/internal-docs.html"));
        assertFalse(NextDoc4jPathMatcherUtils.isNextDoc4jResource("/doc.html", "/internal-docs.html"));
    }

    @Test
    void blockedUrlPatterns_includeEffectiveAndDefaultWhenCustom() {
        String[] defaultPatterns = NextDoc4jDocPathSupport.blockedUrlPatterns(null);
        assertTrue(Arrays.asList(defaultPatterns).contains("/doc.html"));
        assertTrue(Arrays.asList(NextDoc4jFilterConstant.BlockedPaths.URL_PATTERNS).contains("/doc.html"));

        String[] customPatterns = NextDoc4jDocPathSupport.blockedUrlPatterns("/secret.html");
        List<String> list = Arrays.asList(customPatterns);
        assertTrue(list.contains("/secret.html"));
        assertTrue(list.contains("/doc.html"));
        assertTrue(list.contains("/nextdoc/*"));
    }

    @Test
    void protectedExactDocPaths_listsDefaultAndCustom() {
        List<String> defaults = NextDoc4jDocPathSupport.protectedExactDocPaths(null);
        assertEquals(List.of("/doc.html"), defaults);

        List<String> custom = NextDoc4jDocPathSupport.protectedExactDocPaths("/x.html");
        assertEquals(List.of("/x.html", "/doc.html"), custom);
    }

    @Test
    void isSafeDocPath_rejectsTraversalAndMultiSegment() {
        assertTrue(NextDoc4jDocPathSupport.isSafeDocPath(null));
        assertTrue(NextDoc4jDocPathSupport.isSafeDocPath("/ok.html"));
        assertTrue(NextDoc4jDocPathSupport.isSafeDocPath("ok.html"));
        assertFalse(NextDoc4jDocPathSupport.isSafeDocPath("/../etc/passwd"));
        assertFalse(NextDoc4jDocPathSupport.isSafeDocPath("/"));
        assertFalse(NextDoc4jDocPathSupport.isSafeDocPath("/api/console"));
        assertFalse(NextDoc4jDocPathSupport.isSafeDocPath("api/console"));
    }
}
