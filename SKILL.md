---
name: bringppttest
description: BRING/薄云 branded PowerPoint generator test skill for ChatGPT agents. Use for any request to convert Word/DOCX, Markdown, reports, outlines, uploaded attachments, storyboard JSON, or slides-data JSON into a BRING-style .pptx deck with templates, QA, validation, and repair. Trigger on bringppttest, $bringppttest, bringppt, 薄云PPT, BRING PPT, 附件转PPT, Word转PPT, docx转PPT, 报告转PPT, storyboard转PPT, outline转PPT, deck QA.
---
# BRINGPPT — 薄云咨询 PPT 生成规范

**版本**：v4.1.11 (2026-05-18) | **生态**：bring-bot@2.1.0 → bringppt-storyboard@2.2.0 → bringppt@4.1.11
**状态**：91 个顶咨级模板 + `freeform` 真 vm 沙箱 + 顶咨色系全 token 化 + LAYOUT_TOP/LAYOUT_BOTTOM 守护框全模板生效 + Google Drive 原样上传契约 (`upload_file_to_drive`)，通过外部 `upload-file-to-drive` v1.0.0 插件上传

## Top Priority: ChatGPT Agent Builder 生产硬约束

以下规则优先级高于后续所有工作流规则。

当用户要求生成、转换、修改、校验 PPT/PPTX，尤其是 Word/DOCX/Markdown/报告/附件/大纲/storyboard/slides-data 转 PPT 时，必须优先使用本 skill。测试时请显式使用 `$bringppttest`。

只有进入 PPT 生产、转换、校验或 bringppt 诊断任务时，第一行必须输出：

`BRINGPPT_SKILL_MOUNTED`

如果当前只是需求澄清、故事线设计、大纲生成、页面文案优化，不要输出 `BRINGPPT_SKILL_MOUNTED`，也不要进入 PPT 生产。

### 禁止行为

1. 不要绕过 bringppt 手写 `create_ppt.js`、`create_bring_deck.js` 或类似脚本生成 PPT。
2. 不要只使用通用 `slides` / `docx` skill 兜底生成 PPT。
3. 不要只拼接或读取通用 `slides` / `docx` 的 `SKILL.md` 后自行生成 deck。
4. 不要在未确认 bringppt 已挂载时继续生成 PPT。

### 允许行为

1. 可以使用 `python-docx`、zip/xml、pandoc 或其他普通工具读取 DOCX 内容。
2. 通用 `docx` 能力只能用于读取源文档内容，不能替代 bringppt 生成 PPT。
3. 通用 `slides` 能力只能在 bringppt 明确不可用且用户同意兜底时使用。

### 执行流程

1. 先确认 bringppttest skill 已加载；若未加载，停止并回复 `BRINGPPT_NOT_MOUNTED`。
2. 读取用户上传的附件，提取标题、章节、表格、关键结论和可视化要点。
3. 将内容整理为 BRINGPPT storyboard JSON，避免逐段堆砌 Word 原文。
4. 在 bringppttest skill 根目录运行 pipeline。优先使用 `/root/.codex/skills/hermes/bringppttest`；若该路径不存在，自动查找包含 `SKILL.md` 和 `package.json`，且 `SKILL.md` 中 `name: bringppttest` 的实际目录。
5. 运行 `npm run pipeline -- --input <storyboard.json> --project-dir <workdir> --verbose`。
6. 生成后必须运行 `npm run validate:all -- <slides-data.json>` 或等效校验命令。
7. 若 `validate:all` 出现 ERROR，必须修正 storyboard 或数据后重跑；WARN 可以记录，但不阻断交付。
8. 最终只交付生成的 `.pptx`，不交付 storyboard、临时图片、渲染中间件或脚本。
9. 最终回复必须说明页数、输出路径、validate 是否有 ERROR、WARN 数量。

### Google Drive 默认归档硬约束

所有通过 bringppttest 生成的 PPTX，除非用户明确说“不上传 Google Drive”“只本地交付”或等价表达，都必须在 `validate:all` 无 ERROR 后原样上传到 Google Drive 默认目录：

- folder name: `Bring AI Workspace/AI Output/PPT`
- folder id: `10cQkBoa86WdwdlUSEZsebQao1wh_gz2O`
- MIME type: `application/vnd.openxmlformats-officedocument.presentationml.presentation`

执行规则：

1. 只上传原始 `.pptx` 文件，保持 PPTX MIME type。
2. 不要转换为 Google Slides，除非用户明确要求转换格式。
3. 如果 pipeline 已配置 `BRINGPPT_UPLOAD_COMMAND`，使用 pipeline 自动上传结果。
4. 如果 pipeline 只输出 `uploadRequest` JSON，必须继续调用可用的 Google Drive 上传工具，把该 `.pptx` 原样上传到默认目录或用户指定目录。
5. 如果用户提供 `destination_folder_id` 或 `destination_folder_url`，优先上传到用户指定目录。
6. 如果当前环境没有 Google Drive 上传工具、未授权或上传失败，不要重新生成 PPT；保留本地 `.pptx`，并在最终回复中明确说明 Drive 上传未完成及失败原因。
7. 最终回复必须说明：本地 PPTX 路径、Google Drive 文件名、目标文件夹、上传是否成功、validate ERROR/WARN。

### 挂载诊断命令

```bash
pwd
find /root/.codex/skills -maxdepth 5 -type f -name SKILL.md -print 2>/dev/null || true
find /root/.codex/skills -maxdepth 6 \( -type f -o -type d \) -iname '*bring*' -print 2>/dev/null || true
find /home/oai/skills -maxdepth 5 -type f -name SKILL.md -print 2>/dev/null || true
find /home/oai -maxdepth 6 \( -type f -o -type d \) -iname '*bring*' -print 2>/dev/null || true
```

## v4.1.9 Google Drive 原样上传契约（`upload_file_to_drive`）

按用户提供的 OpenAPI 规格（`google-drive-upload-openapi.yaml` + `google-drive-upload-interface-spec.md`），bringppt 生成 `.pptx` 后会**产出符合 OpenAPI `UploadFileToDriveRequest` 的请求 JSON**；若环境变量 `BRINGPPT_UPLOAD_COMMAND` 已配置真实上传器，则 pipeline 会直接执行原样上传（不走 Google Slides 转换链路），否则仅打印契约 hint。

> 默认情况下，bringppt 只负责构造调用 JSON 与文档化错误代码集；若已配置真实上传器，则由该适配器负责上传和返回 Drive 结果。

### 接口规格摘要

- **接口名**：`upload_file_to_drive`（不再叫 `import_presentation`）
- **行为**：把本地 `.pptx` 原样上传到指定 Google Drive 文件夹，保持 PPTX MIME type
- **不做格式转换**，不走 Google Slides 导入链路
- **目标文件夹是一等参数**，未显式指定时才走默认或 `My Drive`

### Agent 默认 folder 配置

```json
{
  "default_ppt_output_folder_id":   "10cQkBoa86WdwdlUSEZsebQao1wh_gz2O",
  "default_ppt_output_folder_name": "Bring AI Workspace/AI Output/PPT"
}
```

### 目录优先级（高 → 低）

| 优先级 | 来源 | OpenAPI 字段 |
|---|---|---|
| 1 | CLI `--destination-folder-id` / `run({ destinationFolderId })` | `destination_folder_id` |
| 2 | CLI `--destination-folder-url` / `run({ destinationFolderUrl })` | `destination_folder_url` |
| 3 | 环境变量 `BRINGPPT_DEFAULT_FOLDER_ID` | — |
| 4 | `meta.destinationFolderId` / `meta.destinationFolderUrl` | — |
| 5 | Agent 默认 `10cQkBoa86WdwdlUSEZsebQao1wh_gz2O` | — |
| 6 | `My Drive`（由 `upload_file_to_drive` 工具自行兜底） | — |

> 兼容：旧版 `--folder <id|url>` 仍可用，自动识别是 ID 还是 URL。

### CLI 用法

```bash
# 默认 folder（10cQkBoa86WdwdlUSEZsebQao1wh_gz2O / Bring AI Workspace/AI Output/PPT）
node ppt-pipeline.js --input storyboard.json

# 显式指定 destination_folder_id
node ppt-pipeline.js --input storyboard.json --destination-folder-id 1AbcDefXYZ

# 显式指定 destination_folder_url（插件内部解析为 id）
node ppt-pipeline.js --input storyboard.json \
  --destination-folder-url "https://drive.google.com/drive/folders/1AbcDefXYZ"

# 冲突策略（默认 keep_both）
node ppt-pipeline.js --input storyboard.json --on-conflict replace
```

### 输出的请求 JSON（严格按 OpenAPI `UploadFileToDriveRequest`）

pipeline 在生成 `.pptx` 后会在 stdout 打印：

```json
{
  "source_file":           "/absolute/path/to/output.pptx",
  "title":                 "演示文稿-2026-05-18.pptx",
  "destination_folder_id": "10cQkBoa86WdwdlUSEZsebQao1wh_gz2O",
  "mime_type":             "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "on_conflict":           "keep_both"
}
```

### 错误代码集（OpenAPI `DriveUploadError.error_code` enum）

| 错误代码 | 触发场景 |
|---|---|
| `SOURCE_FILE_NOT_FOUND` | 本地 `.pptx` 不存在或不可读 |
| `INVALID_DESTINATION_FOLDER` | `destination_folder_id` 或 `destination_folder_url` 无效 |
| `DESTINATION_ACCESS_DENIED` | 对目标目录没有写权限 |
| `UPLOAD_FAILED` | 上传过程失败 |
| `FILE_CONFLICT` | 同名文件已存在且 `on_conflict: fail` |
| `DESTINATION_VERIFICATION_FAILED` | 上传成功但最终 parent 与请求不一致 |

> 这些错误由 `upload_file_to_drive` 工具返回。bringppt 仅在构造请求时校验 `destination_folder_url` 解析（解析失败抛 `INVALID_DESTINATION_FOLDER`）。

### 外部 Drive Upload Adapter 集成

按 RFC `rfc-bringppt-drive-upload-adapter.md`，bringppt 自 v4.1.11 起把 Drive 上传 adapter **外置为独立插件 `upload-file-to-drive` v1.0.0**，bringppt 端只保留 `lib/upload-adapter.js`（通过 spawnSync 调用 `BRINGPPT_UPLOAD_COMMAND` 的客户端代码）。

**插件仓库：** `./../upload-file-to-drive/`（与 bringppt 同级）

**启用方式：**

```bash
# 0. 先安装独立插件（解压 zip 或 git clone）
unzip upload-file-to-drive-v1.0.0.zip -d /opt/
chmod +x /opt/upload-file-to-drive/bin/upload-file-to-drive.js

# 1. 设置 OAuth token（任选其一）
export GOOGLE_OAUTH_TOKEN="ya29.xxx"
# 或：export GOOGLE_SERVICE_ACCOUNT_JSON='{"client_email":"...","private_key":"..."}'
# 或：export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json

# 2. 告诉 bringppt 使用该 adapter
export BRINGPPT_UPLOAD_COMMAND=/opt/upload-file-to-drive/bin/upload-file-to-drive.js

# 3. 正常生成 PPT — bringppt 会自动调用 adapter 上传
node ppt-pipeline.js --input storyboard.json
# stdout 会输出真实的 UploadFileToDriveResponse JSON（含 fileId / parent_ids / destination_verified）
```

**Adapter 执行流程：**

1. 从 stdin 读取 `UploadFileToDriveRequest` JSON
2. 校验本地文件存在、destination_folder_id 有效且可写
3. 处理 `on_conflict`（`fail` 检查同名 / `replace` 删旧文件 / `keep_both` 直接上传）
4. 调用 Google Drive API `files.create`（multipart upload，保留 PPTX MIME）
5. 调用 `files.get` 校验 `parents` 含 `destination_folder_id`
6. 输出 `UploadFileToDriveResponse` JSON 到 stdout，含 `destination_verified: true`
7. 失败时 exit 非零 + 输出 `DriveUploadError` JSON

**支持的错误代码**（全部对应规格 § 12.2 enum）：
`SOURCE_FILE_NOT_FOUND / INVALID_DESTINATION_FOLDER / DESTINATION_ACCESS_DENIED / UPLOAD_FAILED / FILE_CONFLICT / DESTINATION_VERIFICATION_FAILED / MISSING_CREDENTIALS / INVALID_REQUEST`

**安全：** adapter 不在日志/stdout 打印 token；启用 `BRINGPPT_UPLOAD_DEBUG=1` 才输出 stderr 调试信息。

**直接用 adapter（独立调用）：**

```bash
echo '{
  "source_file": "/abs/path.pptx",
  "destination_folder_id": "10cQkBoa86WdwdlUSEZsebQao1wh_gz2O",
  "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "on_conflict": "keep_both"
}' | /opt/upload-file-to-drive/bin/upload-file-to-drive.js
```

### 响应结构（OpenAPI `UploadFileToDriveResponse`）

`upload_file_to_drive` 工具成功后返回：

| 字段 | 说明 |
|---|---|
| `fileId` | Drive 文件 ID |
| `title` | 最终文件名 |
| `mimeType` | 应保持为 `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `url` | 文件访问链接 `https://drive.google.com/file/d/<fileId>/view` |
| `parent_ids` | 最终父目录 ID 列表 |
| `parent_names` | 最终父目录名称列表（如 `["Bring AI Workspace/AI Output/PPT"]`） |
| `destination_verified` | 是否确认已进入预期目录（**关键校验字段**） |

### Slides skill 边界声明

> **如果任务只是把 `.pptx` 文件存入 Google Drive 文件夹，不属于 Google Slides 工作流**，应交由 Google Drive 文件上传能力（`upload_file_to_drive`）处理。Google Slides skill 不参与这类任务，不应被调用做 .pptx → Slides 转换。

### 代理调用约定（默认行为）

生成 PPT 后，**代理应默认把 pipeline 输出的 `uploadRequest` JSON 喂给 `upload_file_to_drive` 工具**，让 PPT 落进默认 Drive folder。除非：

1. 用户显式说"只下载到本地，不上传 Drive"，或
2. 用户提供了 `destination_folder_id` / `destination_folder_url`，则改用用户提供的值

**若已执行真实上传器调用，代理必须**（按规格 § 八-7 验收标准）：

1. **校验 `destination_verified === true`** — 确认文件已落入预期目录
2. **比对 `parent_ids[0]` 与请求的 `destination_folder_id`** — 必须一致
3. **明确告知用户**：
   - 成功：上传文件名 + Drive 链接 + 所在文件夹路径（`parent_names`）
   - 失败：`error_code` + `message`，**不要静默回退到本地**
   - 部分成功（`DESTINATION_VERIFICATION_FAILED`）：明确指出"文件已上传但 parent 不匹配，实际在 `parent_ids[0]`"，并请求用户确认是否要把文件移动到目标目录

`run()` 返回结构含 `uploadRequest`；若已配置真实上传器，还会包含 `uploadResponse`。

## v4.1.8 第二次审计 12 项全修

修 v4.1.7 第二次审计发现的 P1+P2+P3 共 12 项 + chartRadar 数据覆盖：

- **chartRadar 多 series 数据覆盖** — 按 sum 排序 + 50% 半透明，两条数据均可见
- **chartRadar 图例右侧化** — `legendPos: 'b'→'r'`，不再侵入 X 轴标签与 KEY INSIGHT
- **chartBar X 轴 0.45" buffer** — 强制 X 轴标签与底部装饰带分离
- **cloudConcept 字号自适应** — desc 字符数动态 10→8pt + `shrinkText`
- **caseBox 自动撑高** — h 未给时 `Math.max(1.2, available × 0.85)`，消除底部留白
- **字段命名分裂统一**：
  - gauge zones.color 关键字 → hex 映射（green/orange/red/blue/gray）
  - twoColumnCards 接 cards / left+right / leftItems+rightItems / 字符串/数组多形
  - stepList / iconList / layeredList / styled-table 每模板 4-6 alias
- **riskMatrix 圆圈 0.36→0.28 + dodge 0.22→0.36** — 同格数字不再重叠
- **dualTrackTimeline 无 desc 时 title 居中** — 消除 60% 卡片留白
- **content-slide minFontSize 18→14** — 极端长 title 仍单行不撞装饰带
- **6 list-type 模板空数组兜底** — checklist/iconList/cardGrid/threeColumn/comparison/styledTable 空数组显示友好"数据缺失"卡
- **`_contentMaxBottom` / `_layoutBottom` 字段统一** — getLayoutBox 取 min，setLayoutBottom 同步两字段，60 旧模板无回归

## v4.1.7 健康审计修复

修 v4.1.6 健康审计发现的 P0+P1+P2+P3 共 13 项：

- **[P0] hero-section MODULE NN 字形丢失** — `align:'center' + charSpacing:2` 在 LibreOffice 把"01"推出右边缘，章节页全显示 `MODULE :` / `MODULE (`。拆成两个 text box（MODULE + NN）左对齐独立定位
- **[P1] chart 顶部留白过多** — chart-bar/radar/scatter/bubble 居中时按 chartH*0.80 补偿 chart 自带 ~25% 内边距
- **[P1] 视觉基线 v4.1.6 重生成** — `tests/visual-baseline-88.json` 跟随 v4.1.6 26 模板变更刷新，calloutAnnotation 自动移除
- **[P1] 60 未改造旧模板纳入守护框** — `resolveStartY` 增加 `_layoutTop` 钳制，所有路径自动保护，无需逐模板改造
- **[P1] 多 layout 堆叠 styledTable 负值** — pipeline 检测 ≥3 layout 同页时按层均分守护带，每个 layout 拿到独立 [top,bottom]
- **[P1] TOC 右下 CONTENTS 装饰字超界** — classic 风格 charSpacing 6→4 + fontSize 36→32 + 宽度钳制
- **[P1] stepList 4/5 步对比度过低** — 04/05 编号 BLUE_PALE/INFO_GRAY 改回 PRIMARY/SECONDARY 循环
- **[P1] meceLayout 数字+单位 wrap 失控** — `calcFitFontSize + wrap:false` 强制 4500w 单行
- **[P1] caseBox 后 1.5" 空白** — `startY=3.5` 写死改为 box 居中
- **[P2] SKILL.md / template-fields.md 同步** — 版本号、模板数 92→91 全统一
- **[P2] 高错率模板宽容解析** — stepList(actions/milestones/items), comparison(pros/cons/before/after/optionA/optionB), dataHighlight(numbers/metrics/stats/kpis)
- **[P3] _contentMaxBottom 与 _layoutBottom 二元统一** — pipeline 注入时同步两个字段（已在 v4.1.6 实现，本次显式确认）
- **[P3] bump.js 视觉基线提醒** — bump 结尾打印必须运行 `npm run test:visual:88:update` 提示

## v4.1.6 layout 守护框 + 纵向居中

- LAYOUT_TOP=1.20 / LAYOUT_BOTTOM=4.85（含 banner 时 4.40）；BANNER_TOP=4.45/BANNER_BOTTOM=4.85
- `getLayoutBox(slide)` 统一接口返回 `{top, bottom, available}`
- `centerYInBox(top, bottom, contentH)` 居中辅助
- 26 核心模板已纳入：ansoffMatrix / orgChart / waveProgression / ganttChart / chainFlow / compositeLayout / keywordHighlight / iconList / threeColumn / twoColumnCards / comparison / stepList / cardGrid / layeredList / dataHighlight / chartBar / styledTable / chartRadar / chartScatter / chartBubble / quadrantMatrix / colorMatrix / moduleOverview / phasedGantt / timelineWithMetrics / heroClosing
- layout overflow 从 v4.1.5 的 24 次 → 0 次

## v4.1.4 健康审计修复

修 v4.1.3 健康审计发现的 P0/P1/P2 共 11 项：

- **[P0] freeform 真 vm 沙箱** — 用 `node:vm` 替代 `new Function` 参数遮蔽，杜绝 `({}).constructor.constructor('return process')()` 逃逸路径；5 秒 timeout 防死循环
- **[P1] insightBanner overflow 误报修复** — banner 自己 render 前重置 `_contentMaxBottom = 4.8`，告别 4.79 vs 4.15 误报
- **[P1] 4 高错误率模板宽容解析** — stepList / comparison / iconList / layeredList 入口检测 `items/bullets/points/layers/levels` alias 字段
- **[P1] contract-test 全量真实 infra** — 替换手搓 mock，消除 GRID 等字段缺失导致的 render 抛错
- **[P1] freeform 友好失败卡片** — `addFriendlyFailureCard` 区分 freeform / 普通模板文案
- **[P1] 长 keyPoint 截断** — `_normalizeKeyPoint` 出口 > 200 字截到 180 + "…" + INFO 日志
- **[P1] heroSection 紧贴 + MODULE 缺号** — 标题→英文副标题 +0.12 缓冲；MODULE box 收紧 + charSpacing 4→2
- **[P2] 39 个僵尸模板标注** — `references/template-fields.md` 新增"实验性模板"段落
- **[P2] 6+ 统计孤儿 alias** — `registry.js` / `lib/layout-map.js` LEGACY_ALIAS：causalChain/chartLine/chartPie/chartCombo/radialHub/cycleDiagram/imageText/imageGallery → 当前模板
- **[P2] styledTable 自动截断** — 行数 > 8 时保留前 7 行 + 备注"完整数据见附录"
- **[P2] SKILL.md 同步** — 版本号 + 历史小节统一

## v4.1.1~v4.1.3 已稳能力

- **v4.1.3**：对象形 keyPoints 全链兼容（_normalizeKeyPoint 总闸 + helpers 三件套对象分支 + stakeholderMap 数组对象消费）；hero-section 长标题三档自适应；freeform 无 fallback 时 rethrow 接管
- **v4.1.2**：beforeAfter 文字溢出蓝底框修复；stakeholderMap 标签与箭头错位修复；24 模板 `_hasContentTitle` 跳过自画标题
- **v4.1.1**：渲染失败友好咨询师风格提示卡（取代 stack trace）；iconList desc 多档自适应 + 截断；ppt-pipeline graceful 模式 schema 错误降为警告

## v4.1.0 一致性大清扫

- **converter god switch 删除**：storyboard-converter.js 从 1019 → 418 行（删 600 行死代码，91/91 模板全走自己的 fromKeyPoints）
- **`_bottomY` 接力契约扩到 ~70%**（14/91 → 60/85 content layout 模板）：彻底解决"下方 KEY INSIGHT 与上层 layout 错位"复发风险
- **模板色板硬编码归零**：14 模板 27 处 hex 字面量 → 全部走 `infra.C.*`，客户主题色一次切换即生效
- **schema spec 写法统一**（min/max/item + optional:true），selector 容错代码砍 50%
- **冷启动懒加载**：registry 改为 metadata-first，render 函数 lazy require，启动从 ~300ms 降一半
- **错误信息咨询师视角**：selector / converter warn 文本带具体修复建议，ChatGPT 重试次数下降
- **字段速查表**：`references/template-fields.md` 全模板字段 + 长度阈值速查
- **release 门禁**：audit-bottom-y / 视觉回归基线纳入 check-release，PR 级阻塞

## v4.0.6-v4.0.9 累计

- **色板对标顶咨标准**：PRIMARY 002F6C navy / ACCENT D4A14B 真金 / BRICK 9C2B1A 砖红 / CHART_BLUE 1F4E79 图表中蓝 / TEXT 333333 / BG_PAPER F5F1E8 暖纸底
- **STEP_COLORS 纯蓝梯度**（仅 1 处点睛）；`STEP_HIGHLIGHTS = {gold, brick}` 按需调用
- **`takeaway` 字段** 在标题下方渲染"so what"一句话，字号自适应
- **`insightBanner` minimal 样式**：4pt 金/砖红竖线 + 大写小字标签 + 黑字（顶咨 KEY INSIGHT 装饰带）

> **takeaway vs insightBanner 使用边界**（v4.1.1 文档统一）：
> - `takeaway` 永远渲染在**标题下方**，斜体小字一句话，告诉读者"so what"（决策点）
> - `insightBanner` 永远作为页面**底部 B 类 layout**，深蓝/砖红条形带 + 大写英文标签
> - 二者**可同时使用**：takeaway 在上（决策点），insightBanner 在下（KEY INSIGHT 装饰带）
> - 不要在 page 级 `insightBanner` 字段里塞 takeaway 文案（位置规则不会切换）


- **`proposal` variant**：`meta.variant: 'proposal'` 切 serif + 暖纸底（客户级提案）
  - **限制（v4.1.1 明确）**：variant **仅支持 meta 级**全局开关，**不支持 page 级**（页内单页传 `variant: 'proposal'` 无效）。若需局部页面用 serif，可拆成两份 storyboard 分别生成后合并
- **heroCover** 删 PROPOSAL + BRING 白 logo 移到左下页脚（封面↔正文统一品牌位）
- **dataHighlight 长描述不截断**：desc 字号 13→11→10→9pt 多行 wrap
- **章节脚标 + Source line 自动渲染**，与 logo 中线对齐
- **ppt-pipeline 预留 banner 空间**：检测到 insightBanner 时设 `slide._contentMaxBottom = 4.15`

## 累计修复（v4.0.0 → v4.0.6）

- 12 个 P1-P3 缺陷修复（4-A 至 4-I + 3 项色系）
- 2 个软删除模板（journeyMap / quadrantMap）
- 11 模板空值守卫 + 4 模板字段 alias
- 6 项视觉升级（色板 / source line / section footer / proposal variant / hero 宋体 / takeaway+insight）
- audit-bottom-y.js 脚本可重复扫描 _bottomY 合规
- 端到端验证：stress-test (98 页) / health-test (44 页) / LiquidEdge storyboard (28 页)

## v4.0.0 重大变更（Breaking Changes）

1. **删除冗余/低质量模板**（22 个）：
   - A 类淘汰：`cover` → 已被 `heroCover` 替代；`section` → 已被 `heroSection` 替代
   - B 类淘汰：`bcgMatrix`、`bigNumber`、`bridgeChart`、`causalChain`、`chartArea`、`chartBar3D`、`chartCombo`、`chartLine`、`chartPie`、`costStructure`、`cycleDiagram`、`imageGallery`、`imageText`、`linkList`、`pestelAnalysis`、`porterFiveForces`、`radialHub`、`sparkline`、`valueChain`、`waterfall`
   - **向后兼容**：`storyboard` 顶层和 `chapter.pages` 中显式声明的 `type:'cover'` / `type:'section'` 会被自动重映射到 `heroCover` / `heroSection`，无需手工迁移
2. **新增 `freeform` 逃生舱**：当现有模板无法承载特殊视觉时，可直接传 pptxgenjs 渲染代码（沙箱执行 + fallback 兜底）
3. **软删除机制**：`registry.js` 现在静默跳过 `module.exports = null` 的模板文件，便于将来淘汰
4. **B 类保留亮点**：`dataHighlight`、`chartBar`、`productMatrix`、`quadrantMap`、`compositeLayout`、`lineupCompare`、`timelineWithMetrics`、`constraintCheck` 等顶咨级版式全部保留

## 推荐入口

BRINGPPT 只负责把已确认的 storyboard / slides-data 生成 `.pptx`。交付方式由外部系统决定，本 skill 不再内置外部发送配置。

团队成员在 ChatGPT Business 中想显式调用时，推荐这样说：

- `使用 $bringppt，把这份已确认大纲生成 BRING 风格 PPTX，并完成 QA。`
- `用 bringppt 将这个 storyboard 转成薄云咨询 PPT。`
- `调用 bringppt 检查并修复这份 BRING 风格 PPT 生成问题。`

```bash
npm run doctor
npm run doctor:visual   # 仅在需要视觉回归时运行；会做真实 PPTX→PDF→hash smoke test
npm run pipeline -- --input /tmp/storyboard.json --output /tmp/output.pptx --verbose
```

调试时才允许使用 `--skip-validate` 或 `--skip-learning`；正式交付必须保留默认质量门禁与学习上下文读取。pipeline 成功后会记录模板使用统计，供学习系统和周报使用。

## 快速参考

| 任务 | 方法 |
|---|---|
| 环境诊断 | `npm run doctor` |
| 视觉诊断 | `npm run doctor:visual` |
| storyboard 一键生成 | `npm run pipeline -- --input storyboard.json --output output.pptx` |
| 手工装配 | 复制 `gen_ppt_template.js` 到项目 `_temp/`，读取 `_temp/slides-data.json` |
| storyboard 字段 | 阅读 `docs/STORYBOARD-SCHEMA.md` |
| 模板 API | 阅读 `docs/bring-templates.md` |
| 版式选择 | 阅读 `references/template-selection.md` |
| 空间预算 | 阅读 `references/space-budget.md` |
| 视觉规范 | 阅读 `references/visual-design.md` |
| 子代理提示 | 阅读 `references/sub-agent-prompt.md` |
| 学习系统 | 阅读 `references/learning-system.md` |
| 验证 | `npm run validate:all -- _temp/slides-data.json` |
| 清理 | `npm run clean` |
| 打包运行包 | `npm run prepack:skill -- /tmp/bringppt-staging` |
| 打包开发包 | `npm run prepack:skill -- /tmp/bringppt-dev-staging --with-dev` |

## A 类页面模板（v4.0.0 精简）

storyboard 支持的页面级 `type` 值（从 registry 自动派发，新增 A 类模板时 0 处手工改）：

| type 值 | 说明 | 关键字段 |
|---|---|---|
| `heroCover` | Hero 封面（左色块标题 + 右建筑大图，客户提案首页）。**取代 v3 `cover`** | `title`、`titleEn`、`subtitle`、`clientName`、`date`、`reporter`、`image` |
| `heroSection` | Hero 章节首页（左侧 220pt 巨型章节号 + 右侧大字标题）。**取代 v3 `section`** | `sectionNumber`、`sectionTitle`、`sectionTitleEn`、`sectionSubtitle`、`accent` |
| `toc` | 目录页 | `items`、`style`（list / grid / sidebar） |
| `closingQuote` | 收尾金句页 | `quote`、`author`、`source`、`label`、`labelEn` |
| `backCover` | 封底页（仿 01 模板 P157，仅 thank-you + 二维码 + 联系方式） | `text`（默认"谢谢各位"）、`subtitle`、`instructor`、`dateLine`、`contact`、`qrCode` |
| `contentSlide` | 内容页底座（搭配 B 类 layout 装配） | `title`、`sectionTag`、`engagementQuestion`、`sourceRef` |

> 旧版 `cover` / `section` 仍可写在 storyboard 中，转换器会自动重映射，但建议在新项目中直接使用 hero 版本。

## 逃生舱：`freeform`（v4.0.0 新增）

当现有模板都不合适，可在 layout 中使用 `type:'freeform'`：

```json
{
  "type": "freeform",
  "data": {
    "renderCode": "slide.addText('Hello', {x:1, y:1, w:8, h:1, fontSize:36, color:infra.C.PRIMARY});",
    "fallback": { "type": "twoColumnCards", "data": { "cards": [{ "title": "A", "content": "..." }] } }
  }
}
```

- `renderCode` 在沙箱中执行：可访问 `pres / slide / data / infra`，禁止 `require / process / eval / Function / setTimeout`
- `renderFn`（函数引用，仅程序化调用时可用）优先级高于 `renderCode`
- **强烈建议提供 `fallback`**：脚本抛错时降级到指定模板，避免页面空白
- **v4.1.1 新增 `safeStartY` / `safeMaxBottom` 常量**：沙箱内已注入，分别为 `1.2` 和 `4.8`
  - **必须用 `safeStartY` 作为绘图起点 y**，否则会撞系统已画的标题（标题 y=0.30，底 ~0.95）
  - 例如：`slide.addText('内容', {x:1, y:safeStartY, w:8, h:1, fontSize:18})`

## 工作流

1. 先输出大纲草稿并等待用户确认，不要收到主题后直接生成 PPT。
2. 用户确认后，将内容转换为 storyboard JSON 或 `_temp/slides-data.json`。
3. 正式数据层必须使用 JSON；禁止手工拼接可执行 `slides-data.js`。
4. 运行默认 pipeline 或 `npm run validate:all -- _temp/slides-data.json`。
5. 生成 `.pptx` 后检查尺寸必须为 16:9：

```bash
unzip -p output.pptx ppt/presentation.xml | grep -o '<p:sldSz[^>]*>'
# 必须包含: cx="9144000" cy="5143500"
```

## 数据层规则

BRINGPPT 有 **两种数据格式**，对应不同入口：

| 格式 | 顶层结构 | 谁写 | 入口 |
|---|---|---|---|
| **storyboard**（高层、章节化） | `{ meta, chapters[].pages[].keyPoints[] }` | 用户 / 子代理写大纲时 | `npm run pipeline -- --input storyboard.json` |
| **slides-data**（底层、扁平+layouts） | `{ meta, slides[].layouts[] }` | storyboard-converter 自动产出；或熟练用户手写 | `node gen_ppt_template.js`（slides-data 在 `_temp/` 旁） |

> 字段全表见 `docs/STORYBOARD-SCHEMA.md`（storyboard）和 `docs/bring-templates.md`（各 layout 的 schema）。

### 入口 1：storyboard（推荐多数场景）

```json
{
  "meta": { "title": "演示文稿", "author": "薄云咨询", "includeToc": true },
  "chapters": [
    {
      "sectionTitle": "章节一",
      "sectionNumber": 1,
      "pages": [
        {
          "id": "p1",
          "title": "页面标题",
          "keyPoints": ["要点一: 说明文字", "要点二: 说明文字"]
        }
      ]
    }
  ]
}
```

转换器会按要点条数与 contentType 自动选版式（threeColumn / twoColumnCards / stepList …），并生成 slides-data 作为中间产物。

### 入口 2：直接手写 slides-data（精确控制版式）

```json
{
  "meta": { "title": "演示文稿", "author": "薄云咨询", "outputPath": "./output.pptx" },
  "slides": [
    { "id": "cover", "type": "cover", "title": "标题", "subtitle": "副标题" },
    {
      "id": "p1",
      "type": "content",
      "title": "页面标题",
      "layouts": [
        { "type": "twoColumnCards", "data": { "cards": [
          { "title": "要点一", "content": "说明文字" },
          { "title": "要点二", "content": "说明文字" }
        ] } }
      ]
    }
  ]
}
```

**注意：把 slides-data 喂给 `npm run pipeline` 会报错**——pipeline 强校验 `{meta, chapters}`。slides-data 走 `gen_ppt_template.js` 渲染。

### 共同约束

- 正式交付使用 JSON；禁止手工拼接可执行 `slides-data.js`。
- 兼容旧项目可读 `slides-data.js`，但不得把用户/文档来源内容拼接进可执行 JS。若必须输出 JS，只能使用 `JSON.stringify(data, null, 2)` 导出纯对象。

## Speaker notes 已禁用

不要生成、校验或写入每页 PPT 注释。即使输入数据中包含旧版 `notes` 字段，生成器也会忽略，不会写入 PPTX 注释。

## 核心规则

**Rule 0 — 自包含系统**  
禁止引用外部 PPT 模板文件和外部设计规范文档。所有视觉规范以本 skill 为准。

**Rule 1 — 内容忠实性**  
页面数量、页面标题和主要内容必须来自源文档或已确认大纲；不得凭空新增页面、标题、数据或论断。

**Rule 2 — 版式选择匹配内容量**  
最终版式必须通过 schema validation。2 个要点优先使用 `twoColumnCards`、`comparison`、`dualPanel` 或 `stepList`，不得落入要求 3 项的 `threeColumn`。

**Rule 3 — 反信息丢失**  
版式无法承载内容量时，优先换更高容量版式、组合版式或拆分多页，不得直接删减源内容。

**Rule 4 — 文字超框处理优先级**  
先扩大文本框，再缩小字体，最后才精简文本。

**Rule 5 — 关键数据突出**  
关键数字、百分比和金额用 `dataHighlight` 或 `quoteBanner` 突出展示，避免埋在普通摘要中。

**Rule 6 — 禁止大面积空白**  
内容区不得出现超过约 30% 的无意义空白。空白过多时增加内容结构、换版式或拆页。

**Rule 7 — 多版式叠加必须做空间预算**  
同页叠加多个 B 类版式前，参考 `references/space-budget.md` 计算 startY、h 与安全底边。

## QA

```bash
npm run validate -- _temp/slides-data.json
npm run validate -- --content _temp/slides-data.json
npm run validate -- --visual _temp/slides-data.json
npm run validate -- --stats _temp/slides-data.json
```

`--content` 只检查描述文字密度与 enrichment 字段，不再检查 speaker notes。

v3.7.5 起，验证错误默认写入运行态学习库，帮助团队复盘重复踩坑。CI、草稿或测试数据可用 `--no-record-learning` / `--no-learn` 关闭：

```bash
node validate-slides.js --content --visual --no-record-learning _temp/slides-data.json
```

## 自学习系统

- 默认读取 skill 内置学习默认值和 `~/.bringppt/learning` 运行态数据。
- 设置 `BRINGPPT_LEARNING_DIR=/path/to/learning` 可按项目隔离。
- 设置 `BRINGPPT_LEARNING_DISABLED=1` 可只读运行。
- pipeline 生成前会读取学习上下文并记录访问；成功生成后记录 `generation-stats`。验证器默认记录 ERROR，草稿/测试请显式关闭写入。
