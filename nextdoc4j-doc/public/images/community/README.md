# 社区二维码

页面使用仓库已有的真实二维码，仅裁去海报外围装饰并保留二维码及周围空白，不缩放、不重绘码点。原始文件继续保留。

| 文件 | 来源（相对 `public/images`） | 裁剪范围（left / top / width / height） |
| --- | --- | --- |
| `maintainer-wechat.png` | `contact/wechat-user.png` | `71 / 322 / 964 / 964` |
| `sponsor-alipay.png` | `paymentcode/alipay-qr.jpg` | `243 / 709 / 694 / 694` |
| `sponsor-wechat.png` | `paymentcode/wechat-qr.jpg` | `276 / 428 / 728 / 728` |

裁剪结果以 PNG 无损保存，深浅模式共用同一份素材，保持白底与原始码色。页面引用由 `scripts/team/team.config.ts` 维护。

个人微信用于添加维护者，再由维护者邀请入群；不展示有有效期的群二维码。赞助使用对应支付平台的收款二维码，与个人微信好友码分开。
