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
package top.nextdoc4j.core.version;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * NextDoc4j 版本号提供器。
 *
 * @author echo
 * @since 1.1.6
 **/
public final class NextDoc4jVersionProvider {

    private static final String VERSION_PROPERTIES_FILE = "nextdoc4j-version.properties";
    private static final String VERSION_PROPERTY_KEY = "nextdoc4j.version";
    private static final String DEFAULT_VERSION = "1.0.0";

    private static volatile String cachedVersion;

    private NextDoc4jVersionProvider() {
    }

    /**
     * 获取 NextDoc4j 版本号。
     */
    public static String getVersion() {
        if (cachedVersion != null) {
            return cachedVersion;
        }

        synchronized (NextDoc4jVersionProvider.class) {
            if (cachedVersion != null) {
                return cachedVersion;
            }

            String version = readVersionFromProperties();
            if (version == null) {
                version = readVersionFromManifest();
            }
            cachedVersion = version != null ? version : DEFAULT_VERSION;
            return cachedVersion;
        }
    }

    private static String readVersionFromProperties() {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = NextDoc4jVersionProvider.class.getClassLoader();
        }

        try (InputStream inputStream = classLoader.getResourceAsStream(VERSION_PROPERTIES_FILE)) {
            if (inputStream == null) {
                return null;
            }

            Properties properties = new Properties();
            properties.load(inputStream);
            String version = properties.getProperty(VERSION_PROPERTY_KEY);
            if (version != null && !version.trim().isEmpty()) {
                return version.trim();
            }
        } catch (IOException ignored) {
            return null;
        }

        return null;
    }

    private static String readVersionFromManifest() {
        try {
            String version = NextDoc4jVersionProvider.class.getPackage().getImplementationVersion();
            if (version != null && !version.trim().isEmpty()) {
                return version.trim();
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    static void clearCache() {
        cachedVersion = null;
    }
}
