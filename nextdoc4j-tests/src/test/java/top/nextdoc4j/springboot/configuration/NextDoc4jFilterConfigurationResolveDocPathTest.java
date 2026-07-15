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
package top.nextdoc4j.springboot.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.env.MockEnvironment;
import top.nextdoc4j.core.configuration.NextDoc4jProperties;

import java.util.function.Consumer;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * {@link NextDoc4jFilterConfiguration#resolveDocPath}：enabled=false 时仍能从 Environment / Properties 拿到 doc-path。
 */
class NextDoc4jFilterConfigurationResolveDocPathTest {

    @Test
    void fromPropertiesBean() {
        NextDoc4jProperties properties = new NextDoc4jProperties();
        properties.setEnabled(false);
        properties.setDocPath("/secret.html");

        String resolved = NextDoc4jFilterConfiguration.resolveDocPath(providerOf(properties), new MockEnvironment());
        assertEquals("/secret.html", resolved);
    }

    @Test
    void fromEnvironmentWhenPropertiesMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("nextdoc4j.doc-path", "/from-env.html");

        String resolved = NextDoc4jFilterConfiguration.resolveDocPath(providerOf(null), env);
        assertEquals("/from-env.html", resolved);
    }

    @Test
    void nullWhenNothingConfigured() {
        assertNull(NextDoc4jFilterConfiguration.resolveDocPath(providerOf(null), new MockEnvironment()));
    }

    private static ObjectProvider<NextDoc4jProperties> providerOf(NextDoc4jProperties value) {
        return new ObjectProvider<>() {
            @Override
            public NextDoc4jProperties getObject() throws BeansException {
                return value;
            }

            @Override
            public NextDoc4jProperties getObject(Object... args) throws BeansException {
                return value;
            }

            @Override
            public NextDoc4jProperties getIfAvailable() throws BeansException {
                return value;
            }

            @Override
            public NextDoc4jProperties getIfUnique() throws BeansException {
                return value;
            }

            @Override
            public Stream<NextDoc4jProperties> stream() {
                return value == null ? Stream.empty() : Stream.of(value);
            }

            @Override
            public Stream<NextDoc4jProperties> orderedStream() {
                return stream();
            }

            @Override
            public void forEach(Consumer<? super NextDoc4jProperties> action) {
                if (value != null) {
                    action.accept(value);
                }
            }
        };
    }
}
