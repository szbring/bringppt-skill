'use strict';
// templates/ansoff-matrix.js
// v3.7.0 — Ansoff 增长矩阵（公开方法论：Igor Ansoff 1957）

const path = require('path');
const fs   = require('fs');

const QUADRANTS = [
  // 行=市场，列=产品
  { key: 'penetration',  name: '市场渗透', en: 'Market Penetration',  risk: '低',   desc: '现有产品 × 现有市场：份额提升' },
  { key: 'productDev',   name: '产品开发', en: 'Product Development', risk: '中',   desc: '新产品 × 现有市场：现有客户卖新品' },
  { key: 'marketDev',    name: '市场开发', en: 'Market Development',  risk: '中',   desc: '现有产品 × 新市场：拓新地域/客群' },
  { key: 'diversify',    name: '多元化',   en: 'Diversification',     risk: '高',   desc: '新产品 × 新市场：跨界扩张' },
];

module.exports = {
  name:        'ansoffMatrix',
  version:     '1.0.0',
  category:    '咨询框架',
  description: 'Ansoff 增长矩阵（产品 × 市场 4 象限）：增长战略的经典框架',

  schema: {
    initiatives: {
      type: 'object', required: false,
      description: '4 象限的增长举措对象 { penetration: [..], productDev: [..], marketDev: [..], diversify: [..] }',
    },
    title:    { type: 'string', required: false, description: '小标题' },
    startY:   { type: 'number', required: false, description: '起始 Y 坐标' },
  },

  usage: {
    when:    '增长战略制定：判断走哪条增长路径；评估每条路径的具体举措',
    notWhen: '业务组合分析（用 bcgMatrix）；竞争策略（用 porterFiveForces）',
    typicalHeight: '3.8~4.2 英寸',
    scenarios: [
      { trigger: '增长战略 4 选项对比', example: '判断公司主推哪种增长路径' },
      { trigger: '产品-市场扩张计划', example: '为 4 象限分别列出具体举措' },
      { trigger: '新业务进入路径决策', example: '评估"市场渗透 vs 多元化"的风险收益' },
    ],
  },

  get selfLearning() {
    const p = path.join(__dirname, '../learning/templates/ansoff-matrix.json');
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return { errorPatterns: [], corrections: [] }; }
  },

  // v3.7.10: keyPoints 适配器（补齐 89/89 覆盖）
  fromKeyPoints(keyPoints, page) {
    const { splitTitleDesc } = require('../lib/keypoints-helpers');
    const kps = keyPoints || [];
    const t = arr => arr.map(s => splitTitleDesc(s).title || s);
    const n = Math.ceil(kps.length / 4) || 1;
    return {
      initiatives: {
        penetration: t(kps.slice(0, n)),
        productDev:  t(kps.slice(n, 2 * n)),
        marketDev:   t(kps.slice(2 * n, 3 * n)),
        diversify:   t(kps.slice(3 * n)),
      },
      title: (page && page.title) || '',
    };
  },



  render(pres, slide, data, infra) {
    const { C, validateBounds, FONTS, getLayoutBox } = infra;
    const { initiatives = {}, title, startY } = data;

    // v4.1.6: 用守护框 [top, bottom]，模板自己决定矩阵高度 + 居中
    const box = getLayoutBox ? getLayoutBox(slide) : { top: 1.20, bottom: slide._contentMaxBottom || 4.85, available: (slide._contentMaxBottom || 4.85) - 1.20 };
    const top = (startY != null) ? startY : box.top;
    const bottom = box.bottom;
    // 标题预留（仅当显式有 title 且页面未占据 _hasContentTitle）
    const skipOwnTitle = !!slide._hasContentTitle && !data.forceTitle;
    const titleH = (title && !skipOwnTitle) ? 0.45 : 0;
    // X 轴顶部标签 0.30，底部大标签 0.30：共 0.60
    const axisH = 0.60;
    // 矩阵自身可用高度
    const available = bottom - top - titleH - axisH - 0.20; // 上下各 0.10 缓冲
    const mh = Math.max(1.6, Math.min(2.55, available));
    // 纵向居中：上下留白
    const slack = (bottom - top) - (titleH + axisH + mh + 0.20);
    const offsetY = top + Math.max(0, slack / 2);
    let curY = offsetY;
    if (title && !skipOwnTitle) {
      slide.addText(title, {
        x: 0.5, y: curY, w: 9.0, h: 0.4,
        fontSize: 16, fontFace: FONTS.primary, bold: true,
        color: C.PRIMARY, align: 'left', valign: 'middle', margin: 0,
      });
      curY += titleH;
    }

    // 矩阵区
    const mx = 1.6, my = curY + 0.30 + 0.05; // 顶部 X 轴标签 0.30 + 5 mil gap
    const maxBottom = bottom;
    const mw = 7.8;
    const cellW = mw / 2;
    const cellH = (mh - 0.5) / 2;

    // 按象限定位：
    //   左上：现有产品×现有市场 = 渗透（最稳）
    //   右上：新产品×现有市场 = 产品开发
    //   左下：现有产品×新市场 = 市场开发
    //   右下：新产品×新市场 = 多元化（最高风险）
    const cells = [
      { def: QUADRANTS[0], x: mx,         y: my, bg: C.BLUE_PALE,   tc: C.PRIMARY },
      { def: QUADRANTS[1], x: mx + cellW, y: my, bg: C.BLUE_LIGHT,  tc: C.PRIMARY },
      { def: QUADRANTS[2], x: mx,         y: my + cellH, bg: C.SECONDARY, tc: C.WHITE },
      { def: QUADRANTS[3], x: mx + cellW, y: my + cellH, bg: C.PRIMARY,   tc: C.WHITE },
    ];
    cells.forEach(c => {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: c.x, y: c.y, w: cellW, h: cellH,
        fill: { color: c.bg }, line: { color: C.WHITE, width: 1 },
      });
      // 标签 + 风险标识
      slide.addText([
        { text: c.def.name + '\n', options: { fontSize: 16, bold: true } },
        { text: c.def.en, options: { fontSize: 10, transparency: 25 } },
      ], {
        x: c.x + 0.15, y: c.y + 0.15, w: cellW - 0.3, h: 0.8,
        fontFace: FONTS.primary,
        color: c.tc, valign: 'top', margin: 0,
      });
      // 风险等级胶囊（右上角）
      const riskW = 0.8;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: c.x + cellW - riskW - 0.1, y: c.y + 0.15, w: riskW, h: 0.3,
        rectRadius: 0.12,
        fill: { color: c.tc, transparency: 60 },
        line: { color: c.tc, width: 0 },
      });
      slide.addText('风险 ' + c.def.risk, {
        x: c.x + cellW - riskW - 0.1, y: c.y + 0.15, w: riskW, h: 0.3,
        fontSize: 9, fontFace: FONTS.primary, bold: true,
        color: c.tc, align: 'center', valign: 'middle', margin: 0,
      });
      // 描述
      slide.addText(c.def.desc, {
        x: c.x + 0.15, y: c.y + 1.0, w: cellW - 0.3, h: 0.4,
        fontSize: 9, fontFace: FONTS.primary,
        color: c.tc, transparency: 20, italic: true, valign: 'top', margin: 0,
      });
      // 举措列表
      const list = initiatives[c.def.key] || [];
      if (list.length > 0) {
        const bulletText = list.slice(0, 4).map(s => '• ' + s).join('\n');
        slide.addText(bulletText, {
          x: c.x + 0.18, y: c.y + 1.4, w: cellW - 0.36, h: cellH - 1.5,
          fontSize: 10, fontFace: FONTS.primary,
          color: c.tc, lineSpacingMultiple: 1.4, valign: 'top', margin: 0,
        });
      }
    });

    // 坐标轴标签
    // X 轴（顶部）：产品
    slide.addText('现有产品', {
      x: mx, y: my - 0.35, w: cellW, h: 0.3,
      fontSize: 10, fontFace: FONTS.primary,
      color: C.TEXT_LIGHT, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText('新产品', {
      x: mx + cellW, y: my - 0.35, w: cellW, h: 0.3,
      fontSize: 10, fontFace: FONTS.primary,
      color: C.TEXT_LIGHT, align: 'center', valign: 'middle', margin: 0,
    });
    // X 轴大标签
    slide.addText('产品  Product →', {
      x: mx, y: my + 2 * cellH + 0.05, w: mw, h: 0.3,
      fontSize: 11, fontFace: FONTS.primary, bold: true,
      color: C.PRIMARY, align: 'center', valign: 'middle', margin: 0,
    });
    // Y 轴：市场（左侧竖排）
    slide.addText('现有\n市场', {
      x: 0.3, y: my, w: 1.2, h: cellH,
      fontSize: 10, fontFace: FONTS.primary,
      color: C.TEXT_LIGHT, align: 'right', valign: 'middle',
      lineSpacingMultiple: 1.2, margin: 0,
    });
    slide.addText('新\n市场', {
      x: 0.3, y: my + cellH, w: 1.2, h: cellH,
      fontSize: 10, fontFace: FONTS.primary,
      color: C.TEXT_LIGHT, align: 'right', valign: 'middle',
      lineSpacingMultiple: 1.2, margin: 0,
    });

    // v4.1.6: 钳制下沿，更新 _bottomY 供接力
    const finalBottom = Math.min(my + mh + 0.35, bottom);
    slide._bottomY = finalBottom;
    validateBounds(slide, finalBottom, 'ansoffMatrix');
  },
};
