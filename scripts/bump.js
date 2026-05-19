#!/usr/bin/env node
'use strict';
/**
 * scripts/bump.js — update version facts in package, lockfile, and entry docs.
 *
 * Usage:
 *   npm run bump -- 3.7.6
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const next = process.argv[2];

if (!next || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(next)) {
  console.error('Usage: node scripts/bump.js <semver>');
  process.exit(1);
}

function writeJson(rel, updater) {
  const p = path.join(root, rel);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  updater(data);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function replace(rel, re, value) {
  const p = path.join(root, rel);
  const src = fs.readFileSync(p, 'utf-8');
  const out = src.replace(re, value);
  if (out === src) throw new Error(`${rel}: pattern not found`);
  fs.writeFileSync(p, out, 'utf-8');
}

writeJson('package.json', (pkg) => { pkg.version = next; });

const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  writeJson('package-lock.json', (lock) => {
    lock.version = next;
    if (lock.packages && lock.packages['']) lock.packages[''].version = next;
  });
}

replace('SKILL.md', /\*\*版本\*\*：v\d+\.\d+\.\d+[^|]*(?=\s\|)/, `**版本**：v${next} (${new Date().toISOString().slice(0, 10)})`);
replace('README-INSTALL.md', /^# BRINGPPT v\d+\.\d+\.\d+.*$/m, `# BRINGPPT v${next} 安装与使用`);

console.log(`Version bumped to v${next}. Add CHANGELOG entry, commit, then tag v${next}.`);
// v4.1.7 (P3-3): 视觉基线自动化提醒
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [PROMPT] 如果本次 bump 含模板视觉变更，请运行：');
console.log('  $ npm run test:visual:88:update');
console.log('  以刷新 tests/visual-baseline-88.json，避免 hamming 漂移误报。');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
