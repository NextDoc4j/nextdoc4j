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
package top.nextdoc4j.springboot.configuration.properties;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import top.nextdoc4j.core.configuration.NextDoc4jExtension;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBasicAuth;
import top.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import top.nextdoc4j.core.configuration.extension.NextDoc4jMarkdown;

import java.util.ArrayList;
import java.util.List;

/**
 * metadata 桥接类：仅用于配置元数据展开，不改变 core 模型中立性。
 *
 * @author echo
 * @since 1.2.0
 */
public class NextDoc4jPropertiesMetadata extends NextDoc4jProperties {

    @NestedConfigurationProperty
    private NextDoc4jExtensionMetadata extension = new NextDoc4jExtensionMetadata();

    public NextDoc4jPropertiesMetadata() {
        if (getAuth() == null) {
            setAuth(new NextDoc4jBasicAuth());
        }
        super.setExtension(extension);
    }

    @Override
    @NestedConfigurationProperty
    public NextDoc4jBasicAuth getAuth() {
        return super.getAuth();
    }

    @Override
    @NestedConfigurationProperty
    public NextDoc4jExtensionMetadata getExtension() {
        return extension;
    }

    @Override
    public void setExtension(NextDoc4jExtension extension) {
        if (extension instanceof NextDoc4jExtensionMetadata metadata) {
            this.extension = metadata;
        }
        else {
            this.extension = copyExtension(extension);
        }
        super.setExtension(this.extension);
    }

    public void setExtension(NextDoc4jExtensionMetadata extension) {
        this.extension = extension == null ? new NextDoc4jExtensionMetadata() : extension;
        super.setExtension(this.extension);
    }

    private NextDoc4jExtensionMetadata copyExtension(NextDoc4jExtension extension) {
        NextDoc4jExtensionMetadata metadata = new NextDoc4jExtensionMetadata();
        if (extension != null) {
            metadata.setEnabled(extension.isEnabled());
            metadata.setBrand(extension.getBrand());
            metadata.setMarkdown(extension.getMarkdown());
        }
        return metadata;
    }

    /**
     * 扩展配置 metadata 桥接类。
     */
    public static class NextDoc4jExtensionMetadata extends NextDoc4jExtension {

        public NextDoc4jExtensionMetadata() {
            if (getBrand() == null) {
                setBrand(new NextDoc4jBrand());
            }
            if (getMarkdown() == null) {
                setMarkdown(new ArrayList<>());
            }
        }

        @Override
        @NestedConfigurationProperty
        public NextDoc4jBrand getBrand() {
            return super.getBrand();
        }

        @Override
        public List<NextDoc4jMarkdown> getMarkdown() {
            return super.getMarkdown();
        }
    }
}
