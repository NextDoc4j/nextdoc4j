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
package top.nextdoc4j.plugin.gateway.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * 手动配置的服务信息
 *
 * @author echo
 * @since 1.2.0
 */
public class ServiceConfig implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 服务名称（显示名称）
     */
    private String name;

    /**
     * 文档 URL（可以是相对路径或绝对路径）
     * <p>
     * 示例：
     * - /external-service/v3/api-docs（相对路径，通过网关转发）
     * - http://external-api.com/v3/api-docs（绝对路径，直接访问）
     * </p>
     */
    private String url;

    /**
     * 服务分组（可选）
     */
    private String group;

    public ServiceConfig() {
    }

    public ServiceConfig(String name, String url) {
        this.name = name;
        this.url = url;
    }

    public ServiceConfig(String name, String url, String group) {
        this.name = name;
        this.url = url;
        this.group = group;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }
}
