package top.nextdoc4j.demo.core.model.req;

import lombok.Data;
import top.nextdoc4j.demo.core.enums.StatusType;

/**
 * 机器人实体类
 * <p>
 * 表示机器人基本信息。
 */
@Data
public class Robot {

    /**
     * 机器人 ID
     */
    private Long id;

    /**
     * 机器人名称
     */
    private String name;

    /**
     * 机器人类型
     */
    private String type;

    /**
     * 状态
     */
    private StatusType status;

    /**
     * 创建时间
     */
    private String createTime;

    /**
     * 更新时间
     */
    private String updateTime;
}