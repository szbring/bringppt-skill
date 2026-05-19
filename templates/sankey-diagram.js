'use strict';
// templates/sankey-diagram.js — 简化版桑基图（左节点 → 转化层 → 右节点）
const path = require('path');
const fs   = require('fs');

module.exports = {
  name:        'sankeyDiagram',
  version:     '1.0.0',
  category:    '分析/诊断型',
  description: '简化桑基：左侧 2-4 个源节点 + 右侧 2-4 个汇节点，中间宽度按流量',

  schema: {
    sources: {
      type: 'array',
      required: true,
      min: 2,
      max: 4,
      item: {
        name: { type: 'string', required: true, warn: 12, error: 20 },
        value: { type: 'number', required: true }
      }
    },
    targets: {
      type: 'array',
      required: true,
      min: 2,
      max: 4,
      item: {
        name: { type: 'string', required: true, warn: 12, error: 20 },
        value: { type: 'number', required: true }
      }
    },
    flows: {
      type: 'array',
      description: '可选：明确指定 source → target 流量',
      item: {
        from: { type: 'string', required: true },
        to: { type: 'string', required: true },
        value: { type: 'number', required: true }
      }
    },
  },

  usage: {
    when:    '资金流 / 用户流向 / 多源多汇转化',
    notWhen: '单线流程用 funnel；分类用 chartPie',
    maxItems: 8,
    typicalHeight: '3.5"',
  },

  get selfLearning() {
    const p = path.join(__dirname, '../learning/templates/sankey-diagram.json');
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return { errorPatterns: [], corrections: [] }; }
  },

  fromKeyPoints(keyPoints, page) {
    const { extractNumber } = require('../lib/adapter-helpers');
    const kps = keyPoints || [];
    const half = Math.ceil(kps.length / 2);
    const sources = kps.slice(0, half).map(extractNumber).map(x => ({ name: x.label, value: x.value || 10 }));
    const targets = kps.slice(half, half * 2).map(extractNumber).map(x => ({ name: x.label, value: x.value || 10 }));
    while (sources.length < 2) sources.push({ name: `源 ${sources.length+1}`, value: 10 });
    while (targets.length < 2) targets.push({ name: `汇 ${targets.length+1}`, value: 10 });
    return { sources: sources.slice(0, 4), targets: targets.slice(0, 4) };
  },

  render(pres, slide, data, infra) {
    const { C, STEP_COLORS, FONTS, resolveStartY } = infra;
    const { sources = [], targets = [], startY } = data;
    const sy = resolveStartY(slide, startY, 1.4);
    const baseY = sy + 0.2, areaH = 3.0;
    const leftX = 0.6, leftW = 1.6;
    const rightX = 7.8, rightW = 1.6;

    // 计算每节点高度比例
    const sTotal = sources.reduce((s, x) => s + x.value, 0);
    const tTotal = targets.reduce((s, x) => s + x.value, 0);

    // 左节点
    let cy = baseY;
    const sourcePositions = sources.map((s, i) => {
      const h = (s.value / sTotal) * areaH;
      const color = STEP_COLORS[i % STEP_COLORS.length];
      slide.addShape(pres.shapes.RECTANGLE, {
        x: leftX, y: cy, w: leftW, h: h - 0.05,
        fill: { color },
      });
      slide.addText(`${s.name}\n${s.value}`, {
        x: leftX + 0.05, y: cy, w: leftW - 0.1, h: h - 0.05,
        fontSize: 11, fontFace: FONTS.primary, bold: true,
        color: C.WHITE, align: 'center', valign: 'middle',
        lineSpacingMultiple: 1.3, margin: 0,
      });
      const pos = { y: cy, h: h - 0.05, color };
      cy += h;
      return pos;
    });

    // 右节点
    cy = baseY;
    const targetPositions = targets.map((t, i) => {
      const h = (t.value / tTotal) * areaH;
      slide.addShape(pres.shapes.RECTANGLE, {
        x: rightX, y: cy, w: rightW, h: h - 0.05,
        fill: { color: C.PRIMARY },
      });
      slide.addText(`${t.name}\n${t.value}`, {
        x: rightX + 0.05, y: cy, w: rightW - 0.1, h: h - 0.05,
        fontSize: 11, fontFace: FONTS.primary, bold: true,
        color: C.WHITE, align: 'center', valign: 'middle',
        lineSpacingMultiple: 1.3, margin: 0,
      });
      const pos = { y: cy, h: h - 0.05 };
      cy += h;
      return pos;
    });

    // 中间连接条带（每个 source 平分到所有 target，半透明）
    sourcePositions.forEach((sp, si) => {
      const segH = sp.h / targetPositions.length;
      targetPositions.forEach((tp, ti) => {
        const fromY = sp.y + ti * segH + segH / 2;
        const toY   = tp.y + (si / sourcePositions.length) * tp.h + tp.h / (2 * sourcePositions.length);
        // 用矩形条带粗略近似
        const stripH = Math.min(segH, tp.h / sourcePositions.length) * 0.8;
        slide.addShape(pres.shapes.RECTANGLE, {
          x: leftX + leftW, y: (fromY + toY) / 2 - stripH / 2,
          w: rightX - leftX - leftW, h: stripH,
          fill: { color: sp.color, transparency: 70 },
          line: { type: 'none' },
        });
      });
    });
    // v4.1.0: 接力契约 — 让下方 layout 从这里起步
    slide._bottomY = baseY + areaH;
  },
};
