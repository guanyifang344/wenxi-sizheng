# 温习 · 思想道德与法治

适用于 GitHub Pages 的静态复习网站。题库来自用户提供的《思想道德与法治》2026 期中考试复习题，共 203 道选择题：绪论 57 题、第一章 78 题、第二章 68 题。题目和答案保留原文，不自动改写或生成解析。

## 学习方式

- 按章节连续学习，不设固定轮次或每轮题数。
- 每次展示 3 道带答案的新题，再隐藏答案练习；之后穿插已经学过的题。
- 确定且答对计入本章进度，显示已通过题数和百分比。答错或不确定会重新进入待巩固状态，进度可能相应下降。
- 错题尽量间隔 3 道练习后重现；无足够间隔时留待下次。每次学习最多安排同一题 3 次作答，避免无限重试。
- 答对后按 1、3、7 天安排复习；同一天重复答对不会跳级。
- 各章分别保存学习位置，可以暂停或切换章节。首页包含全题库总进度。
- 数据保存在浏览器 localStorage，没有账号或云端同步。支持导出和恢复 JSON 进度备份；换设备时需手动迁移。

## 本地运行

无需安装第三方依赖。使用 Node.js 22+ 和 Python 3：

```sh
npm run dev
```

打开 http://127.0.0.1:4173 。不要直接双击 HTML 文件，题库通过 HTTP 加载。

```sh
npm test
npm run build
```

构建输出为 `dist/`，所有路径均为相对路径，兼容 GitHub Pages 的仓库子路径。

## GitHub Pages

`.github/workflows/pages.yml` 会在 `main` 分支推送时运行测试、生成静态文件并发布。仓库 Settings → Pages 的 Source 设置为 GitHub Actions。配置参考 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 更新题库

```sh
python3 scripts/import_questions.py '/path/to/question-bank.docx'
```

导入器使用 Python 标准库，针对本份文档的三章及答案格式进行解析，并校验题号连续、答案数量、选项标签与答案范围。输出 `data/questions.json`。不会将原始 Word 文档发布到网站。

题库结构修改后，应重新校验导入结果；学习进度使用稳定的章节、题型、题号作为标识，不应在未迁移进度的情况下重排原题号。
