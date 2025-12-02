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
package top.nextdoc4j.enums.configuration;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import top.nextdoc4j.core.constant.NextDoc4jBaseConstant;
import top.nextdoc4j.enums.handler.BaseEnumParameterHandler;

/**
 * 枚举插件自动配置类
 * <p>
 * 当满足以下条件时自动启用:
 * 1. SpringDoc 相关类存在于 classpath
 * 2. 配置项 nextdoc4j.plugin.enums.enabled=true (默认为 true)
 * </p>
 *
 * @author echo
 * @since 2025/12/02
 */
@AutoConfiguration
@ConditionalOnClass(name = {"org.springdoc.core.customizers.ParameterCustomizer",
    "org.springdoc.core.customizers.PropertyCustomizer"})
@ConditionalOnProperty(prefix = NextDoc4jBaseConstant.PLUGIN_ENUM, name = NextDoc4jBaseConstant.ENABLED, havingValue = "true", matchIfMissing = true  // 默认启用
)
@EnableConfigurationProperties(EnumsPluginProperties.class)
public class EnumsPluginAutoConfiguration {

    /**
     * 注册枚举参数处理器
     * <p>
     * 该 Bean 会自动被 SpringDoc 扫描并应用到 API 文档生成过程中
     * </p>
     *
     * @param properties 插件配置属性
     * @return BaseEnumParameterHandler 实例
     */
    @Bean
    public BaseEnumParameterHandler baseEnumParameterHandler(EnumsPluginProperties properties) {
        return new BaseEnumParameterHandler(properties);
    }
}
