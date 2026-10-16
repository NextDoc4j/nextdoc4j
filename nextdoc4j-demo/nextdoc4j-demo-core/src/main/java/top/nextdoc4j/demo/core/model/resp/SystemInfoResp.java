package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "系统信息响应参数")
public class SystemInfoResp {

    @Schema(description = "系统名称", example = "NextDoc4j Demo System")
    private String systemName;

    @Schema(description = "系统版本", example = "1.0.0")
    private String version;

    @Schema(description = "系统运行时间（毫秒）", example = "3600000")
    private Long uptime;

    @Schema(description = "Java版本", example = "17.0.1")
    private String javaVersion;

    @Schema(description = "操作系统名称", example = "Windows 11")
    private String osName;

    @Schema(description = "操作系统版本", example = "10.0")
    private String osVersion;

    @Schema(description = "总内存（字节）", example = "1073741824")
    private Long memoryTotal;

    @Schema(description = "空闲内存（字节）", example = "536870912")
    private Long memoryFree;

    @Schema(description = "已用内存（字节）", example = "536870912")
    private Long memoryUsed;

    @Schema(description = "CPU核心数", example = "8")
    private Integer cpuCores;

    @Schema(description = "当前时间", example = "2024-01-01T12:00:00")
    private LocalDateTime currentTime;
}