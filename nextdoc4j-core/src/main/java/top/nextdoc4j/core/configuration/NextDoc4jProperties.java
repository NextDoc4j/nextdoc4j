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
import top.nextdoc4j.core.configuration.extension.NextDoc4jBasicAuth;

import java.io.Serial;
import java.io.Serializable;

/**
 * 配置属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jProperties implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用
     */
    private boolean enabled = false;

    /**
     * 是否开启跨域
     */
    private boolean cors = false;

    /**
     * 是否生产环境
     */
    private boolean production = false;

    /**
     * 认证
     */
    @NestedConfigurationProperty
    private NextDoc4jBasicAuth auth;

    /**
     * 扩展属性
     */
    @NestedConfigurationProperty
    private NextDoc4jExtension extension;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isCors() {
        return cors;
    }

    public void setCors(boolean cors) {
        this.cors = cors;
    }

    public boolean isProduction() {
        return production;
    }

    public void setProduction(boolean production) {
        this.production = production;
    }

    public NextDoc4jBasicAuth getAuth() {
        return auth;
    }

    public void setAuth(NextDoc4jBasicAuth auth) {
        this.auth = auth;
    }

    public NextDoc4jExtension getExtension() {
        return extension;
    }

    public void setExtension(NextDoc4jExtension extension) {
        this.extension = extension;
    }
}
