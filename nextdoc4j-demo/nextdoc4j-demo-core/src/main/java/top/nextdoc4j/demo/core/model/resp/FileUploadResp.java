package top.nextdoc4j.demo.core.model.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "文件上传响应参数")
public class FileUploadResp {

    @Schema(description = "原始文件名", example = "avatar.jpg")
    private String originalName;

    @Schema(description = "存储文件名", example = "abc123_avatar.jpg")
    private String fileName;

    @Schema(description = "文件大小（字节）", example = "1024000")
    private Long fileSize;

    @Schema(description = "文件类型", example = "image/jpeg")
    private String contentType;

    @Schema(description = "文件访问URL", example = "https://cdn.nextdoc4j.top/files/abc123_avatar.jpg")
    private String url;

    @Schema(description = "上传时间", example = "2024-01-01T12:00:00")
    private LocalDateTime uploadTime;
}