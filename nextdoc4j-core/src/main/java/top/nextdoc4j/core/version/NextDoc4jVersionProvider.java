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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * NextDoc4j 版本号提供器
 * <p>
 * 该类负责提供 NextDoc4j 的版本信息，支持以下几种获取方式：
 * <ul>
 * <li>从 classpath 下的 nextdoc4j-version.properties 文件读取</li>
 * <li>从 MANIFEST.MF 读取</li>
 * <li>返回默认版本号</li>
 * </ul>
 * </p>
 *
 * @author echo
 * @since 1.1.6
 **/
public final class NextDoc4jVersionProvider {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jVersionProvider.class);

    private static final String VERSION_PROPERTIES_FILE = "nextdoc4j-version.properties";

    private static final String VERSION_PROPERTY_KEY = "nextdoc4j.version";

    private static final String DEFAULT_VERSION = "1.0.0";

    private static String cachedVersion;

    private NextDoc4jVersionProvider() {
    }

    /**
     * 获取 NextDoc4j 版本号
     * <p>
     * 版本号获取优先级：
     * 1. 缓存中的版本号
     * 2. 从 nextdoc4j-version.properties 文件读取
     * 3. 从 MANIFEST.MF 读取
     * 4. 返回默认版本号
     * </p>
     *
     * @return 版本号字符串
     */
    public static String getVersion() {
        if (cachedVersion != null) {
            return cachedVersion;
        }

        // 尝试从 classpath 下的 properties 文件读取
        String version = readVersionFromProperties();
        if (version != null) {
            cachedVersion = version;
            return cachedVersion;
        }

        // 尝试从 MANIFEST.MF 读取
        version = readVersionFromManifest();
        if (version != null) {
            cachedVersion = version;
            return cachedVersion;
        }

        // 返回默认版本号
        cachedVersion = DEFAULT_VERSION;
        return cachedVersion;
    }

    /**
     * 从 properties 文件读取版本号
     *
     * @return 版本号，读取失败返回 null
     */
    private static String readVersionFromProperties() {
        Resource resource = new ClassPathResource(VERSION_PROPERTIES_FILE);
        if (!resource.exists()) {
            return null;
        }

        Properties props = new Properties();
        try (InputStream is = resource.getInputStream()) {
            props.load(is);
            String version = props.getProperty(VERSION_PROPERTY_KEY);
            if (version != null && !version.trim().isEmpty()) {
                return version.trim();
            }
        } catch (IOException e) {
            log.debug("Failed to read version properties file", e);
        }
        return null;
    }

    /**
     * 从 MANIFEST.MF 读取版本号
     *
     * @return 版本号，读取失败返回 null
     */
    private static String readVersionFromManifest() {
        try {
            String version = NextDoc4jVersionProvider.class.getPackage().getImplementationVersion();
            if (version != null && !version.trim().isEmpty()) {
                return version.trim();
            }
        } catch (Exception e) {
            log.debug("Failed to read version from MANIFEST", e);
        }
        return null;
    }

    /**
     * 清除缓存（主要用于测试）
     */
    static void clearCache() {
        cachedVersion = null;
    }
}
