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
package top.nextdoc4j.security.core.autoconfigure;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import top.nextdoc4j.core.constant.NextDoc4jConstants;
import top.nextdoc4j.security.core.customizer.NextDoc4jSecurityCustomizer;
import top.nextdoc4j.security.core.enhancer.PathExcluder;

import java.util.List;

/**
 * 安全插件自动配置
 *
 * @author echo
 * @since 1.1.3
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = NextDoc4jConstants.PLUGIN_SECURITY, name = NextDoc4jConstants.ENABLED, havingValue = "true")
@EnableConfigurationProperties({NextDoc4jSecurityProperties.class, NextDoc4jSpringDocProperties.class})
public class NextDoc4jSecurityAutoConfiguration {

    @Bean
    public NextDoc4jSecurityCustomizer securityPluginGlobalOpenApiCustomizer(NextDoc4jSpringDocProperties extensionProperties,
                                                                             List<PathExcluder> pathExcluders) {
        return new NextDoc4jSecurityCustomizer(extensionProperties, pathExcluders);
    }
}
