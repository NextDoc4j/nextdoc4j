package top.nextdoc4j.demo.controller.user.test;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Base64 响应演示：适用于 Java 17+、Spring Boot 3 与 springdoc-openapi 2.x。
 *
 * <p>覆盖四种常见结构：
 * 1. 单字段 base64（JSON 中一个字段承载编码后的二进制）；
 * 2. 列表结构（多个对象，每个对象各自携带 base64 字段）；
 * 3. 嵌套结构（data URI 风格，encoding/mediaType/data 分离）；
 * 4. 裸文本 base64（响应体本身就是一段 base64 字符串，非 JSON 包裹）。
 *
 * <p>scenario 仅用于切换演示分支（如无数据、超限、限流等业务状态）；
 * 图片数据本身来自 {@code src/main/resources/static/image} 目录下的真实文件——
 * 单图接口取目录中第一张（按文件名排序），列表接口返回目录中全部图片。
 * 目录下放几张图就能直接看到 base64 演示效果，不再依赖写死的占位数据。
 */
@Tag(name = "Base64响应示例")
@RestController
@RequestMapping("/design/files")
public class Base64ResponseDemoController {

    /** 演示图片所在的 classpath 位置，对应 src/main/resources/static/image 目录。 */
    private static final String IMAGE_LOCATION_PATTERN = "classpath:/static/image/*";

    private static final ResourcePatternResolver RESOURCE_RESOLVER = new PathMatchingResourcePatternResolver();

    /**
     * 列出 static/image 目录下所有可读文件，按文件名排序，保证每次返回顺序一致。
     */
    private List<Resource> listImageResources() {
        try {
            Resource[] resources = RESOURCE_RESOLVER.getResources(IMAGE_LOCATION_PATTERN);
            return Arrays.stream(resources)
                .filter(Resource::isReadable)
                .sorted(Comparator.comparing(Resource::getFilename, Comparator.nullsLast(String::compareTo)))
                .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("加载 static/image 目录下的图片失败", e);
        }
    }

    /**
     * 取目录中的第一张图片；若目录为空则抛出异常，提示需要放置演示图片。
     * 这属于开发期配置问题，不作为业务状态对外暴露，因此不出现在 @ApiResponses 里。
     */
    private Resource requireFirstImage() {
        return listImageResources().stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException(
                "static/image 目录下没有图片，请放置至少一张图片后再访问该接口"));
    }

    private byte[] readBytes(Resource resource) {
        try (InputStream in = resource.getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("读取图片失败: " + resource.getFilename(), e);
        }
    }

    private String encodeBase64(Resource resource) {
        return Base64.getEncoder().encodeToString(readBytes(resource));
    }

    /** 根据文件扩展名粗略推断 MIME 类型，仅用于演示。 */
    private String guessMediaType(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG_VALUE;
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG_VALUE;
        }
        if (lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF_VALUE;
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    /**
     * 结构一：单字段 base64，直接嵌入 JSON 对象中返回。
     *
     * @param id 头像所属用户标识。
     * @param scenario 演示场景：ready 返回 200，empty 返回 204，tooLarge 返回 413。
     * @return 包含 base64 编码头像数据的响应体。
     */
    @Operation(summary = "获取用户头像（单字段 base64）", description = "演示 base64 数据作为 JSON 中单个字段返回")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "头像已就绪",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = AvatarResp.class)
            )
        ),
        @ApiResponse(
            responseCode = "204",
            description = "用户未设置头像，无返回内容",
            content = @Content
        ),
        @ApiResponse(
            responseCode = "413",
            description = "原始图片超出可内联返回的大小限制",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ErrorResp.class)
            )
        )
    })
    @GetMapping(value = "/avatar/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getAvatar(
        @Parameter(description = "用户标识", example = "user_1001")
        @PathVariable("id") String id,
        @Parameter(description = "用于切换示例，不是真实业务判断",
            schema = @Schema(allowableValues = {"ready", "empty", "tooLarge"}))
        @RequestParam(value = "scenario", defaultValue = "ready") String scenario
    ) {
        if ("empty".equals(scenario)) {
            return ResponseEntity.noContent().build();
        }
        if ("tooLarge".equals(scenario)) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResp("avatar.too_large", "原始图片过大，请改用下载接口获取", false));
        }
        Resource image = requireFirstImage();
        byte[] bytes = readBytes(image);
        AvatarResp body = new AvatarResp(
            id, guessMediaType(image.getFilename()),
            Base64.getEncoder().encodeToString(bytes), bytes.length);
        return ResponseEntity.ok(body);
    }

    /**
     * 结构二：列表结构，每个元素各自携带独立的 base64 字段。
     *
     * @param id 相册标识。
     * @param scenario 演示场景：ready 返回 200 且含 static/image 目录下的全部图片，empty 返回 200 且列表为空。
     * @return 缩略图列表响应体。
     */
    @Operation(summary = "获取相册缩略图列表（数组结构）", description = "演示 base64 字段出现在数组中的每个对象里")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "查询成功，可能返回空数组",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GalleryResp.class)
            )
        )
    })
    @GetMapping(value = "/gallery/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<GalleryResp> getGalleryThumbnails(
        @Parameter(description = "相册标识", example = "album_2001")
        @PathVariable("id") String id,
        @Parameter(description = "用于切换示例，不是真实业务判断",
            schema = @Schema(allowableValues = {"ready", "empty"}))
        @RequestParam(value = "scenario", defaultValue = "ready") String scenario
    ) {
        if ("empty".equals(scenario)) {
            return ResponseEntity.ok(new GalleryResp(id, List.of()));
        }
        List<ThumbnailItem> thumbnails = listImageResources().stream()
            .map(res -> new ThumbnailItem(res.getFilename(), encodeBase64(res)))
            .toList();
        return ResponseEntity.ok(new GalleryResp(id, thumbnails));
    }

    /**
     * 结构三：嵌套结构，采用 data URI 风格拆分 encoding / mediaType / data。
     *
     * @param id 文档标识。
     * @param scenario 演示场景：ready 返回 200，limited 返回 429。
     * @return 文档元信息与内容分离的嵌套响应体。
     */
    @Operation(summary = "获取文档内容（嵌套结构）", description = "演示元信息与 base64 内容分层嵌套返回")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "文档内容已就绪",
            headers = @Header(
                name = "X-Request-Id",
                description = "本次请求的追踪标识，排查问题时可提供此值",
                schema = @Schema(type = "string", example = "req_20260915_002")
            ),
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = DocumentResp.class)
            )
        ),
        @ApiResponse(
            responseCode = "429",
            description = "请求过于频繁",
            headers = @Header(
                name = "Retry-After",
                description = "建议客户端等待的秒数",
                schema = @Schema(type = "integer", minimum = "1", example = "30")
            ),
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ErrorResp.class)
            )
        )
    })
    @GetMapping(value = "/document/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getDocumentContent(
        @Parameter(description = "文档标识", example = "doc_3001")
        @PathVariable("id") String id,
        @Parameter(description = "用于切换示例，不是真实业务判断",
            schema = @Schema(allowableValues = {"ready", "limited"}))
        @RequestParam(value = "scenario", defaultValue = "ready") String scenario
    ) {
        if ("limited".equals(scenario)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "30")
                .body(new ErrorResp("rate.limit", "请稍后重试", false));
        }
        Resource image = requireFirstImage();
        String requestId = "req_" + UUID.randomUUID();
        ContentPayload content = new ContentPayload(
            "base64", guessMediaType(image.getFilename()), encodeBase64(image));
        DocumentResp body = new DocumentResp(id, image.getFilename(), content);
        return ResponseEntity.ok()
            .header("X-Request-Id", requestId)
            .body(body);
    }

    /**
     * 结构四：裸文本 base64，响应体本身即为一段 base64 字符串，不做 JSON 包裹。
     *
     * @param id 二维码所属标识。
     * @param scenario 演示场景：ready 返回 200，empty 返回 204。
     * @return 纯文本形式的 base64 编码内容。
     */
    @Operation(summary = "获取二维码原始 base64（纯文本）", description = "演示响应体直接就是 base64 字符串，非 JSON 结构")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "二维码已就绪，响应体为 base64 字符串",
            content = @Content(
                mediaType = MediaType.TEXT_PLAIN_VALUE,
                schema = @Schema(type = "string", example = "iVBORw0KGgoAAAANSUhEUgAAAAEA...")
            )
        ),
        @ApiResponse(
            responseCode = "204",
            description = "二维码尚未生成，无返回内容",
            content = @Content
        )
    })
    @GetMapping(value = "/qrcode/{id}", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getQrCodeRaw(
        @Parameter(description = "二维码所属标识", example = "order_4001")
        @PathVariable("id") String id,
        @Parameter(description = "用于切换示例，不是真实业务判断",
            schema = @Schema(allowableValues = {"ready", "empty"}))
        @RequestParam(value = "scenario", defaultValue = "ready") String scenario
    ) {
        if ("empty".equals(scenario)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(encodeBase64(requireFirstImage()));
    }

    /**
     * 对照示例：同一份图片以真实二进制（非 base64）形式返回，用于和以上结构对比。
     *
     * @param id 头像所属用户标识。
     * @return 原始图片字节流。
     */
    @Operation(summary = "获取用户头像（原始二进制，非 base64）", description = "演示与 base64 结构的对照：直接返回字节流")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "头像已就绪",
            content = @Content(mediaType = MediaType.IMAGE_PNG_VALUE)
        )
    })
    @GetMapping(value = "/avatar/{id}/raw")
    public ResponseEntity<byte[]> getAvatarBinary(
        @Parameter(description = "用户标识", example = "user_1001")
        @PathVariable("id") String id
    ) {
        Resource image = requireFirstImage();
        byte[] bytes = readBytes(image);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(guessMediaType(image.getFilename())))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + image.getFilename() + "\"")
            .body(bytes);
    }

    @Schema(description = "头像响应（单字段 base64）")
    public record AvatarResp(
        @Schema(description = "用户标识", example = "user_1001",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String id,
        @Schema(description = "图片 MIME 类型", example = "image/png",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String contentType,
        @Schema(description = "base64 编码后的图片数据", format = "byte",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String base64Data,
        @Schema(description = "编码前的原始字节数", example = "68")
        Integer sizeBytes
    ) {
    }

    @Schema(description = "缩略图列表响应（数组结构）")
    public record GalleryResp(
        @Schema(description = "相册标识", example = "album_2001",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String id,
        @Schema(description = "缩略图列表，可能为空数组",
            requiredMode = Schema.RequiredMode.REQUIRED)
        List<ThumbnailItem> thumbnails
    ) {
    }

    @Schema(description = "单张缩略图")
    public record ThumbnailItem(
        @Schema(description = "文件名", example = "cover.png",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String name,
        @Schema(description = "base64 编码后的图片数据", format = "byte",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String base64Data
    ) {
    }

    @Schema(description = "文档响应（元信息与内容嵌套分离）")
    public record DocumentResp(
        @Schema(description = "文档标识", example = "doc_3001",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String id,
        @Schema(description = "文件名", example = "cover.png",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String fileName,
        @Schema(description = "内容负载", requiredMode = Schema.RequiredMode.REQUIRED)
        ContentPayload content
    ) {
    }

    @Schema(description = "内容负载（data URI 风格）")
    public record ContentPayload(
        @Schema(description = "编码方式", example = "base64",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String encoding,
        @Schema(description = "内容的 MIME 类型", example = "image/png",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String mediaType,
        @Schema(description = "编码后的内容数据", format = "byte",
            requiredMode = Schema.RequiredMode.REQUIRED)
        String data
    ) {
    }

    @Schema(description = "错误响应")
    public record ErrorResp(
        @Schema(description = "业务错误码", example = "rate.limit") String code,
        @Schema(description = "错误说明", example = "请稍后重试") String msg,
        @Schema(description = "是否成功", example = "false") Boolean success
    ) {
    }
}