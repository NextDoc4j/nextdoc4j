package top.nextdoc4j.demo.controller.file;

import cn.hutool.core.util.IdUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.req.Robot;
import top.nextdoc4j.demo.core.model.resp.FileUploadResp;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * 文件管理控制器
 * <p>
 * 涵盖场景：
 * 1. 单文件上传（@RequestPart 推荐）
 * 2. 单文件上传（@RequestParam 兼容）
 * 3. 多文件上传（@RequestPart 推荐）
 * 4. 多文件上传（@RequestParam 兼容）
 * 5. 文件 + 额外参数上传（表单混合提交）
 * 6. Base64 文件上传
 * 7. 文件下载（附件模式）
 * 8. 文件下载（预览模式）
 * 9. 文件流下载（大文件分片）
 *
 * @author Your Name
 */
@Slf4j
@Tag(name = "文件管理（无请求头）", description = "文件上传与下载接口，不要求任何请求头")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/simple-file")
public class FileControllerNoHeader {

    // ==================== 单文件上传 ====================

    /**
     * 【推荐】单文件上传 - 使用 @RequestPart
     * <p>
     * 适用场景：标准的单文件上传，Swagger UI 友好
     * 前端示例（FormData）：
     * const formData = new FormData();
     * formData.append('file', fileObject);
     */
    @Operation(
            summary = "单文件上传（推荐）",
            description = "使用 @RequestPart 上传单个文件，推荐方式，Swagger UI 支持良好"
    )
    @ApiResponse(responseCode = "200", description = "上传成功")
    @PostMapping(value = "/upload/single")
    public R<FileUploadResp> uploadSingle(
            @RequestPart("file")
            @Parameter(description = "要上传的文件", required = true)
            MultipartFile file) {

        validateFile(file);
        log.info("单文件上传：{}, 大小：{} bytes", file.getOriginalFilename(), file.getSize());
        return R.ok(buildFileUploadResp(file));
    }

    /**
     * 单文件上传 - 使用 @RequestParam（兼容模式）
     * <p>
     * 适用场景：某些旧版本客户端或特殊需求
     * 注意：需要额外配置才能在 Swagger UI 中正确显示
     */
    @Operation(
            summary = "单文件上传（兼容模式）",
            description = "使用 @RequestParam 上传单个文件，兼容旧版本客户端",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(schema = @Schema(implementation = SingleFileRequest.class)))
    )
    @PostMapping(value = "/upload/single-compat")
    public R<FileUploadResp> uploadSingleCompat(
            @RequestParam("file") MultipartFile file) {

        validateFile(file);
        return R.ok(buildFileUploadResp(file));
    }

    // ==================== 多文件上传 ====================

    /**
     * 【推荐】多文件上传 - 使用 @RequestPart
     * <p>
     * 适用场景：批量文件上传
     * 前端示例（FormData）：
     * const formData = new FormData();
     * files.forEach(file => formData.append('files', file));
     * <p>
     * 注意：总请求大小受 spring.servlet.multipart.max-request-size 限制
     */
    @Operation(
            summary = "多文件上传（推荐）",
            description = "使用 @RequestPart 批量上传文件（单文件最大 5MB，总请求最大 10MB）"
    )
    @ApiResponse(responseCode = "200", description = "上传成功")
    @PostMapping(value = "/upload/batch")
    public R<List<FileUploadResp>> uploadBatch(
            @RequestPart("files")
            @Parameter(description = "要上传的文件列表", required = true)
            List<MultipartFile> files) {

        validateFiles(files);
        log.info("批量上传文件数量：{}", files.size());

        List<FileUploadResp> responses = files.stream()
                .map(this::buildFileUploadResp)
                .toList();

        return R.ok(responses);
    }

    /**
     * 多文件上传 - 使用 @RequestParam（兼容模式）
     */
    @Operation(
            summary = "多文件上传（兼容模式）",
            description = "使用 @RequestParam 批量上传文件",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(
                            schema = @Schema(implementation = FileController.MultiFileRequest.class)
                    )
            )
    )
    @PostMapping(value = "/upload/batch-compat")
    public R<List<FileUploadResp>> uploadBatchCompat(
            @RequestParam("files") List<MultipartFile> files) {

        validateFiles(files);

        List<FileUploadResp> responses = files.stream()
                .map(this::buildFileUploadResp)
                .toList();

        return R.ok(responses);
    }

    /**
     * 多文件上传 - 使用数组接收（另一种方式）
     * <p>
     * 适用场景：某些框架或客户端使用数组形式
     */
    @Operation(
            summary = "多文件上传（数组模式）",
            description = "使用数组接收多个文件"
    )
    @PostMapping(value = "/upload/batch-array")
    public R<List<FileUploadResp>> uploadBatchArray(
            @RequestPart("files") MultipartFile[] files) {

        if (files == null || files.length == 0) {
            return R.fail("文件列表不能为空");
        }

        List<FileUploadResp> responses = Arrays.stream(files)
                .map(this::buildFileUploadResp)
                .toList();

        return R.ok(responses);
    }

    // ==================== 文件 + 参数混合上传 ====================

    /**
     * 文件 + 表单参数混合上传
     * <p>
     * 适用场景：上传文件的同时需要传递其他业务参数
     * 前端示例（FormData）：
     * const formData = new FormData();
     * formData.append('file', fileObject);
     * formData.append('category', 'avatar');
     * formData.append('description', '用户头像');
     */
    @Operation(
            summary = "文件 + 参数混合上传",
            description = "上传文件的同时提交其他表单参数"
    )
    @PostMapping(value = "/upload/with-params")
    public R<FileUploadResp> uploadWithParams(
            @RequestPart("file")
            @Parameter(description = "要上传的文件", required = true)
            MultipartFile file,

            @RequestParam(value = "category", required = false)
            @Parameter(description = "文件分类（如：avatar, document, image）")
            String category,

            @RequestParam(value = "description", required = false)
            @Parameter(description = "文件描述")
            String description) {

        validateFile(file);
        log.info("上传文件：{}，分类：{}，描述：{}", file.getOriginalFilename(), category, description);

        FileUploadResp resp = buildFileUploadResp(file);
        // 可以在这里保存 category 和 description 到数据库

        return R.ok(resp);
    }

    /**
     * 文件 + JSON 参数混合上传
     * <p>
     * 适用场景：需要传递复杂对象参数
     * 前端示例：
     * const formData = new FormData();
     * formData.append('file', fileObject);
     * formData.append('metadata', JSON.stringify({category: 'avatar', tags: ['user', 'profile']}));
     */
    @Operation(
            summary = "文件 + JSON 参数混合上传",
            description = "上传文件 + JSON 格式的元数据"
    )
    @PostMapping(value = "/upload/with-json")
    public R<FileUploadResp> uploadWithJson(
            @RequestPart("file")
            @Parameter(description = "要上传的文件", required = true)
            MultipartFile file,

            @RequestPart(value = "metadata", required = false)
            @Parameter(description = "文件元数据（JSON 格式）")
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)
            )
            String metadata) {

        validateFile(file);
        log.info("上传文件：{}，元数据：{}", file.getOriginalFilename(), metadata);

        // 可以解析 metadata JSON 并保存
        // ObjectMapper mapper = new ObjectMapper();
        // FileMetadata meta = mapper.readValue(metadata, FileMetadata.class);

        return R.ok(buildFileUploadResp(file));
    }

    // ==================== 文件下载 ====================

    /**
     * 下载更新日志 - 附件模式
     * <p>
     * 固定文件：markdown/CHANGELOG.md
     * Content-Disposition: attachment（强制下载）
     */
    @Operation(
            summary = "下载更新日志",
            description = "下载 CHANGELOG.md 文件（附件模式）"
    )
    @GetMapping("/download/changelog")
    public void downloadChangelog(HttpServletResponse response) throws IOException {
        String filepath = "markdown/changelog/CHANGELOG.md";
        String filename = "CHANGELOG.md";
        downloadFile(filepath, filename, true, response);
    }

    /**
     * 通用文件下载方法
     *
     * @param filepath     文件在 classpath 中的路径
     * @param filename     下载时的文件名
     * @param asAttachment 是否作为附件下载（true: 强制下载, false: 浏览器预览）
     * @param response     HTTP 响应对象
     */
    private void downloadFile(String filepath, String filename, boolean asAttachment,
                              HttpServletResponse response) throws IOException {

        ClassPathResource resource = new ClassPathResource(filepath);

        if (!resource.exists()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"code\":404,\"message\":\"文件未找到: " + filename + "\"}");
            log.warn("文件不存在：{}", filepath);
            return;
        }

        // 确定 Content-Type
        String contentType = determineContentType(filename);
        response.setContentType(contentType);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        // 设置 Content-Disposition
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = asAttachment ? "attachment" : "inline";
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                disposition + "; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename);

        // 设置文件大小
        response.setContentLengthLong(resource.contentLength());

        // 写入响应流
        try (InputStream in = resource.getInputStream();
             OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
            out.flush();
        }

        log.info("文件{}成功：{} ({})", asAttachment ? "下载" : "预览", filename, filepath);
    }

    // ==================== 辅助方法 ====================

    /**
     * 文件校验
     * 注意：文件大小限制已在 application.yml 中配置
     * spring.servlet.multipart.max-file-size=5MB
     * spring.servlet.multipart.max-request-size=10MB
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }

        // 文件类型限制（根据实际需求调整，可选）
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("无法识别文件类型");
        }
    }

    /**
     * 批量文件校验
     * 注意：文件数量和总大小限制已在 Spring 配置中处理
     */
    private void validateFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("文件列表不能为空");
        }
        if (files.size() > 3) {
            throw new IllegalArgumentException("文件数量不能超过3个");
        }
        files.forEach(this::validateFile);
    }

    /**
     * 构建文件上传响应
     */
    private FileUploadResp buildFileUploadResp(MultipartFile file) {
        FileUploadResp resp = new FileUploadResp();
        resp.setOriginalName(file.getOriginalFilename());
        resp.setFileName(IdUtil.fastSimpleUUID() + "_" + file.getOriginalFilename());
        resp.setFileSize(file.getSize());
        resp.setContentType(file.getContentType());
        resp.setUrl("https://demo.top/files/" + resp.getFileName());
        resp.setUploadTime(LocalDateTime.now());
        return resp;
    }

    /**
     * 根据文件扩展名确定 Content-Type
     */
    private String determineContentType(String filename) {
        String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "txt" -> "text/plain; charset=UTF-8";
            case "md" -> "text/markdown; charset=UTF-8";
            case "json" -> "application/json";
            case "xml" -> "application/xml";
            default -> MediaType.APPLICATION_OCTET_STREAM_VALUE;
        };
    }

    /**
     * 单文件上传请求 Schema（用于 Swagger 文档生成）
     */
    @Data
    @Schema(description = "单文件上传请求")
    public static class SingleFileRequest {

        @Schema(description = "要上传的文件", type = "string", format = "binary", required = true)
        private MultipartFile file;
    }

    /**
     * 多文件上传请求 Schema（用于 Swagger 文档生成）
     */
    @Data
    @Schema(description = "多文件上传请求")
    public static class MultiFileRequest {

        @Schema(description = "要上传的文件列表", type = "array", format = "binary", required = true)
        private List<MultipartFile> files;
    }
}
