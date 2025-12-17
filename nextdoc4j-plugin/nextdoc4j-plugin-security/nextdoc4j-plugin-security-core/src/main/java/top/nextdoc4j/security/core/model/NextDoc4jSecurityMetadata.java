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
package top.nextdoc4j.security.core.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

/**
 * 安全信息模型
 * <p>
 * 用于存储权限框架注解解析后的权限和角色信息，
 * 并通过 OpenAPI 扩展字段（x-nextdoc4j-security）展示在 API 文档中
 * </p>
 *
 * @author echo
 * @since 1.1.3
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class NextDoc4jSecurityMetadata {

    /**
     * 权限校验信息列表
     */
    private List<AuthInfo> permissions;

    /**
     * 角色校验信息列表
     */
    private List<AuthInfo> roles;

    /**
     * 是否忽略校验
     */
    private boolean ignore = false;

    public NextDoc4jSecurityMetadata() {
        this.permissions = new ArrayList<>();
        this.roles = new ArrayList<>();
    }

    /**
     * 添加权限信息
     *
     * @param values  权限值数组
     * @param mode    校验模式（AND/OR）
     * @param type    权限类型
     * @param orRoles 或角色数组
     */
    public void addPermission(String[] values, String mode, String type, String[] orRoles) {
        if (values != null && values.length > 0) {
            AuthInfo authInfo = new AuthInfo();
            authInfo.setValues(values);
            authInfo.setMode(mode);
            authInfo.setType(type);
            if (orRoles != null && orRoles.length > 0) {
                authInfo.setOrValues(orRoles);
                authInfo.setOrType("role");
            }
            this.permissions.add(authInfo);
        }
    }

    /**
     * 添加角色信息
     *
     * @param values 角色值数组
     * @param mode   校验模式（AND/OR）
     * @param type   角色类型
     */
    public void addRole(String[] values, String mode, String type) {
        if (values != null && values.length > 0) {
            AuthInfo authInfo = new AuthInfo();
            authInfo.setValues(values);
            authInfo.setMode(mode);
            authInfo.setType(type);
            this.roles.add(authInfo);
        }
    }

    /**
     * 认证信息
     */
    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class AuthInfo {

        /**
         * 权限或角色值数组
         */
        private String[] values;

        /**
         * 校验模式（AND/OR）
         */
        private String mode;

        /**
         * 类型说明
         */
        private String type;

        /**
         * 或权限/角色值数组（用于权限校验时的或角色校验）
         */
        private String[] orValues;

        /**
         * 或值的类型（role/permission）
         */
        private String orType;

        public String[] getValues() {
            return values;
        }

        public void setValues(String[] values) {
            this.values = values;
        }

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String[] getOrValues() {
            return orValues;
        }

        public void setOrValues(String[] orValues) {
            this.orValues = orValues;
        }

        public String getOrType() {
            return orType;
        }

        public void setOrType(String orType) {
            this.orType = orType;
        }
    }

    // Getters and Setters
    public List<AuthInfo> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<AuthInfo> permissions) {
        this.permissions = permissions;
    }

    public List<AuthInfo> getRoles() {
        return roles;
    }

    public void setRoles(List<AuthInfo> roles) {
        this.roles = roles;
    }

    public boolean isIgnore() {
        return ignore;
    }

    public void setIgnore(boolean ignore) {
        this.ignore = ignore;
    }
}
