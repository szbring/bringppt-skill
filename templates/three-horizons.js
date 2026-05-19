'use strict';
// templates/three-horizons.js — 麦肯锡三视野（现在 / 中期 / 长期）
const path = require('path');
const fs   = require('fs');

module.exports = {
  name:        'threeHorizons',
  version:     '1.0.0',
  category:    '咨询框架',
  description: '三视野：H1 现在守业 / H2 中期增长 / H3 长期创新，曲线递进',

  schema: {
    horizons: { type: 'array', min: 3, max: 3, required: true,
      item: { name: { type: 'string', required: true, warn: 12, error: 20 },
              timeframe: { type: 'string', warn: 12, error: 20 },
              focus: { type: 'string', warn: 30, error: 50 } } },
  },

  usage: {
    when:    '战略规划 / 公司转型，分三档时间视野',
    notWhen: '时间不是关键维度；多于 3 个阶段用 timeline',
    maxItems: 3,
    typicalHeight: '3.0"',
  },

  get selfLearning() {
    const p = path.join(__dirname, '../learning/templates/three-horizons.json');
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return { errorPatterns: [], corrections: [] }; }
  },

  fromKeyPoints(keyPoints, page) {
    const { splitTitleDesc } = require('../lib/keypoints-helpers');
    const labels = ['H1 守业', 'H2 增长', 'H3 创新'];
    const horizons = (keyPoints || []).slice(0, 3).map((kp, i) => {
      const { title, desc } = splitTitleDesc(kp);
      return { name: title || labels[i], timeframe: labels[i].split(' ')[0], focus: desc || '' };
    });
    while (horizons.length < 3) horizons.push({ name: labels[horizons.length], timeframe: `H${horizons.length+1}`, focus: '' });
    return { horizons };
  },

  render(pres, slide, data, infra) {
    const { C, STEP_COLORS, FONTS, resolveStartY } = infra;
    const { horizons = [], startY } = data;
    const sy = resolveStartY(slide, startY, 1.4);
    const baseX = 0.6, totalW = 8.8, baseY = sy + 2.3;

    // 三条递进曲线（模拟 S 曲线，三档高度递进）
    const heights = [0.8, 1.5, 2.2];
    horizons.slice(0, 3).forEach((h, i) => {
      const segW = totalW / 3;
      const x = baseX + i * segW;
      const color = STEP_COLORS[i];
      const topY = baseY - heights[i];

      // 半透明色块
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: topY, w: segW - 0.1, h: heights[i],
        rectRadius: 0.1, fill: { color, transparency: 50 },
        line: { color, width: 1.5 },
      });
      // 顶部 H1/H2/H3 标签
      slide.addText(h.timeframe, {
        x, y: topY - 0.4, w: segW - 0.1, h: 0.35,
        fontSize: 16, fontFace: FONTS.primary, bold: true,
        color, align: 'center', margin: 0,
      });
      // 中部标题
      slide.addText(h.name, {
        x: x + 0.1, y: topY + 0.1, w: segW - 0.3, h: 0.4,
        fontSize: 14, fontFace: FONTS.primary, bold: true,
        color: C.PRIMARY, align: 'center', valign: 'middle', margin: 0,
      });
      // focus
      slide.addText(h.focus || '', {
        x: x + 0.1, y: topY + 0.55, w: segW - 0.3, h: heights[i] - 0.65,
        fontSize: 10, fontFace: FONTS.primary, color: C.TEXT,
        align: 'center', valign: 'top', lineSpacingMultiple: 1.4, margin: 0,
      });
    });

    // 时间轴底线
    slide.addShape(pres.shapes.LINE, {
      x: baseX, y: baseY, w: totalW, h: 0,
      line: { color: C.TEXT_LIGHT, width: 1 },
    });
    slide.addText('→ 时间', {
      x: baseX + totalW - 0.6, y: baseY + 0.05, w: 0.8, h: 0.3,
      fontSize: 10, fontFace: FONTS.primary,
      color: C.TEXT_LIGHT, valign: 'middle', margin: 0,
    });
    // v4.1.0: 接力契约 — 让下方 layout 从这里起步
    slide._bottomY = baseY + 0.4;
  },
};
