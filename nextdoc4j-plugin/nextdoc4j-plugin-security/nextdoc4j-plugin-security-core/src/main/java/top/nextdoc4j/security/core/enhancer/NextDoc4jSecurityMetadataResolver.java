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

import org.springframework.core.Ordered;
import org.springframework.web.method.HandlerMethod;
import top.nextdoc4j.security.core.model.NextDoc4jSecurityMetadata;
import io.swagger.v3.oas.models.Operation;

/**
 * 安全元数据解析器接口
 * <p>
 * 提供扩展点，允许不同的权限框架实现自己的注解解析器。
 * 实现此接口的组件会被自动扫描并应用到 OpenAPI 文档生成过程中。
 * </p>
 * <p>
 * 支持的权限框架：
 * - Sa-Token
 * - Spring Security
 * - Apache Shiro
 * - 自定义权限框架
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public interface NextDoc4jSecurityMetadataResolver extends Ordered {

    /**
     * 解析 HandlerMethod 中的权限注解
     * <p>
     * 实现此方法来完成权限注解的解析工作，
     * 并将结果填充到 NextDoc4jSecurityMetadata 对象中
     * </p>
     *
     * @param handlerMethod 处理程序方法
     * @param operation     OpenAPI 操作对象
     * @param metadata      安全元数据对象（需要填充权限和角色信息）
     */
    void resolve(HandlerMethod handlerMethod, Operation operation, NextDoc4jSecurityMetadata metadata);

    /**
     * 判断是否支持处理该 HandlerMethod
     * <p>
     * 可以根据注解类型、类名等条件来判断是否支持处理，
     * 返回 false 的解析器将被跳过
     * </p>
     *
     * @param handlerMethod 处理程序方法
     * @return 是否支持处理
     */
    default boolean supports(HandlerMethod handlerMethod) {
        return true;
    }

    /**
     * 获取解析器的名称
     * <p>
     * 用于日志输出和调试
     * </p>
     *
     * @return 解析器名称
     */
    default String getName() {
        return this.getClass().getSimpleName();
    }
}
