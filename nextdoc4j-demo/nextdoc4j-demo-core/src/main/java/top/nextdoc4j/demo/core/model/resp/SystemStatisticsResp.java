package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Schema(description = "系统统计信息响应参数")
public class SystemStatisticsResp {

    @Schema(description = "用户总数", example = "2500")
    private Integer totalUsers;

    @Schema(description = "活跃用户数", example = "500")
    private Integer activeUsers;

    @Schema(description = "角色总数", example = "25")
    private Integer totalRoles;

    @Schema(description = "权限总数", example = "120")
    private Integer totalPermissions;

    @Schema(description = "今日登录次数", example = "200")
    private Integer todayLogins;

    @Schema(description = "总请求数", example = "50000")
    private Long totalRequests;

    @Schema(description = "失败请求数", example = "500")
    private Long failedRequests;

    @Schema(description = "平均响应时间（毫秒）", example = "125.50")
    private BigDecimal avgResponseTime;

    @Schema(description = "每日统计数据")
    private Map<String, Integer> dailyStats;
}