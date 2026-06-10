#!/usr/bin/env node
/**
 * Конвертирует Markdown (docs/*.md) в HTML-фрагмент для вставки в страницы.
 * Использование: node scripts/md-to-html.js docs/about.md
 */
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(process.argv[2], 'utf8');

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_\(([^)]+)\)_/g, '<em>($1)</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link-primary">$1</a>');
}

const lines = md.split('\n');
const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (line.startsWith('# ')) {
    out.push('<h1 class="hero" style="font-size:35px;color:var(--navy);margin:0 0 1rem;">' + inline(line.slice(2).trim()) + '</h1>');
    i++;
    continue;
  }
  if (line.startsWith('## ')) {
    out.push('<h2>' + inline(line.slice(3).trim()) + '</h2>');
    i++;
    continue;
  }
  if (line.startsWith('### ')) {
    out.push('<h3>' + inline(line.slice(4).trim()) + '</h3>');
    i++;
    continue;
  }
  if (line.trim() === '---') {
    i++;
    continue;
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    const ul = ['<ul>'];
    while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
      ul.push('<li>' + inline(lines[i].slice(2).trim()) + '</li>');
      i++;
    }
    ul.push('</ul>');
    out.push(ul.join('\n'));
    continue;
  }
  if (/^\d+\.\s/.test(line)) {
    const ol = ['<ol>'];
    while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
      ol.push('<li>' + inline(lines[i].replace(/^\d+\.\s/, '').trim()) + '</li>');
      i++;
    }
    ol.push('</ol>');
    out.push(ol.join('\n'));
    continue;
  }
  if (line.trim() === '') {
    i++;
    continue;
  }
  out.push('<p>' + inline(line.trim()) + '</p>');
  i++;
}

process.stdout.write(out.join('\n'));
