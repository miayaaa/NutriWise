# 用 Claude app 当生活助手（+ NutriWise connector）

## 第 1 步：Claude app 基础设置（零开发）

1. 手机装 Claude app，用同一个账号登录。
2. **Settings → Connectors**：连接 Gmail、Google Calendar、Google Drive。
3. **新建 Project「生活助手」**，把下面的 instructions 粘进去，把 `<>` 里的内容换成你自己的：

```
你是我的个人生活助手，回答用中文，简洁直接。

关于我：
- 时区：<Pacific/Auckland>。记录饮食/训练/体重时，loggedAt 一律用这个时区的本地时间并带 UTC 偏移。
- 目标：<减脂 / 增肌 / 维持>，目标体重 <xx kg>
- 作息：<几点起床、几点睡>
- 断食：<无 / 12:00–20:00 进食窗口>
- 训练：<每周几次、4 天分化周期>
- 饮食偏好/忌口：<...>

规则：
- 我说吃了/喝了/练了/称了体重 → 直接用 NutriWise 工具记录，然后一句话告诉我记了多少 kcal。记错了用 delete_food_log 撤销。
- 给任何饮食或训练建议前，先调用 get_today_summary，并遵守其中的优先级规则（热量不足先提醒营养，连续训练 ≥4 天先建议休息）。
- 热量估算有 ±20–40% 误差，看周趋势，不纠结单日数字。
- 涉及日程时查 Google Calendar；发邮件或改日历前先给我确认。
```

4. **每日简报**：在 Claude Code 里运行 `/morning`，把它设成工作日定时，或者在 app 里用定时任务。内容包括今天的日程、重要邮件、今天该练什么、昨天的摄入情况。

## 第 2 步：连接 NutriWise

NutriWise 提供了一个 remote MCP server：`https://<你的域名>/api/mcp`（OAuth 2.1 + PKCE，支持动态注册客户端）。

### 部署
- `pnpm build` 会自动执行 `prisma migrate deploy`，建出 3 张新表：`oauth_clients`、`oauth_codes`、`oauth_tokens`。这次迁移只新增表，不改动现有数据。
- 进度照片需要一个**私有** Vercel Blob store：Vercel 项目 → Storage → Create → Blob → Access 选 **Private**，并连接到这个项目。部署在 Vercel 上时会自动注入 `BLOB_STORE_ID`，通过 OIDC 认证，不需要手动配 token。Hobby 计划的免费额度是 1 GB。
- 本地开发如果没有 Blob 凭证，照片会存到 `.uploads/`（已加入 gitignore）。生产环境如果没连 Blob store，上传会直接报错。
- 除此之外不需要新的环境变量。

### 在 Claude 里添加
1. claude.ai → **Settings → Connectors → Add custom connector**
2. URL 填 `https://<你的域名>/api/mcp`，其余留空
3. 点 Connect → 跳转到 NutriWise 登录 → 确认页会显示回跳域名（应为 `claude.ai`），点 **Allow**
4. 在「生活助手」Project 里启用这个 connector

### 工具
| 工具 | 作用 |
|---|---|
| `get_today_summary` | 档案、今日饮食/饮水、6 天趋势、近期训练、生理周期、优先级提醒 + 教练规则（和 app 内 AI coach 同一套逻辑） |
| `log_food` | 记录饮食；没给热量时用 AI 估算；断食窗口外会先要求确认 |
| `delete_food_log` | 撤销一条饮食记录 |
| `log_workout` / `log_weight` / `log_water` | 记录训练 / 体重 / 饮水 |
| `get_insights` | 7/30/90 天总结与评分 |
| `get_progress_photos` | 某个角度的前后对比照（图片）+ 前后 ±3 天内记录的体重、腰围 |

### 安全说明
- access token 有效期 1 小时，refresh token 30 天，每次刷新都会轮换。数据库里只存 SHA-256 哈希。
- 授权码一次性使用、5 分钟过期，必须带 PKCE S256。
- 所有工具都只能访问已授权用户自己的数据。
- 撤销授权：在 Claude 里断开这个 connector；或者删除 `oauth_tokens` 表里属于你的记录，立即失效。
