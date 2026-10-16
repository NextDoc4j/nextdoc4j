package top.nextdoc4j.demo.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.PageResult;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.core.model.query.OperateLogAnalysisQuery;
import top.nextdoc4j.demo.core.model.query.OperateLogPageQuery;
import top.nextdoc4j.demo.core.model.query.OperateLogTimelineQuery;
import top.nextdoc4j.demo.core.model.req.log.OperateLogMarkReq;
import top.nextdoc4j.demo.core.model.req.log.OperateLogReplayReq;
import top.nextdoc4j.demo.core.model.req.log.OperateLogSaveReq;
import top.nextdoc4j.demo.core.model.resp.log.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Tag(name = "操作日志模块")
@RestController
@RequestMapping("/api/op-logs")
public class OperateLogController {

    @Operation(summary = "分页查询操作日志", description = "")
    @ApiError(code = "param.invalid", status = 400, reason = "查询参数不合法")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @GetMapping("/page")
    public R<PageResult<OperateLogSimpleResp>> page(@Valid OperateLogPageQuery query) {
        PageResult<OperateLogSimpleResp> result = new PageResult<>();
        result.setRecords(new ArrayList<>());
        result.setTotal(0L);
        result.setCurrent(query.getCurrent());
        result.setSize(query.getSize());
        result.setPages(0L);
        return R.ok(result);
    }

    @Operation(summary = "查询日志详情", description = "")
    @ApiError(code = "param.invalid", status = 400, reason = "日志ID不合法")
    @ApiError(code = "oplog.not.found", status = 404, reason = "操作日志不存在")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @GetMapping("/{id}")
    public R<OperateLogDetailResp> getById(@PathVariable Long id) {
        OperateLogDetailResp resp = new OperateLogDetailResp();
        resp.setId(id);
        return R.ok(resp);
    }

    @Operation(summary = "补录操作日志", description = "")
    @ApiError(code = "param.invalid", status = 400, reason = "请求参数不合法")
    @ApiError(code = "content.type.invalid", status = 400, reason = "日志内容类型不支持")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @ApiError(code = "server.error", status = 500, reason = "服务器内部错误")
    @PostMapping
    public R<OperateLogDetailResp> save(@Validated @RequestBody OperateLogSaveReq req) {
        OperateLogDetailResp resp = new OperateLogDetailResp();
        resp.setModule(req.getModule());
        resp.setBizType(req.getBizType());
        resp.setSuccess(req.getSuccess());
        resp.setBizNo(req.getBizNo());
        resp.setBizId(req.getBizId());
        resp.setRequestId(req.getRequestId());
        resp.setTraceId(req.getTraceId());
        resp.setOperatorId(req.getOperatorId());
        resp.setOperatorName(req.getOperatorName());
        resp.setRequestUri(req.getRequestUri());
        resp.setHttpMethod(req.getHttpMethod());
        resp.setHttpStatus(req.getHttpStatus());
        resp.setDurationMs(req.getDurationMs());
        resp.setIp(req.getIp());
        resp.setRegion(req.getRegion());
        resp.setUserAgent(req.getUserAgent());
        resp.setTenantId(req.getTenantId());
        resp.setOrgId(req.getOrgId());
        resp.setContent(req.getContent());
        return R.ok(resp);
    }

    @Operation(summary = "标记日志", description = "body 参数")
    @ApiError(code = "param.invalid", status = 400, reason = "请求参数不合法")
    @ApiError(code = "oplog.not.found", status = 404, reason = "部分日志不存在")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @PostMapping("/mark")
    public R<Void> mark(@Valid @RequestBody OperateLogMarkReq req) {
        return R.ok(null);
    }

    @Operation(summary = "标记日志", description = "query 参数")
    @ApiError(code = "param.invalid", status = 400, reason = "请求参数不合法")
    @ApiError(code = "oplog.not.found", status = 404, reason = "部分日志不存在")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @PostMapping("/mark2")
    public R<Void> mark2(@Valid  OperateLogMarkReq req) {
        return R.ok(null);
    }


    @Operation(summary = "重放请求", description = "req: OperateLogReplayReq, resp: R<OperateLogReplayResp>")
    @ApiError(code = "param.invalid", status = 400, reason = "请求参数不合法")
    @ApiError(code = "oplog.not.found", status = 404, reason = "源日志不存在")
    @ApiError(code = "replay.target.invalid", status = 400, reason = "重放目标不合法")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @ApiError(code = "replay.failed", status = 500, reason = "重放失败")
    @PostMapping("/replay")
    public R<OperateLogReplayResp> replay(@Valid @RequestBody OperateLogReplayReq req) {
        OperateLogReplayResp resp = new OperateLogReplayResp();
        resp.setReplayTaskId("REPLAY-20260413-0001");
        resp.setAccepted(true);
        resp.setStatus("SUCCESS");
        resp.setTarget(req.getReplayTarget());
        resp.setSteps(Collections.emptyList());
        return R.ok(resp);
    }

    @Operation(summary = "查询日志时间线", description = "")
    @ApiError(code = "param.invalid", status = 400, reason = "查询参数不合法")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @GetMapping("/timeline")
    public R<List<OperateLogTimelineResp>> timeline(@Valid OperateLogTimelineQuery query) {
        return R.ok(Collections.emptyList());
    }

    @Operation(summary = "日志统计分析", description = "")
    @ApiError(code = "param.invalid", status = 400, reason = "查询参数不合法")
    @ApiError(code = "forbidden", status = 403, reason = "无权限", bareContent = true)
    @ApiError(code = "server.error", status = -1, reason = "未知服务器错误")
    @GetMapping("/analysis")
    public R<OperateLogAnalysisResp> analysis(@Valid OperateLogAnalysisQuery query) {
        OperateLogAnalysisResp resp = new OperateLogAnalysisResp();
        resp.setTotalCount(0L);
        resp.setSuccessCount(0L);
        resp.setFailCount(0L);
        resp.setAvgDurationMs(0D);
        resp.setP95DurationMs(0L);
        resp.setModuleStats(Collections.emptyList());
        resp.setTrends(Collections.emptyList());
        return R.ok(resp);
    }

}