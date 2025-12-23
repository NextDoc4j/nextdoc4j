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
 * 网关聚合文档元数据信息
 * <p>
 * 用于在 /v3/api-docs 响应中添加 x-nextdoc4j-aggregation 扩展字段，
 * 供前端判断是否为聚合网关模式
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewayAggregationInfo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否为聚合网关模式
     */
    private boolean aggregation;

    /**
     * 文档路径
     */
    private String docPath;

    public GatewayAggregationInfo() {
        this.aggregation = true;
    }

    public GatewayAggregationInfo(String docPath) {
        this.aggregation = true;
        this.docPath = docPath;
    }

    public boolean isAggregation() {
        return aggregation;
    }

    public void setAggregation(boolean aggregation) {
        this.aggregation = aggregation;
    }

    public String getDocPath() {
        return docPath;
    }

    public void setDocPath(String docPath) {
        this.docPath = docPath;
    }
}
