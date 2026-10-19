# StuTool · 家教工作台

高二**数学** / **化学**家教记录网站，带密码保护。

- 双入口：数学、化学
- 每次课：教案 + 课堂记录 + 课后总结
- 学习进度总览（自动汇总）
- 密码门（挡住搜索引擎和随手浏览）

---

## 目录结构

```
tutor/
├── index.html           首页（数学/化学两个入口，密码门保护）
├── math.html            数学专区（课次列表 + 学习进度）
├── chem.html            化学专区（课次列表 + 学习进度）
├── lesson-*.html        每节课的页面（编译生成，不要手改）
├── posts/               ← 你写课次的地方（Markdown 源文件）
│   ├── template.md      课次模板（复制它写新的一节）
│   ├── math-lesson-01.md
│   └── chem-lesson-01.md
├── css/style.css        样式
├── js/main.js           密码门 + 交互
├── build.js             编译脚本（node build.js）
└── README.md            本文件
```

---

## 编译通道：怎么记录一节课

1. 复制 `posts/template.md`，改成有意义的名字，比如 `posts/math-lesson-02.md`；
2. 改顶部 `---` 之间的元信息：

   ```yaml
   title: 第2课 · 数列求和
   date: 2026-09-27
   subject: math      # 数学填 math，化学填 chem
   topic: 数列求和
   ```

3. 用 Markdown 写三节内容，小标题固定用这三个：
   - `## 教案`
   - `## 课堂记录`
   - `## 课后总结`
4. 在 `tutor/` 目录运行：

   ```
   node build.js
   ```

5. 脚本会自动：
   - 生成课次页面 `lesson-math-lesson-02.html`
   - 更新首页数学/化学的课次统计
   - 更新对应专区的课次列表和学习进度

---

## 密码

- 当前密码：`123456`
- 改密码方法：把新密码的 **fnv1a** 哈希值填到 `js/main.js` 的 `PASSWORD_HASH` 里（让我帮你算，或者用下面的方法）
  - 已知旧密码是 123456，对应哈希 `9b97f868`
  - 换密码时把 `main.js` 里的 `9b97f868` 替换成新值即可

> 说明：密码是纯前端的，能挡住搜索引擎和随手浏览的人，但挡不住专业看源码破解。对家教场景够用。

---

## 本地预览

双击 `index.html` 打开，输入密码 `123456` 即可。

---

## 部署到 GitHub Pages（让家长孩子访问）

和 KAzuLink 一样的方式：

1. 新建仓库（比如 `stu-tool`），把 `tutor/` 里的文件上传；
2. 仓库 Settings → Pages → Source 选 main 分支根目录；
3. 访问 `https://你的用户名.github.io/stu-tool/`。

> 需要部署时跟我说一声，我帮你创建仓库和推送。
