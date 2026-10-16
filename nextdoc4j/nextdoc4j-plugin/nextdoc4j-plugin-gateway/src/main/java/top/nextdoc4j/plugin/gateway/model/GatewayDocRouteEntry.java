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
 * Gateway 文档路由条目
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayDocRouteEntry implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 显示名称
     */
    private String name;

    /**
     * 文档地址（如 /user/v3/api-docs）
     */
    private String url;

    /**
     * 服务 ID（可选）
     */
    private String serviceId;

    public GatewayDocRouteEntry() {
    }

    public GatewayDocRouteEntry(String name, String url, String serviceId) {
        this.name = name;
        this.url = url;
        this.serviceId = serviceId;
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

    public String getServiceId() {
        return serviceId;
    }

    public void setServiceId(String serviceId) {
        this.serviceId = serviceId;
    }
}
