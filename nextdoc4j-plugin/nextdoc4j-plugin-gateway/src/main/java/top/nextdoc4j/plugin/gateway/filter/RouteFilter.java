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
package top.nextdoc4j.plugin.gateway.filter;

import org.springframework.cloud.gateway.route.RouteDefinition;
import top.nextdoc4j.plugin.gateway.configuration.GatewayDocProperties;

/**
 * 路由过滤器接口
 * <p>
 * 用于判断 Gateway 路由是否应该被包含在文档聚合中
 * </p>
 *
 * @author echo
 * @since 1.2.0
 */
@FunctionalInterface
public interface RouteFilter {

    /**
     * 判断路由是否应该被包含
     *
     * @param route      路由定义
     * @param properties 配置属性
     * @return true-包含，false-排除
     */
    boolean test(RouteDefinition route, GatewayDocProperties properties);

    /**
     * 组合过滤器（AND 逻辑）
     *
     * @param other 另一个过滤器
     * @return 组合后的过滤器
     */
    default RouteFilter and(RouteFilter other) {
        return (route, props) -> this.test(route, props) && other.test(route, props);
    }

    /**
     * 组合过滤器（OR 逻辑）
     *
     * @param other 另一个过滤器
     * @return 组合后的过滤器
     */
    default RouteFilter or(RouteFilter other) {
        return (route, props) -> this.test(route, props) || other.test(route, props);
    }

    /**
     * 取反过滤器
     *
     * @return 取反后的过滤器
     */
    default RouteFilter negate() {
        return (route, props) -> !this.test(route, props);
    }
}
