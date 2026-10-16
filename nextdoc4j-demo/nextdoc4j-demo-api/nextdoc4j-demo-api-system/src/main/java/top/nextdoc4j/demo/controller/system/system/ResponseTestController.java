package top.nextdoc4j.demo.controller.system.system;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.R;

/**
 *
 * @author echo
 * @since 2026/07/10 09:33
 **/
@Tag(name = "响应测试")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/resp")
public class ResponseTestController {


    @ApiError(code = "system.config.text.failed", status = 500, reason = "系统配置纯文本渲染失败")
    @Operation(summary = "获取系统配置 - 纯文本", description = "以纯文本格式返回系统配置信息")
    @GetMapping(value = "/config/text", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getSystemConfigText() {
        String text = """
        system.name = NextDoc4j
        system.version = 1.0.0
        system.environment = production
        system.maxConnections = 100
        system.debugMode = false
        """;
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(text);
    }

    @ApiError(code = "system.config.csv.failed", status = 500, reason = "系统配置 CSV 导出失败")
    @Operation(summary = "导出系统配置 - CSV", description = "以 CSV 格式导出系统配置列表,可直接用 Excel 打开")
    @GetMapping(value = "/config/export", produces = "text/csv")
    public ResponseEntity<String> exportSystemConfigCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("id,name,key,value,description\n");
        csv.append("1,系统名称,system.name,NextDoc4j Demo,系统显示名称\n");
        csv.append("2,登录超时时间,login.timeout,7200,用户登录超时时间（秒）\n");
        csv.append("3,系统维护模式,system.maintenance,false,是否开启维护模式\n");

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=system-config.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString());
    }

    @Operation(summary = "系统信息 - HTML 视图", description = "以 HTML 页面形式展示系统运行信息,便于直接在浏览器查看")
    @GetMapping(value = "/info/view", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getSystemInfoHtml() {
        String html = """
        <html>
        <head><title>System Info</title></head>
        <body>
            <h1>NextDoc4j Demo System</h1>
            <p>Version: 1.0.0</p>
            <p>Java: %s</p>
            <p>OS: %s</p>
        </body>
        </html>
        """.formatted(System.getProperty("java.version"), System.getProperty("os.name"));

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @ApiError(code = "system.log.download.failed", status = 500, reason = "日志文件下载失败")
    @Operation(summary = "下载系统日志文件", description = "以二进制流形式下载系统日志文件")
    @GetMapping(value = "/logs/download", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> downloadSystemLogs() {
        String content = "2025-09-15 10:00:00 INFO  系统启动完成\n"
                + "2025-09-15 10:00:01 INFO  数据库连接成功\n";
        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=system.log")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    @Operation(summary = "获取系统状态徽章", description = "返回一张 SVG 格式的系统状态徽章图片,类似 shields.io 的效果")
    @GetMapping(value = "/status/badge", produces = "image/svg+xml")
    public ResponseEntity<String> getStatusBadge() {
        String svg = """
        <svg xmlns="http://www.w3.org/2000/svg" width="90" height="20">
            <rect width="90" height="20" fill="#4c1"/>
            <text x="45" y="14" fill="#fff" font-size="11" text-anchor="middle">status: up</text>
        </svg>
        """;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("image/svg+xml"))
                .body(svg);
    }

    @ApiError(code = "system.qrcode.generate.failed", status = 500, reason = "二维码生成失败")
    @Operation(summary = "获取系统二维码 - Base64", description = "生成系统访问二维码,以 Data URI 格式返回(含 data:image/png;base64, 前缀),前端可直接用于 img 标签的 src 属性")
    @GetMapping(value = "/qrcode/base64")
    public R<String> getSystemQrCodeBase64() {
        String base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        String dataUri = "data:image/png;base64," + base64Image;

        return R.ok(dataUri);
    }

    @ApiError(code = "system.qrcode.generate.failed", status = 500, reason = "二维码生成失败")
    @Operation(summary = "获取系统二维码 - Base64(纯文本)", description = "直接以纯文本形式返回 Data URI 格式的图片字符串,不做 JSON 包装")
    @GetMapping(value = "/qrcode/base64/raw", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getSystemQrCodeBase64Raw() {
        String base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        String dataUri = "data:image/png;base64," + base64Image;

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(dataUri);
    }
}
