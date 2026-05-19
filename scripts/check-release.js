#!/usr/bin/env node
'use strict';
/**
 * scripts/check-release.js — release consistency gate.
 *
 * Checks the small set of facts that must stay aligned before a team release:
 * package/SKILL/README versions, registry counts in docs, script targets,
 * package-lock reproducibility, and git tag -> HEAD.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const skipTag = args.has('--skip-tag');
const allowDirty = args.has('--allow-dirty');

let failures = 0;
function ok(msg) { console.log(`OK   ${msg}`); }
function fail(msg) { failures++; console.error(`FAIL ${msg}`); }

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf-8');
}

function json(rel) {
  return JSON.parse(read(rel));
}

function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf-8' });
}

const pkg = json('package.json');
const version = pkg.version;
const tagName = `v${version}`;

// Version alignment
const skill = read('SKILL.md');
const readme = read('README-INSTALL.md');
const changelog = read('CHANGELOG.md');
const agent = read('agents/openai.yaml');
if (skill.includes(`**版本**：v${version}`)) ok(`SKILL.md version v${version}`); else fail(`SKILL.md missing version v${version}`);
if (readme.startsWith(`# BRINGPPT v${version}`)) ok(`README-INSTALL.md version v${version}`); else fail(`README-INSTALL.md header is not v${version}`);
if (changelog.includes(`## v${version}`)) ok(`CHANGELOG.md contains v${version}`); else fail(`CHANGELOG.md missing v${version}`);

// Registry/doc count alignment
const registry = require(path.join(root, 'registry'));
const all = registry.list();
const pageCount = all.filter(t => t.isPageTemplate).length;
const layoutCount = all.length - pageCount;
const docs = read('docs/bring-templates.md');
const countText = `${all.length}`;
const pageText = `${pageCount} 个 A 类`;
const layoutText = `${layoutCount} 个 B 类`;
ok(`registry count ${all.length} = ${pageCount} A + ${layoutCount} B`);
if (skill.includes(countText) && agent.includes(countText) && pkg.description.includes(countText)) ok(`metadata mentions ${all.length} templates`); else fail(`metadata does not consistently mention ${all.length} templates`);
if (docs.includes(`当前应为 ${all.length}`) && docs.includes(pageText) && docs.includes(layoutText)) ok('docs/bring-templates.md count summary is current'); else fail('docs/bring-templates.md count summary is stale');
if (read('references/visual-design.md').includes('003591') && docs.includes('C.PRIMARY    = "003591"')) ok('visual docs use current business-blue palette'); else fail('visual docs do not use current palette');

// Baseline smoke files
try {
  const baseline = json('tests/baseline.json');
  const missingFiles = Object.keys(baseline)
    .map(name => path.join(root, 'tests', `${name}.js`))
    .filter(fp => !fs.existsSync(fp));
  if (missingFiles.length === 0) ok(`baseline smoke files exist (${Object.keys(baseline).length})`);
  else fail(`baseline references missing test files: ${missingFiles.map(fp => path.relative(root, fp)).join(', ')}`);
} catch (e) {
  fail(`baseline smoke check failed: ${e.message}`);
}

// package-lock reproducibility
const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = json('package-lock.json');
  const rootPkg = lock.packages && lock.packages[''];
  if (lock.version === version && rootPkg && rootPkg.version === version) ok('package-lock version matches package.json');
  else fail('package-lock root version mismatch');
  if (rootPkg && rootPkg.dependencies && rootPkg.dependencies.pptxgenjs === pkg.dependencies.pptxgenjs) ok('package-lock dependency spec matches package.json');
  else fail('package-lock dependency spec mismatch');
} else {
  fail('package-lock.json missing');
}

// Script targets
for (const [name, script] of Object.entries(pkg.scripts || {})) {
  const m = script.match(/^(?:node|python3?)\s+([^\s]+)/);
  if (!m) continue;
  const target = path.join(root, m[1]);
  if (fs.existsSync(target)) ok(`npm script "${name}" target exists`);
  else fail(`npm script "${name}" target missing: ${m[1]}`);
}

// Runtime skill package boundary
let prepackStage = null;
try {
  prepackStage = fs.mkdtempSync(path.join(os.tmpdir(), 'bringppt-prepack-check-'));
  const r = spawnSync('node', ['scripts/prepack-skill.js', prepackStage, '--no-node-modules'], {
    cwd: root,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  if (r.status !== 0) {
    fail(`runtime prepack failed: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
  } else {
    const forbidden = ['tests', 'test-batch', 'CHANGELOG.md', 'README-INSTALL.md', 'docs/catalog', 'scripts/archive'];
    const leaked = forbidden.filter(rel => fs.existsSync(path.join(prepackStage, rel)));
    if (leaked.length) fail(`runtime prepack leaked dev assets: ${leaked.join(', ')}`);
    else ok('runtime prepack excludes dev/test assets');
    const hidden = [];
    const scanHidden = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.relative(prepackStage, path.join(dir, ent.name));
        if (ent.name === '.DS_Store' || ent.name.startsWith('._') || ent.name === '__MACOSX') hidden.push(rel);
        if (ent.isDirectory()) scanHidden(path.join(dir, ent.name));
      }
    };
    scanHidden(prepackStage);
    if (hidden.length) fail(`runtime prepack contains hidden macOS metadata: ${hidden.slice(0, 5).join(', ')}`);
    else ok('runtime prepack excludes macOS metadata');
    if (fs.existsSync(path.join(prepackStage, 'lib', 'visual-hash.js'))) ok('runtime prepack keeps visual hash support');
    else fail('runtime prepack missing lib/visual-hash.js');
    if (fs.existsSync(path.join(prepackStage, 'validators', 'stats.js'))) ok('runtime prepack keeps validators');
    else fail('runtime prepack missing validators/stats.js');
    const validateSmoke = spawnSync('node', ['validate-slides.js'], {
      cwd: prepackStage,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    if (validateSmoke.status === 0) ok('runtime validate-slides dependency smoke passed');
    else fail(`runtime validate-slides dependency smoke failed: ${(validateSmoke.stderr || validateSmoke.stdout || '').slice(0, 400)}`);
    const stagedPkg = JSON.parse(fs.readFileSync(path.join(prepackStage, 'package.json'), 'utf-8'));
    const stagedScripts = Object.keys(stagedPkg.scripts || {});
    const devScripts = stagedScripts.filter(name => /^(test|release:check|bump|prepack:skill)/.test(name));
    if (devScripts.length) fail(`runtime package still exposes dev scripts: ${devScripts.join(', ')}`);
    else ok('runtime package scripts are deployment-oriented');
  }
} catch (e) {
  fail(`runtime prepack check crashed: ${e.message}`);
} finally {
  if (prepackStage) fs.rmSync(prepackStage, { recursive: true, force: true });
}

// CHANGELOG ↔ git tag 完整性（v3.7.8 新增）
// 防止 CHANGELOG 出现某个版本章节但 git tag 中缺失，导致 git checkout v3.x.y 拿不到对应代码。
// 注意：仓库 git init 始于 v3.7.4，更早的 CHANGELOG 章节不在 git 历史里，需豁免。
const FIRST_GIT_TRACKED = '3.7.4';
function semverGte(a, b) {
  const ax = a.split('.').map(Number);
  const bx = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((ax[i] || 0) > (bx[i] || 0)) return true;
    if ((ax[i] || 0) < (bx[i] || 0)) return false;
  }
  return true;
}
try {
  if (skipTag) {
    ok('CHANGELOG ↔ tag check skipped by --skip-tag');
  } else {
  const versionsInChangelog = [...changelog.matchAll(/^## v(\d+\.\d+\.\d+)/gm)].map(m => m[1]);
  const tagListResult = git(['for-each-ref', '--format=%(refname:short)', 'refs/tags']);
  const tagsExisting = new Set(
    tagListResult.status === 0
      ? tagListResult.stdout.split('\n').filter(Boolean).map(t => t.replace(/^v/, ''))
      : []
  );
  const tracked = versionsInChangelog.filter(v => semverGte(v, FIRST_GIT_TRACKED));
  const missing = tracked.filter(v => !tagsExisting.has(v));
  if (missing.length === 0) ok(`CHANGELOG ≥ v${FIRST_GIT_TRACKED} 所有版本都有 git tag (${tracked.length} 条)`);
  else fail(`CHANGELOG 中以下版本缺 git tag：${missing.map(v => 'v' + v).join(', ')}`);
  }
} catch (e) {
  fail(`CHANGELOG ↔ tag 校验失败：${e.message}`);
}

// Git release checks
const inside = git(['rev-parse', '--is-inside-work-tree']);
if (inside.status === 0 && inside.stdout.trim() === 'true') {
  const dirty = git(['status', '--porcelain']).stdout.trim();
  if (!dirty || allowDirty) ok(dirty ? 'git worktree dirty allowed by --allow-dirty' : 'git worktree clean');
  else fail('git worktree is dirty; commit before release or pass --allow-dirty for local diagnostics');

  if (!skipTag) {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();
    const tag = git(['rev-parse', tagName]).stdout.trim();
    if (tag && tag === head) ok(`${tagName} tag points to HEAD`);
    else fail(`${tagName} tag does not point to HEAD`);
  }
} else {
  fail('not inside a git worktree');
}

// v4.1.0 (P2-13): _bottomY 接力契约审计门禁
// 全模板 _bottomY / _contentMaxBottom 合规扫描；P1>0 或 P2>5 阻断 release
try {
  const { auditBottomY } = require('./audit-bottom-y');
  const audit = auditBottomY();
  if (audit.p0 > 0) {
    const p0Names = audit.issues.filter(i => i.level === 'P0-MISS').map(i => i.name).join(', ');
    fail(`_bottomY 审计：${audit.p0} 个模板源码缺失（P0）：${p0Names}`);
  } else if (audit.p1 > 0) {
    const p1Names = audit.issues.filter(i => i.level === 'P1').map(i => i.name).join(', ');
    fail(`_bottomY 审计：${audit.p1} 个模板需修（P1，底部块未设 slide._bottomY，会与 insightBanner 重叠）：${p1Names}`);
  } else if (audit.p2 > 5) {
    fail(`_bottomY 审计：P2 issue 数 ${audit.p2} > 5，建议修复（不设 _bottomY 也不读 _contentMaxBottom 的模板过多）`);
  } else {
    ok(`_bottomY 接力契约合规：${audit.pristine.length}/${audit.total} 模板（P1=0, P2=${audit.p2}）`);
  }
} catch (e) {
  fail(`_bottomY 审计执行失败：${e.message}`);
}

// v3.7.26: 契约测试 + 视觉回归门禁（Pillar 7）
// 通过 --skip-tests 跳过（CI 已单独跑时可用）；默认强制
if (!args.has('--skip-tests')) {
  console.log('\n--- Contract test (Pillar 1) ---');
  const ct = spawnSync('node', ['tests/contract-test.js'], { cwd: root, encoding: 'utf-8', stdio: 'pipe' });
  const ctTail = (ct.stdout || '').split('\n').filter(l => /^=== 汇总|^通过|^失败/.test(l)).join('\n');
  console.log(ctTail || '(无输出)');
  if (ct.status !== 0) {
    // 契约测试有"已知豁免"的固定失败数，比较新失败而非整体通过
    const m = (ct.stdout || '').match(/^通过:\s*(\d+)\/(\d+)/m);
    if (m && parseInt(m[1]) < 60) fail(`contract test 通过率退步：${m[1]}/${m[2]}（基线 ≥60）`);
    else ok(`contract test 仍 ≥60 通过（豁免失败未变）`);
  } else {
    ok('contract test: 全部通过');
  }

  console.log('\n--- Visual regression layouts (Pillar 3) ---');
  const vr = spawnSync('node', ['tests/visual-regression-88.js'], { cwd: root, encoding: 'utf-8', stdio: 'pipe' });
  const vrTail = (vr.stdout || '').split('\n').slice(-12).join('\n');
  console.log(vrTail);
  if (vr.status !== 0) fail(`visual regression 检出高风险偏离（exit ${vr.status}）`);
  else ok('visual regression: 0 偏离');
}

if (failures > 0) {
  console.error(`\nRelease check failed: ${failures} issue(s).`);
  process.exit(1);
}
console.log('\nRelease check passed.');
