#!/usr/bin/env node
/**
 * StuTool 编译脚本
 *
 * 用法：在 tutor 目录下运行  node build.js
 *
 * 作用：
 *   1. 读取 posts/*.md（每节课一个 Markdown 文件）
 *   2. 生成课次页面 lesson-{slug}.html
 *   3. 更新 index.html 的数学/化学入口统计
 *   4. 更新 math.html / chem.html 的课次列表与学习进度
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');

const SUBJECTS = {
  math: { name: '数学', icon: 'fa-square-root-variable' },
  chem: { name: '化学', icon: 'fa-flask' },
};

// ============================================================
// 工具函数（Markdown 渲染）
// ============================================================

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
      i++;
      html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++; continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
        i++;
      }
      html.push('<ul>' + items.join('') + '</ul>');
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
        i++;
      }
      html.push('<ol>' + items.join('') + '</ol>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const parts = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(renderInline(lines[i].replace(/^>\s?/, '')));
        i++;
      }
      html.push('<blockquote>' + parts.join('<br>') + '</blockquote>');
      continue;
    }

    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
    if (img) {
      html.push(
        `<figure class="figure"><img src="${img[2]}" alt="${escapeHtml(img[1])}"><figcaption class="caption">${escapeHtml(img[1])}</figcaption></figure>`
      );
      i++; continue;
    }

    if (line.trim() === '') { i++; continue; }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4}\s|```|>\s?|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i]) &&
      !/^!\[([^\]]*)\]\(([^)]+)\)$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) html.push('<p>' + renderInline(para.join(' ')) + '</p>');
  }

  return html.join('\n');
}

function parseFrontMatter(src) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const kv = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) return;
    const key = kv[1];
    let val = kv[2].trim();
    if (key === 'tags') {
      val = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    }
    meta[key] = val;
  });
  return { meta, body: src.slice(m[0].length) };
}

// 按 "## 章节" 把正文切成若干块
function splitByH2(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = { title: '', lines: [] };
  for (const line of lines) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      if (current.title || current.lines.some((l) => l.trim())) sections.push(current);
      current = { title: m[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.title || current.lines.some((l) => l.trim())) sections.push(current);
  return sections;
}

// ============================================================
// 模板
// ============================================================

function pageShell(p) {
  const subjectMeta = SUBJECTS[p.subject];
  const blocks = splitByH2(p.body);
  const blockHtml = blocks.map((sec) => {
    const cls = p.subject === 'chem' ? 'block chem' : 'block';
    const h2 = sec.title ? `<h2>${escapeHtml(sec.title)}</h2>` : '';
    return `<div class="${cls}">${h2}\n${renderMarkdown(sec.lines.join('\n'))}\n        </div>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(p.title)}">
  <title>${escapeHtml(p.title)} · StuTool</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <header class="navbar">
    <div class="container">
      <div class="brand">
        <a href="index.html">
          <span class="brand-icon"><i class="fas fa-book-open"></i></span>
          <span>StuTool</span>
        </a>
      </div>
      <ul class="nav-menu">
        <li><a href="index.html"><i class="fas fa-house"></i><span>首页</span></a></li>
        <li><a href="math.html"><i class="fas fa-square-root-variable"></i><span>数学</span></a></li>
        <li><a href="chem.html"><i class="fas fa-flask"></i><span>化学</span></a></li>
      </ul>
    </div>
  </header>

  <main class="container lesson-page">
    <div class="lesson-header">
      <span class="lesson-badge ${p.subject}">${subjectMeta.name}</span>
      <h1>${escapeHtml(p.title)}</h1>
      <div class="lesson-sub">
        <span><i class="fas fa-calendar"></i> ${p.date}</span>
        ${p.topic ? `<span><i class="fas fa-bookmark"></i> ${escapeHtml(p.topic)}</span>` : ''}
      </div>
    </div>

    <div class="lesson-content">
        ${blockHtml}
    </div>

    <div class="lesson-note">
      <i class="fas fa-rotate"></i> 本课记录随上课进度持续更新 · 最后更新于 ${p.date}
    </div>
  </main>

  <footer>
    <p>StuTool · 高二数学与化学家教记录</p>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>
`;
}

function lessonCard(p) {
  return `        <a class="lesson-card" href="lesson-${p.slug}.html">
          <div class="lesson-meta">
            <span><i class="fas fa-calendar"></i>${p.date}</span>
            ${p.topic ? `<span><i class="fas fa-bookmark"></i>${escapeHtml(p.topic)}</span>` : ''}
          </div>
          <h3>${escapeHtml(p.title)}</h3>
          <p class="lesson-topic">教案 · 课堂记录 · 课后总结</p>
        </a>`;
}

function progressItem(p) {
  return `          <div class="progress-item">
            <div class="p-top">
              <span class="p-title">${escapeHtml(p.title)}</span>
              <span class="p-date">${p.date.slice(5)}</span>
            </div>
            <div class="progress-bar"><i style="width:100%"></i></div>
          </div>`;
}

// ============================================================
// 主流程
// ============================================================

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('找不到 posts/ 目录，请在 tutor/ 下运行本脚本');
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && f !== 'template.md');
  const lessons = files.map((f) => {
    const src = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const { meta, body } = parseFrontMatter(src);
    if (!meta.title || !meta.date || !meta.subject) {
      console.error(`  ✗ ${f} 缺少 title / date / subject（front matter 必填）`);
      process.exit(1);
    }
    if (!SUBJECTS[meta.subject]) {
      console.error(`  ✗ ${f} 的 subject 必须是 math 或 chem`);
      process.exit(1);
    }
    const slug = meta.slug || f.replace(/\.md$/, '');
    return { ...meta, slug, body };
  });

  lessons.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 1. 生成课次页
  const generated = [];
  for (const p of lessons) {
    fs.writeFileSync(path.join(ROOT, `lesson-${p.slug}.html`), pageShell(p), 'utf8');
    generated.push(`lesson-${p.slug}.html`);
  }

  // 2. 更新 index.html 入口统计
  const indexPath = path.join(ROOT, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  for (const key of Object.keys(SUBJECTS)) {
    const n = lessons.filter((p) => p.subject === key).length;
    indexHtml = indexHtml.replace(
      new RegExp(`(<span class="num" data-stat="${key}-count">)\\d+(</span>)`),
      `$1${n}$2`
    );
  }
  fs.writeFileSync(indexPath, indexHtml, 'utf8');

  // 3. 更新 math.html / chem.html
  for (const key of Object.keys(SUBJECTS)) {
    const pagePath = path.join(ROOT, `${key}.html`);
    let html = fs.readFileSync(pagePath, 'utf8');
    const list = lessons.filter((p) => p.subject === key);

    const listHtml = list.length
      ? list.map(lessonCard).join('\n\n')
      : '        <p class="progress-empty">还没有课次记录，先用 posts/ 里的模板写第一节。</p>';
    html = replaceBetween(html, '<!-- LESSONS_START -->', '<!-- LESSONS_END -->', '\n' + listHtml + '\n        ');

    const progHtml = list.length
      ? list.map(progressItem).join('\n')
      : '          <p class="progress-empty">暂无进度</p>';
    html = replaceBetween(html, '<!-- PROGRESS_START -->', '<!-- PROGRESS_END -->', '\n' + progHtml + '\n          ');

    fs.writeFileSync(pagePath, html, 'utf8');
  }

  // 4. 输出
  console.log('✅ 编译完成');
  console.log(`   课次总数：${lessons.length}（数学 ${lessons.filter(p => p.subject === 'math').length} / 化学 ${lessons.filter(p => p.subject === 'chem').length}）`);
  console.log('   生成页面：');
  generated.forEach((g) => console.log('     - ' + g));
  console.log('   已更新：index.html、math.html、chem.html');
}

function replaceBetween(html, startMark, endMark, newContent) {
  const start = html.indexOf(startMark);
  const end = html.indexOf(endMark);
  if (start === -1 || end === -1) {
    console.error(`找不到标记 ${startMark} / ${endMark}`);
    process.exit(1);
  }
  return html.slice(0, start + startMark.length) + newContent + html.slice(end);
}

main();
