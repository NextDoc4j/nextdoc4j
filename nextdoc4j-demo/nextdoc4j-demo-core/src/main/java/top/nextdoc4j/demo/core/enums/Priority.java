package top.nextdoc4j.demo.core.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import top.nextdoc4j.enums.core.EnumValue;

/**
 * 优先级
 *
 * @author echo
 * @since  2025/12/15
 */
@Getter
@RequiredArgsConstructor
public enum Priority implements EnumValue<Integer> {

    LOW(1),
    MEDIUM(2),
    HIGH(3),
    URGENT(4);

    private final Integer value;

}
