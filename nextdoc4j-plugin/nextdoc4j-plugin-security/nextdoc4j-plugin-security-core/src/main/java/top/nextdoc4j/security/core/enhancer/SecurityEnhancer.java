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
package top.nextdoc4j.security.core.enhancer;

import io.swagger.v3.oas.models.Operation;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.security.core.model.SecurityPluginMetadata;

/**
 * 安全增强器接口
 * 
 * @author echo
 * @since 1.1.3
 */
public interface SecurityEnhancer {

    /**
     * 增强 Operation,添加安全相关的扩展信息
     *
     * @param operation     OpenAPI Operation 对象
     * @param handlerMethod Spring MVC HandlerMethod
     * @return 安全信息模型,如果没有安全要求则返回 null
     */
    SecurityPluginMetadata enhance(Operation operation, HandlerMethod handlerMethod);

    /**
     * 获取增强器的优先级
     * 数值越小优先级越高
     *
     * @return 优先级值
     */
    default int getOrder() {
        return 0;
    }
}
