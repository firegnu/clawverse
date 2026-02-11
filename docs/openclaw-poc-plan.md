# OpenClaw 可视化场景 PoC 计划

这个 PoC 的目标是先验证“真实双 OpenClaw agent 可被同一 3D 场景稳定驱动并可对话”，优先可用性和稳定性，不追求完整产品化。实现思路是先打通最小闭环：`BFF 统一事件层 -> Web 场景展示层 -> 双 agent 消息回路`，并用可量化验收标准判断是否进入下一阶段。

## Scope
- In:
- 在 `/Users/firegnu/Developer/personal_projs/claw-playground` 内完成可运行 PoC 骨架（`apps/bff` + `apps/web`）。
- 在场景中同时展示 `local` 与 `vps` 两个角色，并实时显示四态：`idle/thinking/running/error`。
- 支持从场景向指定 agent 发消息，并在场景中看到流式回复。
- 完成最小 Telegram 双向同步验证（每个 agent 对应独立会话）。
- 定义 PoC 验收目标：首包延迟、状态准确率、短时稳定性。
- Out:
- 不做自动任务分工/多 agent 编排。
- 不做复杂美术资产与高保真动画系统。
- 不做生产级鉴权、配额、租户隔离。
- 不做移动端适配与长期回放系统。

## Action items
[ ] 明确 PoC 验收目标并固化为文档（首包延迟 < 3s、状态准确率 > 95%、连续运行 30 分钟无崩溃）。  
[ ] 设计并确认统一事件协议（`client.chat.send`、`server.agent.state`、`server.chat.message`、`server.stream.delta`、`server.error`）并落到 `/Users/firegnu/Developer/personal_projs/claw-playground/docs/openclaw-scene-mvp-plan.md` 的 PoC 子节。  
[ ] 搭建 `/Users/firegnu/Developer/personal_projs/claw-playground/apps/bff` 最小服务骨架（健康检查、前端连接入口、双 agent 路由占位）。  
[ ] 搭建 `/Users/firegnu/Developer/personal_projs/claw-playground/apps/web` 最小场景骨架（双角色、状态灯、聊天面板、角色选择发送）。  
[ ] 打通端到端最小链路：场景发消息 -> BFF -> 指定 agent -> 流式回传 -> 场景渲染。  
[ ] 接入 Telegram 最小双向链路（Telegram 入站显示到对应角色、场景出站可回写对应会话）。  
[ ] 执行 PoC 验证清单（功能验证、断线重连验证、30 分钟稳定性验证）并记录结果。  
[ ] 输出 PoC 结论与下一阶段建议（继续产品化所需补强项、风险与优先级）。  

## Open questions
- 你的两个 OpenClaw 当前可用的 Gateway 地址与鉴权方式是否已经固定（本地直连、VPS 走隧道）？  
- Telegram 双向同步在 PoC 阶段是否需要“严格去重”（防止回写后再次触发镜像）？  
- PoC 验收后你希望优先进入哪条路线：`多人接入` 还是 `场景交互增强`？
