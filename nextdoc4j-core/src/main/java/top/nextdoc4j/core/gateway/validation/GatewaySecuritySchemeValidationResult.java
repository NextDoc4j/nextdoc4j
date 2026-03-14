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
package top.nextdoc4j.core.gateway.validation;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 安全方案校验结果。
 *
 * @author echo
 * @since 1.2.0
 */
public class GatewaySecuritySchemeValidationResult {

    private final boolean valid;
    private final List<String> messages;
    private final Map<String, Object> validExtensions;

    public GatewaySecuritySchemeValidationResult(boolean valid,
                                                 List<String> messages,
                                                 Map<String, Object> validExtensions) {
        this.valid = valid;
        this.messages = messages == null ? Collections.emptyList() : List.copyOf(messages);
        this.validExtensions = validExtensions == null
            ? Collections.emptyMap()
            : Collections.unmodifiableMap(new LinkedHashMap<>(validExtensions));
    }

    public boolean isValid() {
        return valid;
    }

    public List<String> getMessages() {
        return messages;
    }

    public Map<String, Object> getValidExtensions() {
        return validExtensions;
    }
}


