# BYR Docs Wiki Print

为 [BYR Docs 维基真题](https://wiki.byrdocs.org) 试卷页提供打印选项的浏览器扩展，无需修改主站代码。

## 功能

- 右下角浮动打印按钮
- 默认插入主站右侧工具栏**最上方**（与原有按钮样式一致）
- **按住拖拽**可自由移动；拖回工具栏附近会自动吸附归位
- 位置保存在浏览器本地，下次打开仍保留
- `Ctrl/Cmd + P` 打开打印选项对话框（可在设置中关闭「仅扩展接管打印」以恢复主站行为）
- 可选是否打印试题概要信息（InfoBox）
- 可选是否打印答案（**默认统一放在最后**，也可选原题位置内联显示）
- **仅扩展接管打印**（默认开启）：拦截快捷键与主站打印按钮，避免两个打印对话框冲突
- 自动隐藏导航、工具栏、相关试卷等无关内容

## 支持的页面

- `https://wiki.byrdocs.org/exam/*`
- 本地开发预览 `http://localhost:4321/exam/*`

## 安装（开发者模式）

1. 构建扩展：

   ```bash
   cd byrdocs-wiki-print
   pnpm install
   pnpm build
   ```

2. 打开 Chrome → `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `dist/` 目录

Firefox：打开 `about:debugging` →「临时载入附加组件」→ 选择 `dist/manifest.json`。

### 设置

- 打印对话框内可切换「仅扩展接管打印」
- 或右键扩展图标 → **选项**，在设置页修改（两处同步）

## 开发

```bash
npm run watch    # 监听源码变更并自动构建到 dist/
npm run package  # 构建并打包为 release/byrdocs-wiki-print-v<version>.zip
```

修改后回到 `chrome://extensions/` 点击扩展的刷新按钮，或重新加载页面。

## CI 打包

推送到 `main` / `master` 时，GitHub Actions 会自动：

1. 运行 `npm run package`
2. 生成 `release/byrdocs-wiki-print-v<version>.zip` 并提交回仓库
3. 在 Actions 页面提供可下载的 artifact

PR 也会执行打包，但不会自动提交 zip。

## 与主站的关系

扩展在试卷页注入 UI。打印逻辑依赖主站已有的 DOM 结构：

- `.exam-page-main`、`.wiki-content`
- `.exam-blank`、`.exam-solution`、`.exam-choices`
- `window.__examState`（展开/收起答案）

主站 DOM 发生较大变更时，可能需要更新扩展版本。

## 许可证

MIT
