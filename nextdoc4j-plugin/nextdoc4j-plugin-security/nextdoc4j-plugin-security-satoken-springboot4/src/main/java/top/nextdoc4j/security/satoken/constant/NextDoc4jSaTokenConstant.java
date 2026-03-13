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
package top.nextdoc4j.security.satoken.constant;

import cn.dev33.satoken.annotation.*;

/**
 * Sa-Token 注解常量类
 * <p>
 * 存储 Sa-Token 注解类的引用，用于反射解析注解信息
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
public final class NextDoc4jSaTokenConstant {

    private NextDoc4jSaTokenConstant() {
        // 私有构造器，防止实例化
    }

    // Sa-Token 注解类引用
    public static final Class<SaCheckRole> SA_CHECK_ROLE_CLASS = SaCheckRole.class;
    public static final Class<SaCheckPermission> SA_CHECK_PERMISSION_CLASS = SaCheckPermission.class;
    public static final Class<SaIgnore> SA_IGNORE_CLASS = SaIgnore.class;
}
