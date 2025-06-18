/*
 * Copyright (c) 2022-present Charles7c Authors. All Rights Reserved.
 * <p>
 * Licensed under the GNU LESSER GENERAL PUBLIC LICENSE 3.0;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * <p>
 * http://www.gnu.org/licenses/lgpl.html
 * <p>
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package zw.dcokit4j.enums.util;

import zw.dcokit4j.enums.core.BaseEnum;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 枚举工具类
 *
 * @author echo
 * @since 1.0.0
 */
public class EnumsUtils {

    private EnumsUtils() {
    }

    /**
     * 获取枚举值类型
     *
     * @param enumClass 枚举类型
     * @return 枚举值类型
     */
    public static String getEnumValueTypeAsString(Class<?> enumClass) {
        // 获取枚举类实现的所有接口
        Type[] interfaces = enumClass.getGenericInterfaces();
        // 定义枚举值类型的映射
        Map<Class<?>, String> typeMap = Map
                .of(Integer.class, "integer", Long.class, "long", Double.class, "number", String.class, "string");
        // 遍历所有接口
        for (Type type : interfaces) {
            // 检查接口是否为参数化类型并且原始类型为 BaseEnum
            if (type instanceof ParameterizedType parameterizedType && parameterizedType
                    .getRawType() == BaseEnum.class) {
                Type actualType = parameterizedType.getActualTypeArguments()[0];
                // 检查实际类型参数是否为类类型，并返回对应的字符串类型
                if (actualType instanceof Class<?> actualClass) {
                    return typeMap.getOrDefault(actualClass, "string");
                }
            }
        }
        // 默认返回 "string" 类型
        return "string";
    }

    /**
     * 解析枚举值的格式
     *
     * @param enumValueType 枚举值类型
     * @return String 格式化类型
     */
    public static String resolveFormat(String enumValueType) {
        return switch (enumValueType) {
            case "integer" -> "int32";
            case "long" -> "int64";
            case "number" -> "double";
            default -> enumValueType;
        };
    }

    /**
     * 获取枚举描述 Map
     *
     * @param enumClass 枚举类型
     * @return 枚举描述 Map
     */
    public static Map<Object, String> getDescMap(Class<?> enumClass) {
        BaseEnum[] enums = (BaseEnum[]) enumClass.getEnumConstants();
        return Arrays.stream(enums)
                .collect(Collectors.toMap(BaseEnum::getValue, BaseEnum::getDescription, (a, b) -> a, LinkedHashMap::new));
    }
}