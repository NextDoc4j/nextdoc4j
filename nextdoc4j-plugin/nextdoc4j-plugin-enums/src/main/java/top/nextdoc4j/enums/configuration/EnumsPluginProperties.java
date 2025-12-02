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
import top.nextdoc4j.core.constant.NextDoc4jBaseConstant;

/**
 * 枚举插件属性
 *
 * @author echo
 * @since 2025/12/02
 */
@ConfigurationProperties(prefix = NextDoc4jBaseConstant.PLUGIN_ENUM)
public class EnumsPluginProperties {

    /**
     * 是否启用枚举插件 (默认: true)
     */
    private boolean enabled = true;

    /**
     * 枚举描述颜色 (默认: red)
     */
    private String descriptionColor = "red";

    /**
     * 是否显示枚举值 (默认: true)
     */
    private boolean showValues = true;

    /**
     * 是否显示枚举描述 (默认: true)
     */
    private boolean showDescription = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDescriptionColor() {
        return descriptionColor;
    }

    public void setDescriptionColor(String descriptionColor) {
        this.descriptionColor = descriptionColor;
    }

    public boolean isShowValues() {
        return showValues;
    }

    public void setShowValues(boolean showValues) {
        this.showValues = showValues;
    }

    public boolean isShowDescription() {
        return showDescription;
    }

    public void setShowDescription(boolean showDescription) {
        this.showDescription = showDescription;
    }
}
