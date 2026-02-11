# Poc_plan

## 1. PoC 目标
- 在同一个 3D 场景中稳定呈现两个真实 OpenClaw（`local` + `vps`）的运行状态。
- 能在场景中选择角色并对话，看到流式回复。
- 场景与 Telegram 保持双向同步（每个 agent 独立会话）。
- 用可量化指标证明“可继续产品化”。

## 2. 验收标准（Definition of Done）
- 首包延迟：场景发送消息后 `<= 3s` 出现首个流式 delta。
- 状态准确率：四态（`idle/thinking/running/error`）抽检准确率 `>= 95%`。
- 稳定性：连续运行 `30 分钟` 无崩溃、无消息明显丢失。
- 并发性：两个 agent 同时对话时不串会话、不串状态。

## 3. PoC 落地设计
### 3.1 分层架构
1. `apps/bff`（统一代理层）
- 连接本地和 VPS 两个 OpenClaw Gateway。
- 统一协议：把原始事件归一为前端可消费事件。
- 提供 WebSocket/SSE 给前端，并负责重连和错误隔离。

2. `apps/web`（场景层）
- Three.js 场景内维护两个 Actor（local/vps）。
- Actor 由状态机驱动动画与特效，不直接依赖原始 Gateway 字段。
- 聊天面板和场景联动，支持角色选择发送。

3. `packages/protocol`（共享协议层）
- 放统一类型、事件名、payload schema。
- 降低 BFF 与 Web 之间耦合，避免协议漂移。

### 3.2 统一事件模型
- `client.chat.send`：前端发送消息到指定 agent。
- `server.agent.state`：agent 四态变更。
- `server.chat.message`：完整消息（scene/telegram/agent 来源）。
- `server.stream.delta`：流式文本分片。
- `server.error`：错误和降级信息。

### 3.3 可视化映射规则（PoC 版）
- `idle`：角色待机呼吸。
- `thinking`：头顶轻粒子/光环。
- `running`：动作速度提升 + 脚下环。
- `error`：红闪 + 错误提示气泡。

## 4. 要完成的东西（按优先级）
### P0（先做，框架闭环）
- [ ] 初始化 monorepo 基础结构：`apps/web`、`apps/bff`、`packages/protocol`。
- [ ] 建立协议定义和最小 schema 校验。
- [ ] 跑通 mock 闭环：Web -> BFF -> Mock Agent -> Web（含流式 delta）。
- [ ] 加 `health` 与连接状态面板，便于联调。

### P1（PoC 核心能力）
- [ ] 接入本地 OpenClaw Gateway（真实消息和状态）。
- [ ] 接入 VPS OpenClaw Gateway（通过隧道或安全代理）。
- [ ] 双角色状态联动：local/vps 同时可视化。
- [ ] 完成并发对话验证：双 agent 同时工作不串流。

### P2（业务闭环）
- [ ] 接入 Telegram 入站并路由到对应角色会话。
- [ ] 支持场景消息回写 Telegram（防回环去重）。
- [ ] 完成 30 分钟稳定性测试并记录测试日志。

### P3（可后置）
- [ ] 替换更高质量角色模型与动画资源。
- [ ] 增加任务时间线与回放。
- [ ] 预研多人接入和权限边界。

## 5. 里程碑建议
- M1（第 1-2 天）：完成 P0，可本地演示最小闭环。
- M2（第 3-4 天）：完成 P1，双真实 agent 联通。
- M3（第 5-6 天）：完成 P2，Telegram 双向与稳定性报告。

## 6. 风险与应对
- Gateway 事件字段不一致：BFF 做版本容错适配层。
- Telegram 回写导致回环：增加 message id 去重与 source 标记。
- 网络抖动导致状态跳变：状态机增加超时回退和心跳兜底。
- PoC 过早追求视觉：锁定“稳定优先”，美术放在 P3。
