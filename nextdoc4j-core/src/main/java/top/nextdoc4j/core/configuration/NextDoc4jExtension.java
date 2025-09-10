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
package top.nextdoc4j.core.configuration;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.configuration.extension.NextDoc4jMarkdown;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 扩展属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jExtension implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用 默认为 false
     */
    private boolean enabled = false;

    /**
     * markdown 文档信息
     */
    private List<NextDoc4jMarkdown> markdown;

    /**
     * 品牌信息 - 定制 logo 和页脚信息
     */
    @NestedConfigurationProperty
    private NextDoc4jBrand brand;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<NextDoc4jMarkdown> getMarkdown() {
        return markdown;
    }

    public void setMarkdown(List<NextDoc4jMarkdown> markdown) {
        this.markdown = markdown;
    }

    public NextDoc4jBrand getBrand() {
        return brand;
    }

    public void setBrand(NextDoc4jBrand brand) {
        this.brand = brand;
    }
}
