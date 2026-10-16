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

import java.util.ArrayList;
import java.util.List;

/**
 * 安全信息模型。
 *
 * @author echo
 * @since 1.1.3
 */
public class NextDoc4jSecurityMetadata {

    private List<AuthInfo> permissions;
    private List<AuthInfo> roles;
    private boolean ignore = false;

    public NextDoc4jSecurityMetadata() {
        this.permissions = new ArrayList<>();
        this.roles = new ArrayList<>();
    }

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

    public void addRole(String[] values, String mode, String type) {
        if (values != null && values.length > 0) {
            AuthInfo authInfo = new AuthInfo();
            authInfo.setValues(values);
            authInfo.setMode(mode);
            authInfo.setType(type);
            this.roles.add(authInfo);
        }
    }

    public static class AuthInfo {

        private String[] values;
        private String mode;
        private String type;
        private String[] orValues;
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
