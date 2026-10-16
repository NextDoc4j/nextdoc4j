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
import org.springframework.core.io.ResourceLoader;
import org.springframework.util.StringUtils;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.util.NextDoc4jBasicAuthUtils;

/**
 * BasicAuth 登录页 HTML 加载与占位符渲染（Servlet / WebFlux 共用）。
 * <p>
 * 不依赖 Servlet 或 Reactive API，仅使用 ResourceLoader + 配置模型。
 *
 * @author echo
 * @since 1.4.0
 */
public final class NextDoc4jLoginPageTemplate {

    private NextDoc4jLoginPageTemplate() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    /**
     * 从 classpath 资源加载登录页；若模板含占位符则按品牌 / OpenAPI 信息渲染。
     *
     * @param resourceLocation 模板资源路径（如 {@code classpath:/META-INF/resources/doclogin.html}）
     * @param resourceLoader   Spring 资源加载器
     * @param extension        nextdoc4j 扩展配置，可为 {@code null}
     * @param openAPI          OpenAPI 文档对象，可为 {@code null}（用于标题回退）
     * @return 最终登录页 HTML
     * @throws RuntimeException 资源读取失败或模板为空
     */
    public static String loadLoginPage(String resourceLocation,
                                       ResourceLoader resourceLoader,
                                       NextDoc4jExtension extension,
                                       OpenAPI openAPI) {
        try {
            String htmlTemplate = NextDoc4jResourceUtils.readResourceContent(resourceLocation, resourceLoader);
            if (htmlTemplate == null) {
                throw new RuntimeException("无法加载登录页面模板");
            }
            if (!NextDoc4jBasicAuthUtils.isTemplateWithPlaceholders(htmlTemplate)) {
                return htmlTemplate;
            }
            return processTemplateWithPlaceholders(htmlTemplate, extension, openAPI, resourceLoader);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception e) {
            throw new RuntimeException("加载登录页面资源失败: " + e.getMessage(), e);
        }
    }

    /**
     * 对已加载的登录页模板做品牌 / 标题 / Logo 占位符替换。
     *
     * @param htmlTemplate   原始 HTML 模板
     * @param extension      扩展配置（品牌 logo/title），可为 {@code null}
     * @param openAPI        OpenAPI（标题回退），可为 {@code null}
     * @param resourceLoader 用于解析品牌 logo 路径，可为 {@code null}（则跳过 logo 文件解析）
     * @return 替换后的 HTML
     */
    public static String processTemplateWithPlaceholders(String htmlTemplate,
                                                         NextDoc4jExtension extension,
                                                         OpenAPI openAPI,
                                                         ResourceLoader resourceLoader) {
        String logo = "";
        String title = NextDoc4jBasicAuthUtils.DEFAULT_LOGIN_TITLE;

        if (extension != null && extension.isEnabled()) {
            NextDoc4jBrand brand = extension.getBrand();
            if (brand != null) {
                String resolved = NextDoc4jResourceUtils.resolveLogo(brand.getLogo(), resourceLoader);
                if (resolved != null) {
                    logo = resolved;
                }
                if (StringUtils.hasText(brand.getTitle())) {
                    title = brand.getTitle();
                }
            }
        }

        if (NextDoc4jBasicAuthUtils.DEFAULT_LOGIN_TITLE.equals(title) && openAPI != null && openAPI.getInfo() != null) {
            String apiTitle = openAPI.getInfo().getTitle();
            if (StringUtils.hasText(apiTitle)) {
                title = apiTitle;
            }
        }

        if (StringUtils.hasText(logo)) {
            logo = NextDoc4jResourceUtils.ensureDataUrlFormat(logo);
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "LOGO_SRC_PLACEHOLDER", logo);
            htmlTemplate = NextDoc4jBasicAuthUtils
                .replacePlaceholder(htmlTemplate, "LOGO_CLASS_PLACEHOLDER", StringUtils.hasText(title)
                    ? ""
                    : "logo-only");
            htmlTemplate = NextDoc4jBasicAuthUtils
                .replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "with-logo");
        } else {
            htmlTemplate = NextDoc4jBasicAuthUtils.removeLogoContainer(htmlTemplate);
            htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "TITLE_CLASS_PLACEHOLDER", "");
        }

        String escapedTitle = NextDoc4jResourceUtils.escapeHtml(title);
        htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "TITLE_PLACEHOLDER", escapedTitle);
        htmlTemplate = NextDoc4jBasicAuthUtils.replacePlaceholder(htmlTemplate, "${title}", escapedTitle);
        return htmlTemplate;
    }
}
