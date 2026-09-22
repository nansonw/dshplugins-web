# 🐋 DSH Plugin Hub

**DeepSeek Harness (DSH) 官方插件市场** —— 实时同步 GitHub `dsh-plugin` 生态，智能分类、多维度搜索、一键安装。

<p align="center">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DeepSeek-Harness-6366f1?style=flat-square&logo=github" alt="Official Repo"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/Plugins-15000+-34d399?style=flat-square" alt="Plugins"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
</p>

## ✨ 功能亮点

- 🔍 **实时数据**：定时同步 GitHub `dsh-plugin` 话题，浏览器端自动刷新星标数据
- 🗂️ **智能分类**：10 大分类（UI 增强 / Agent 编排 / 记忆知识 / 视觉多模态 / 开发工具 / 数据搜索 / 集成迁移 / 效率工具 / 娱乐彩蛋 / 安全治理）
- 🔎 **多维筛选**：分类 + 排序（Stars/Forks/更新时间）+ 关键词搜索 + 快捷筛选
- 🏆 **排行榜**：Top 10 高星插件
- 📦 **一键安装**：复制 `dsh plugin add github:owner/name` 命令即可安装
- 🌗 **暗/亮主题**：自动适配系统偏好，支持手动切换
- ⌨️ **快捷键**：`⌘K` / `Ctrl+K` 快速聚焦搜索
- 🌐 **中文翻译**：英文描述一键翻译为中文

## 🚀 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/dsh-plugin-hub.git
cd dsh-plugin-hub

# 启动静态服务器（任选其一）
python -m http.server 8080
# 或
npx serve web
```

浏览器打开 `http://127.0.0.1:8080` 即可。

### 生成插件数据

```bash
# 首次同步（需要 Node.js 18+）
node scripts/sync.mjs

# 使用 GitHub Token 提升配额（推荐 CI 环境）
GITHUB_TOKEN=ghp_xxx node scripts/sync.mjs
```

## 📁 目录结构

```
.
├── web/                    # 站点源码（纯静态）
│   ├── index.html          # 主页
│   ├── styles.css          # 样式（含暗/亮主题）
│   ├── app.js              # 应用逻辑
│   └── plugins.json        # 数据快照（sync.mjs 生成）
├── scripts/
│   └── sync.mjs            # 数据同步脚本
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages 自动部署
└── README.md
```

## 🛠️ 技术架构

- **零依赖纯静态站**：HTML + CSS + 原生 JS，无需构建工具，可直接托管
- **GitHub API 实时同步**：使用 GitHub Search API 获取 `topic:dsh-plugin` 数据
- **浏览器缓存**：30 分钟缓存 + 定期刷新星标数据
- **智能分类**：基于关键词匹配的自动分类算法

## 📖 使用指南

### 安装插件

1. 在网站上找到目标插件
2. 点击插件卡片查看详情
3. 复制安装命令，在 DSH 终端执行：

```bash
dsh plugin --profile web add github:owner/name
```

### 搜索技巧

| 关键词 | 说明 |
|--------|------|
| `视觉` / `vision` | 图像识别、OCR 相关插件 |
| `记忆` / `memory` | 跨会话记忆、知识库 |
| `agent` / `multi-agent` | 多 Agent 协作工具 |
| `desktop` / `tui` | 桌面/TUI 增强 |
| `workflow` | 工作流编排 |

## 🔄 数据源

- GitHub 话题：https://github.com/topics/dsh-plugin
- 官方仓库：https://github.com/deepseek-ai/deepseek-harness
- 插件总数：15,000+（实时变化）

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE)

## 🙏 致谢

感谢所有为 DeepSeek Harness 生态贡献插件的开发者！

---

*本页面为社区项目，与 DeepSeek 官方无直接关联。*
