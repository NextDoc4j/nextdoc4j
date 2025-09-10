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
package top.nextdoc4j.core.configuration.extension;

import java.io.Serial;
import java.io.Serializable;

/**
 * markdown 属性
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jMarkdown implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 分组名称
     */
    private String group;

    /**
     * markdown 文件的路径或者位置
     * 支持：
     * - 单个文件：classpath:markdown/api.md
     * - 通配符：classpath:markdown/api/**
     */
    private String location;

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
