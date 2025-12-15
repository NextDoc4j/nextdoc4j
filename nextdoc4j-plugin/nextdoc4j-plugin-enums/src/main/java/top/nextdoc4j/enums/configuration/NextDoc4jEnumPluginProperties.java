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

import org.springframework.boot.context.properties.ConfigurationProperties;
import top.nextdoc4j.core.constant.NextDoc4jConstants;

/**
 * 枚举插件属性
 *
 * @author echo
 * @since 1.1.2
 */
@ConfigurationProperties(prefix = NextDoc4jConstants.PLUGIN_ENUM)
public class NextDoc4jEnumPluginProperties {

    /**
     * 是否启用枚举插件
     */
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
