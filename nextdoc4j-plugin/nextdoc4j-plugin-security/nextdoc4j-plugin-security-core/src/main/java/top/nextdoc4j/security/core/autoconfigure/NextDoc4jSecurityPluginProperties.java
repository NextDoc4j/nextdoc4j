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

import org.springframework.boot.context.properties.ConfigurationProperties;
import top.nextdoc4j.core.constant.NextDoc4jConstants;

/**
 * 安全插件配置属性
 *
 * @author echo
 * @since 1.1.3
 */
@ConfigurationProperties(prefix = NextDoc4jConstants.PLUGIN_SECURITY)
public class NextDoc4jSecurityPluginProperties {

    /**
     * 是否启用认证展示插件
     */
    private boolean enabled = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
