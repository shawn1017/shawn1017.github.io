# GitHub Pages 桌面版

这是 AI 实践工作台的纯静态桌面版本，部署在
`https://shawn1017.github.io/ai-practice-workbench/`。

- GitHub 只托管 HTML、CSS 和 JavaScript。
- 业务数据保存在当前浏览器的 `localStorage`，键名为
  `ai-practice-workbench.v1`。
- 静态版不会读取或修改 `prisma/dev.db`。
- 使用“数据与设置”中的 JSON 导入、导出在浏览器之间迁移数据。

从本地 SQLite 生成一次性迁移包：

```bash
pnpm db:export-browser
```

生成文件位于被 Git 忽略的 `backups/` 目录。打开线上静态版后，从“数据与设置”导入该 JSON 文件。
