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
package top.nextdoc4j.core.json;

/**
 * 按<strong>宿主</strong> classpath 选择 Jackson 3 或 Jackson 2 的 {@link DocJsonMapper}。
 * <p>
 * 探测的是运行时真实存在的 ObjectMapper 实现类（Boot 4 提供 tools.jackson，Boot 3 提供
 * fasterxml），而不是 adapter 模块是否被打进依赖树。adapter 中的 jackson 依赖应为
 * provided，避免 adapter 自身把 tools.jackson 强行带上 Boot 3 应用。
 */
public final class DocJsonMapperLoader {

    static final String JACKSON3_OBJECT_MAPPER = "tools.jackson.databind.ObjectMapper";
    static final String JACKSON2_OBJECT_MAPPER = "com.fasterxml.jackson.databind.ObjectMapper";
    static final String JACKSON3_IMPL = "top.nextdoc4j.adapter.jackson3.Jackson3DocJsonMapper";
    static final String JACKSON2_IMPL = "top.nextdoc4j.adapter.jackson2.Jackson2DocJsonMapper";

    private static volatile DocJsonMapper cached;

    private DocJsonMapperLoader() {
    }

    /**
     * 加载可用的 JSON 映射器：优先 tools.jackson（Boot 4），否则 fasterxml（Boot 3）。
     */
    public static DocJsonMapper get() {
        DocJsonMapper local = cached;
        if (local != null) {
            return local;
        }
        synchronized (DocJsonMapperLoader.class) {
            if (cached != null) {
                return cached;
            }
            cached = create();
            return cached;
        }
    }

    /**
     * 根据宿主 ObjectMapper 类型解析应加载的实现类名（供测试与诊断）。
     */
    static String resolveImplementationClassName() {
        if (isPresent(JACKSON3_OBJECT_MAPPER)) {
            return JACKSON3_IMPL;
        }
        if (isPresent(JACKSON2_OBJECT_MAPPER)) {
            return JACKSON2_IMPL;
        }
        throw new IllegalStateException("No Jackson ObjectMapper on classpath. Boot 3 apps need com.fasterxml.jackson; " + "Boot 4 apps need tools.jackson.");
    }

    /**
     * 创建映射器实例（不写缓存）。
     */
    static DocJsonMapper create() {
        String impl = resolveImplementationClassName();
        return newInstance(impl);
    }

    /**
     * 清空缓存，仅用于测试。
     */
    static void clearCache() {
        cached = null;
    }

    /**
     * 反射实例化 adapter 实现；仅在对应 Jackson 已存在时调用，避免提前加载错误实现类。
     *
     * @param className 实现类全限定名
     * @return DocJsonMapper 实例
     */
    private static DocJsonMapper newInstance(String className) {
        try {
            Class<?> clazz = Class.forName(className);
            Object instance = clazz.getDeclaredConstructor().newInstance();
            return (DocJsonMapper)instance;
        } catch (ReflectiveOperationException | ClassCastException ex) {
            throw new IllegalStateException("Failed to load DocJsonMapper implementation: " + className + ". Ensure the matching nextdoc4j-adapter-jackson* jar is on the classpath.", ex);
        }
    }

    /**
     * 探测类是否在当前线程上下文 / 本类 ClassLoader 上。
     *
     * @param className 待探测类全限定名
     * @return 存在返回 true
     */
    static boolean isPresent(String className) {
        ClassLoader cl = Thread.currentThread().getContextClassLoader();
        if (cl == null) {
            cl = DocJsonMapperLoader.class.getClassLoader();
        }
        try {
            Class.forName(className, false, cl);
            return true;
        } catch (ClassNotFoundException | NoClassDefFoundError ex) {
            return false;
        }
    }
}
