package top.nextdoc4j.demo.core.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import top.nextdoc4j.enums.core.EnumValue;


/**
 * 角色状态类型
 *
 * @author echo
 * @since 2025/11/05
 */
@Getter
@RequiredArgsConstructor
public enum RoleStatusType implements EnumValue<Integer> {


    ACTIVE(1, "启用"),
    INACTIVE(2, "禁用");

    private final Integer value;
    private final String description;

    @JsonValue
    public Integer getValue() {
        return value;
    }

    @JsonCreator
    public static RoleStatusType fromValue(Integer value) {
        for (RoleStatusType type : values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("非法的状态值: " + value);
    }
}