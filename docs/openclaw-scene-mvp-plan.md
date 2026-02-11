# OpenClaw 双 Agent 游戏场景化 MVP 方案（本地 Web + 统一后端代理）

## 1. 摘要
- 目标：在一个 Three.js 场景中，把 `local-macos` 和 `vps` 两个 OpenClaw agent 具像化为两个角色，实现“可视化状态 + 实时对话 + Telegram 双向同步”。
- 可达成程度（按已选偏好）：先做稳定可用的 `MVP`，2 周左右可到“日常可用”；后续可迭代到协作编排和高沉浸演出。
- 已确认可行性依据（官方 Gateway 协议能力）：支持 WebSocket 连接握手、`send/agent` 方法、`agent/presence/tick` 事件流。参考 [Gateway Runbook](https://docs.openclaw.ai/gateway)。

## 2. 已锁定决策（不再留给实现者）
- 第一目标：`可用对话 + 状态可视化`，不是先追求复杂演出。
- 运行形态：`本地 Web 应用`。
- Telegram：`双向同步`。
- 状态粒度：`四态`（idle/thinking/running/error）。
- 协作模式：`手动驱动`（不做自动分工）。
- 连接拓扑：`统一后端代理（BFF）`，前端不直连 Gateway。
- 部署范围：`第一版仅本机运行`。
- 美术：`先用现成 GLB`。
- 场景操作：`发消息 + 查看状态`（不做中断/回放）。
- Telegram 映射：`每个 agent 独立会话`。
- 验收倾向：`稳定优先`。

## 3. 系统架构（实现级）
1. 前端（`apps/web`）
- 技术：`Vite + React + @react-three/fiber + @react-three/drei + Zustand`。
- 责任：3D 场景渲染、角色状态动画、聊天面板、连接状态提示。
- 连接：仅连接 BFF 的单一 WebSocket。

2. 统一后端代理（`apps/bff`）
- 技术：`Node.js 20 + Fastify + ws`。
- 责任：
  - 维护两个 Gateway WS 连接（local/vps）。
  - 统一事件模型（归一化 agent/telegram/source）。
  - 向前端推送统一事件流。
  - 接收前端消息并路由到目标 agent。
  - 处理断线重连、节流、错误隔离。
- 安全：Gateway token 与 Telegram 凭据只保存在 BFF `.env`，不下发浏览器。

3. OpenClaw 接入
- local agent：直连 `ws://127.0.0.1:<local_port>`。
- vps agent：通过 `SSH tunnel` 映射到本地端口后再连（避免公网裸露 Gateway）。
- 会话策略：每个 agent 固定一个 `scene session key`，确保 Telegram 与场景能汇入同一上下文。

4. Telegram 同步策略（MVP）
- 入站（Telegram -> 场景）：由 Gateway 事件进入 BFF，再转发到前端对应角色。
- 出站（场景 -> Telegram）：场景消息发给 agent 运行，同时由 BFF 执行“回写镜像”到对应 Telegram 会话，保持双向可见。

## 4. 公共接口 / 类型（新增契约）
1. BFF WebSocket（浏览器 <-> BFF）
- `client.chat.send`
```json
{ "type":"client.chat.send", "agentId":"local|vps", "text":"...", "clientMsgId":"uuid" }
```
- `server.agent.state`
```json
{ "type":"server.agent.state", "agentId":"local|vps", "state":"idle|thinking|running|error", "ts": 1739250000000 }
```
- `server.chat.message`
```json
{ "type":"server.chat.message", "agentId":"local|vps", "role":"user|assistant|system", "source":"scene|telegram|agent", "text":"...", "msgId":"...", "ts":1739250000000 }
```
- `server.stream.delta`
```json
{ "type":"server.stream.delta", "agentId":"local|vps", "runId":"...", "delta":"..." }
```
- `server.error`
```json
{ "type":"server.error", "agentId":"local|vps", "code":"...", "message":"..." }
```

2. 内部类型（`packages/protocol`）
- `AgentId = "local" | "vps"`
- `AgentState = "idle" | "thinking" | "running" | "error"`
- `MessageSource = "scene" | "telegram" | "agent"`
- `UnifiedEvent`：所有网关/telegram 事件归一后的统一结构（必须带 `agentId + ts + traceId`）。

## 5. 3D 表现与交互规范（第一版固定）
- 角色绑定：左侧固定 `local`，右侧固定 `vps`。
- 四态映射：
  - idle：站立呼吸动画，低亮度。
  - thinking：头顶轻微粒子旋转。
  - running：动作加速 + 环形进度光圈。
  - error：短时红色闪烁 + 错误气泡。
- 交互：点击角色激活聊天输入，消息发送到该角色。
- UI：右侧聊天面板显示按 agent 分组的双会话流。

## 6. 里程碑与交付物
1. M0（0.5 天）环境连通
- 打通 local/vps Gateway 连接、token 验证、隧道脚本。
- 交付：`/health` 显示双端在线状态。

2. M1（2 天）BFF 事件总线
- 完成 Gateway 双连接、事件归一、前端 WS 推送、重连策略。
- 交付：命令行可看到统一事件日志流。

3. M2（2 天）3D 场景与四态动画
- 完成双角色加载、状态驱动动画、基础 HUD。
- 交付：mock 事件可驱动完整视觉状态切换。

4. M3（2 天）真实对话闭环
- 完成场景发消息 -> agent 流式回复 -> 场景展示。
- 交付：两角色均可独立对话。

5. M4（2 天）Telegram 双向同步
- 完成 Telegram 入站显示和场景消息回写。
- 交付：任一侧发消息，另一侧可见。

6. M5（1 天）稳定性与发布
- 2 小时 soak test、异常恢复、日志完善。
- 交付：可日常使用的 MVP 包与运行文档。

## 7. 测试与验收场景
1. 单元测试
- 事件归一函数：不同 source 输入映射正确。
- 状态机 reducer：四态切换无非法跳转。
- 去重策略：重复事件不会重复渲染。

2. 集成测试
- 模拟两个 Gateway WS：并发流式回复不串会话。
- 断线恢复：任一 Gateway 断开后 10 秒内自动重连。
- Telegram 桥接：入站/出站映射到正确 agent。

3. E2E 场景
- 选中 local 角色发送消息，3 秒内出现流式首包。
- Telegram 发送到 vps，会在场景 vps 会话出现。
- 连续 2 小时每 30 秒发一条消息，无崩溃、无明显内存增长。

4. MVP 验收标准
- 状态准确率：> 95%（人工抽检任务状态）。
- 可用性：双 agent 均可稳定对话。
- 稳定性：2 小时持续运行通过。

## 8. 仓库结构与质量约束（按 AGENTS.md）
- 目录建议：`apps/web`、`apps/bff`、`packages/protocol`、`packages/shared`。
- 每层文件数尽量不超过 8，超出则拆子目录。
- TS/JS 单文件尽量不超过 200 行。
- 防坏味道策略：
  - 用 `packages/protocol` 消除重复类型（避免冗余/脆弱性）。
  - 前端只消费统一事件，避免耦合 Gateway 原始协议（防僵化/晦涩）。
  - BFF 采用 adapter 分层（gateway-local/gateway-vps/telegram）避免循环依赖。

## 9. 关键风险与默认处理
- 风险：不同 OpenClaw 版本事件字段差异。
  - 默认：BFF 做“版本容错解析 + 字段兜底”。
- 风险：Telegram 回写语义与现有路由冲突。
  - 默认：先采用“每 agent 独立 Telegram 会话”，不用 `@路由`。
- 风险：公网暴露 Gateway。
  - 默认：仅本机 + SSH 隧道，不直接暴露端口。
- 风险：3D 资源过重导致卡顿。
  - 默认：GLB 控制在轻量级，首版锁定 60fps 优先。

## 10. 明确假设（若不成立需先调整）
- 两端 OpenClaw Gateway 均可正常运行并可提供 token。
- 你可在本机建立到 VPS 的 SSH 隧道。
- Telegram 渠道已在各自 Gateway 配置并可收发消息。
- 第一版不要求“自动任务分工”与“任务回放”。
