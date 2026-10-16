import {
  createWorkflowStep,
  type PrePostPhase,
  type WorkflowStep,
} from '../../src/features/playground/pre-post-types';

/** Creates editable workflows; endpoints and protocol fields must match the backend.
 * @param name Template identifier.
 * @param phase Target phase for the generated steps.
 * @returns New independent steps; no network request is issued.
 */
export function createWorkflowScenario(name: string, phase: PrePostPhase): WorkflowStep[] {
  if (name === 'captcha') {
    const request = {
      ...createWorkflowStep('request', phase),
      name: '获取验证码（填写接口地址）',
      trigger: 'manual' as const,
      endpoint: '',
      saveAs: 'captcha',
      previewPath: 'json.img',
      scope: 'flow' as const,
    };
    return [
      request,
      {
        ...createWorkflowStep('input', phase),
        name: '填写验证码后再发送',
        resultStepId: request.id,
        path: 'captchaCode',
      },
      {
        ...createWorkflowStep('write', phase),
        name: '写入验证码标识（调整响应路径）',
        source: 'flow',
        path: 'captcha.json.id',
        targetField: 'uuid',
        targetType: 'body',
      },
      {
        ...createWorkflowStep('write', phase),
        name: '写入验证码',
        source: 'flow',
        path: 'captchaCode',
        targetField: 'captcha',
        targetType: 'body',
      },
    ];
  }
  if (name === 'token')
    return [
      {
        ...createWorkflowStep('security', phase),
        source: 'response',
        path: '$.data.token',
        condition: { source: 'response', path: 'status', expected: '200' },
        name: '登录成功后回填认证（选择方案）',
      },
    ];
  return [
    {
      ...createWorkflowStep('script', phase),
      name: '分片上传完整流程（配置协议后手动运行）',
      trigger: 'manual',
      scriptCode: `// 这是独立的手动流程，不会额外发送主接口。按后端协议修改地址和字段。
const initUrl = "";
const partUrl = "";
const completeUrl = "";
nextdoc.assert(initUrl && partUrl && completeUrl, "请先配置初始化、分片和完成接口地址");
const file = nextdoc.files.get(); // 主请求 Body 中选择的 binary 或 form-data 文件
nextdoc.assert(file, "请先在 Body 中选择文件");
const init = await nextdoc.sendRequest({ url: initUrl, method: "POST", body: { size: file.size } });
const uploadId = init.json?.data?.uploadId;
nextdoc.assert(uploadId, "初始化未返回 uploadId，请调整响应路径");
nextdoc.flow.set("uploadId", uploadId);
const parts = [];
const chunkSize = 5 * 1024 * 1024;
for (let offset = 0; offset < file.size; offset += chunkSize) {
  const partNumber = parts.length + 1;
  const response = await nextdoc.sendRequest({
    url: partUrl + "?uploadId=" + encodeURIComponent(uploadId) + "&partNumber=" + partNumber,
    method: "PUT", body: file.slice(offset, offset + chunkSize)
  });
  const etag = response.headers.etag;
  nextdoc.assert(etag, "分片未返回可读取的 ETag，请检查协议与跨域响应头配置");
  parts.push({ partNumber, etag });
}
nextdoc.flow.set("uploadedParts", parts);
// 任一分片失败会中止脚本，不会调用完成接口。取消/清理接口需按后端协议自行配置。
return await nextdoc.sendRequest({ url: completeUrl, method: "POST", body: { uploadId, parts } });`,
    },
  ];
}
