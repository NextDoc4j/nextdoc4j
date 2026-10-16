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
 * 品牌化参数
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jBrand implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * logo 信息 格式 classpath:logo/xxx.svg 转 base64
     */
    private String logo;

    /**
     * 标题
     * <p>为空则默认使用 springdoc -openapi 的标题信息</p>
     */
    private String title;

    /**
     * 页脚文本 - 支持 markdown 格式
     */
    private String footerText;

    public String getLogo() {
        return logo;
    }

    public void setLogo(String logo) {
        this.logo = logo;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getFooterText() {
        return footerText;
    }

    public void setFooterText(String footerText) {
        this.footerText = footerText;
    }
}
