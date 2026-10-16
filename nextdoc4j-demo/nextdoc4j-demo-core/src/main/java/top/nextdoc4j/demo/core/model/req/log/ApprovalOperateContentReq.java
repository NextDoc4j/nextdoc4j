package top.nextdoc4j.demo.core.model.req.log;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "审批日志内容")
public class ApprovalOperateContentReq {

    @Schema(description = "内容类型", example = "APPROVAL", requiredMode = Schema.RequiredMode.REQUIRED)
    private String type;

    @Schema(description = "审批单号", example = "AP202604130001")
    private String approvalNo;

    @Schema(description = "审批节点", example = "财务复核")
    private String nodeName;

    @Schema(description = "审批动作", example = "APPROVE", allowableValues = {"APPROVE", "REJECT", "TRANSFER", "CANCEL"})
    private String action;

    @Schema(description = "审批意见", example = "同意，通过")
    private String comment;

    @Schema(description = "下一审批人", example = "李四")
    private String nextApproverName;
}