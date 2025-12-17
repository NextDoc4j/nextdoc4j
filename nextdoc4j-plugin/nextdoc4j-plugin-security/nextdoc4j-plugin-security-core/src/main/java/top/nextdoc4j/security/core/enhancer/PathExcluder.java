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

import java.util.Set;

/**
 * 路径排除器
 * 
 * @author echo
 * @since 1.1.3
 */
public interface PathExcluder {

    /**
     * 获取需要排除的路径集合
     * 支持 Ant 风格通配符，如：/api/public/**, /auth/login
     *
     * @return 排除路径集合
     */
    Set<String> getExcludedPaths();

    /**
     * 获取排除器优先级（数字越小优先级越高）
     *
     * @return 优先级
     */
    default int getOrder() {
        return 0;
    }
}
