# GitHub Pages 待办桌面版

这是只记录待办事项和时间的纯静态桌面版本，部署在
`https://shawn1017.github.io/ai-practice-workbench/`。

- GitHub 只托管 HTML、CSS 和 JavaScript。
- 待办、时间、优先级、备注和字体设置保存在当前浏览器的 `localStorage`，键名为
  `ai-practice-workbench.v1`。
- 静态版不会读取或修改 `prisma/dev.db`。
- 使用“数据与设置”中的 JSON 导入、导出在浏览器之间迁移数据。
- 旧版迁移包导入时只读取任务；AI机会、内容、项目和复盘不进入新界面。
- 字体提供小号、标准、大号和超大四档全局缩放。

从本地 SQLite 生成一次性迁移包：

```bash
pnpm db:export-browser
```

生成文件位于被 Git 忽略的 `backups/` 目录。打开线上静态版后，从“数据与设置”导入该 JSON 文件。
