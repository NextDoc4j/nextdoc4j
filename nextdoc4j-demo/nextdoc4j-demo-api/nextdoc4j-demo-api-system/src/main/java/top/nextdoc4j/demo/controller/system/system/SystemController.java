package top.nextdoc4j.demo.controller.system.system;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.RandomUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.req.SystemConfigReq;
import top.nextdoc4j.demo.core.model.resp.SystemConfigResp;
import top.nextdoc4j.demo.core.model.resp.SystemInfoResp;
import top.nextdoc4j.demo.core.model.resp.SystemStatisticsResp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统管理控制器
 *
 * @author echo
 * @since 2025/09/15
 */
@Tag(
        name = "系统管理",
        extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "1")))
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/system")
public class SystemController {

    @Operation(summary = "获取系统信息", description = "获取系统基本信息和运行状态")
    @GetMapping("/info")
    public R<SystemInfoResp> getSystemInfo() {
        SystemInfoResp systemInfo = new SystemInfoResp();
        systemInfo.setSystemName("NextDoc4j Demo System");
        systemInfo.setVersion("1.0.0");
        systemInfo.setUptime(System.currentTimeMillis() - 3600000L); // 假设运行1小时
        systemInfo.setJavaVersion(System.getProperty("java.version"));
        systemInfo.setOsName(System.getProperty("os.name"));
        systemInfo.setOsVersion(System.getProperty("os.version"));
        systemInfo.setMemoryTotal(Runtime.getRuntime().totalMemory());
        systemInfo.setMemoryFree(Runtime.getRuntime().freeMemory());
        systemInfo.setMemoryUsed(systemInfo.getMemoryTotal() - systemInfo.getMemoryFree());
        systemInfo.setCpuCores(Runtime.getRuntime().availableProcessors());
        systemInfo.setCurrentTime(LocalDateTime.now());

        return R.ok(systemInfo);
    }

    @Operation(summary = "获取系统统计信息", description = "获取系统各模块的统计数据")
    @GetMapping("/statistics")
    public R<SystemStatisticsResp> getSystemStatistics() {
        SystemStatisticsResp statistics = new SystemStatisticsResp();
        statistics.setTotalUsers(RandomUtil.randomInt(1000, 5000));
        statistics.setActiveUsers(RandomUtil.randomInt(100, 1000));
        statistics.setTotalRoles(RandomUtil.randomInt(10, 50));
        statistics.setTotalPermissions(RandomUtil.randomInt(50, 200));
        statistics.setTodayLogins(RandomUtil.randomInt(50, 500));
        statistics.setTotalRequests(RandomUtil.randomLong(10000L, 100000L));
        statistics.setFailedRequests(RandomUtil.randomLong(100L, 1000L));
        statistics.setAvgResponseTime(BigDecimal.valueOf(RandomUtil.randomDouble(50.0, 500.0)));

        // 生成最近7天的统计数据
        Map<String, Integer> dailyStats = new HashMap<>();
        for (int i = 6; i >= 0; i--) {
            String date = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            dailyStats.put(date, RandomUtil.randomInt(100, 1000));
        }
        statistics.setDailyStats(dailyStats);

        return R.ok(statistics);
    }

    @Operation(summary = "获取系统配置列表", description = "获取所有系统配置项")
    @GetMapping("/config")
    public R<List<SystemConfigResp>> getSystemConfigs() {
        List<SystemConfigResp> configs = CollUtil.newArrayList();

        String[][] configData = {
                {"系统名称", "system.name", "NextDoc4j Demo", "系统显示名称"},
                {"系统版本", "system.version", "1.0.0", "当前系统版本"},
                {"登录超时时间", "login.timeout", "7200", "用户登录超时时间（秒）"},
                {"密码最小长度", "password.min.length", "6", "用户密码最小长度"},
                {"文件上传大小限制", "upload.max.size", "10485760", "文件上传最大字节数"},
                {"邮件服务器", "mail.smtp.host", "smtp.163.com", "SMTP邮件服务器地址"},
                {"系统维护模式", "system.maintenance", "false", "是否开启维护模式"}
        };

        for (int i = 0; i < configData.length; i++) {
            SystemConfigResp config = new SystemConfigResp();
            config.setId((long) (i + 1));
            config.setName(configData[i][0]);
            config.setKey(configData[i][1]);
            config.setValue(configData[i][2]);
            config.setDescription(configData[i][3]);
            config.setEditable(true);
            config.setUpdateTime(LocalDateTime.now().minusDays(RandomUtil.randomInt(1, 30)));
            configs.add(config);
        }

        return R.ok(configs);
    }

    @Operation(summary = "更新系统配置", description = "更新指定的系统配置项")
    @PutMapping("/config/{id}")
    public R<SystemConfigResp> updateSystemConfig(@PathVariable Long id,
                                                  @RequestBody SystemConfigReq configReq) {
        if (id <= 0) {
            return R.fail("400", "配置ID无效");
        }

        SystemConfigResp config = new SystemConfigResp();
        config.setId(id);
        config.setName("更新后的配置名称");
        config.setKey(configReq.getKey());
        config.setValue(configReq.getValue());
        config.setDescription(configReq.getDescription());
        config.setEditable(true);
        config.setUpdateTime(LocalDateTime.now());

        return R.ok(config);
    }

    @Operation(summary = "重置系统配置", description = "重置系统配置为默认值",extensions = @Extension(properties = @ExtensionProperty(name = "x-order", value = "1")))
    @PostMapping("/config/reset")
    public R<Void> resetSystemConfig() {
        // 模拟重置系统配置
        return R.ok(null);
    }

    @Operation(summary = "系统健康检查", description = "检查系统各组件的健康状态")
    @GetMapping("/health")
    public R<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());

        Map<String, Object> components = new HashMap<>();

        // 数据库健康检查
        Map<String, Object> database = new HashMap<>();
        database.put("status", "UP");
        database.put("responseTime", RandomUtil.randomInt(10, 100) + "ms");
        components.put("database", database);

        // 缓存健康检查
        Map<String, Object> cache = new HashMap<>();
        cache.put("status", RandomUtil.randomBoolean() ? "UP" : "DOWN");
        cache.put("responseTime", RandomUtil.randomInt(1, 10) + "ms");
        components.put("cache", cache);

        // 文件存储健康检查
        Map<String, Object> storage = new HashMap<>();
        storage.put("status", "UP");
        storage.put("freeSpace", RandomUtil.randomLong(1000000000L, 10000000000L));
        components.put("storage", storage);

        health.put("components", components);

        return R.ok(health);
    }

    @Operation(summary = "清理系统缓存", description = "清理系统各级缓存")
    @PostMapping("/cache/clear")
    public R<Map<String, String>> clearCache(@RequestParam(required = false) String cacheType) {
        Map<String, String> result = new HashMap<>();

        if (cacheType == null || "all".equals(cacheType)) {
            result.put("userCache", "cleared");
            result.put("roleCache", "cleared");
            result.put("configCache", "cleared");
        } else {
            result.put(cacheType, "cleared");
        }

        result.put("timestamp", LocalDateTime.now().toString());

        return R.ok(result);
    }

    @Operation(summary = "获取系统日志", description = "获取系统运行日志")
    @GetMapping("/logs")
    @Parameters({
            @Parameter(name = "level", description = "日志级别", example = "INFO", in = ParameterIn.QUERY),
            @Parameter(name = "limit", description = "日志数量限制", example = "50", in = ParameterIn.QUERY)
    })
    public R<List<Map<String, Object>>> getSystemLogs(@RequestParam(defaultValue = "INFO") String level,
                                                      @RequestParam(defaultValue = "50") Integer limit) {
        List<Map<String, Object>> logs = CollUtil.newArrayList();

        String[] logLevels = {"INFO", "WARN", "ERROR", "DEBUG"};
        String[] logMessages = {
                "用户登录成功",
                "系统配置更新",
                "数据库连接异常",
                "缓存清理完成",
                "文件上传成功",
                "API调用超时",
                "权限验证失败",
                "定时任务执行"
        };

        for (int i = 0; i < Math.min(limit, 100); i++) {
            Map<String, Object> log = new HashMap<>();
            log.put("id", i + 1);
            log.put("timestamp", LocalDateTime.now().minusMinutes(RandomUtil.randomInt(1, 1440)));
            log.put("level", RandomUtil.randomEle(logLevels));
            log.put("message", RandomUtil.randomEle(logMessages));
            log.put("thread", "thread-" + RandomUtil.randomInt(1, 10));
            log.put("logger", "top.nextdoc4j.demo.service.SystemService");
            logs.add(log);
        }

        return R.ok(logs);
    }
    @ApiError(code = "system.config.xml.disabled", status = 406, reason = "当前环境未启用 XML 配置输出")
    @ApiError(code = "system.config.xml.failed", status = 500, reason = "系统配置 XML 渲染失败")
    @Operation(summary = "获取系统配置 - xml", description = "以 XML 格式返回系统配置信息")
    @GetMapping(value = "/config/xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getSystemConfigXml() {
        String xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <SystemConfig>
                <AppName>NextDoc4j</AppName>
                <Version>1.0.0</Version>
                <Environment>production</Environment>
                <MaxConnections>100</MaxConnections>
                <DebugMode>false</DebugMode>
            </SystemConfig>
            """;
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }
}
