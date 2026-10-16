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
package top.nextdoc4j.springboot.configuration;

import org.springframework.beans.factory.InitializingBean;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.util.NextDoc4jDocPathSupport;

/**
 * 启动期 fail-fast：校验 {@code nextdoc4j.doc-path} 为单段安全路径。
 * <p>
 * 非法配置在应用就绪前抛出，避免自定义多段路径导致 UI 白屏且无提示。
 *
 * @author echo
 * @since 1.4.0
 */
public class NextDoc4jDocPathValidator implements InitializingBean {

    private final NextDoc4jProperties properties;

    public NextDoc4jDocPathValidator(NextDoc4jProperties properties) {
        this.properties = properties;
    }

    @Override
    public void afterPropertiesSet() {
        if (properties == null) {
            return;
        }
        NextDoc4jDocPathSupport.validateConfiguredDocPath(properties.getDocPath());
    }
}
