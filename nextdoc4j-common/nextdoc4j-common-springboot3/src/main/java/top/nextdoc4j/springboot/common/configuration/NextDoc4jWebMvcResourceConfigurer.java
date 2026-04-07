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
package top.nextdoc4j.springboot.common.configuration;

import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import top.nextdoc4j.core.constant.NextDoc4jFilterConstant;

import java.util.concurrent.TimeUnit;

/**
 * NextDoc4j WebMvc 资源映射配置。
 *
 * @author echo
 * @since 1.2.1
 */
public class NextDoc4jWebMvcResourceConfigurer implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_HTML)
            .addResourceLocations("classpath:/META-INF/resources/");

        registry.addResourceHandler(NextDoc4jFilterConstant.BlockedPaths.NEXT_DOC4J_PREFIX + "**")
            .addResourceLocations("classpath:/META-INF/resources/nextdoc/")
            .setCacheControl(CacheControl.maxAge(5, TimeUnit.HOURS).cachePublic());
    }
}
