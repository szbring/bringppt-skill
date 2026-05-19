'use strict';
// templates/bracket-group.js
// v3.2.6 — 大括号分组（pptxgenjs SHAPE_NAME.rightBrace / leftBrace 包装）
// 用于"因子分组 / 分类汇总 / 一对多映射"

const path = require('path');
const fs   = require('fs');

module.exports = {
  name:        'bracketGroup',
  version:     '1.0.0',
  category:    '矩阵/框架型',
  description: '左侧多个并列项用大括号汇聚到右侧一个总结概念；展示"多个细项 → 一个总论"或反之的逻辑关系',

  schema: {
    items: {
      type: 'array',
      required: true,
      description: '左侧的并列项数组（3-6 项）：[string] 或 [{ title, desc? }]',
    },
    summary:  { type: 'string', required: true, description: '右侧汇总词或结论（≤ 12 字）' },
    summaryDesc: { type: 'string', required: false, description: '右侧汇总的二级说明（可选）' },
    title:    { type: 'string', required: false, description: '小标题' },
    direction: { type: 'string', default: 'rightSummary', description: 'rightSummary（默认，左项→右汇总）| leftSummary（右项→左汇总）' },
    startY:   { type: 'number', required: false, description: '起始 Y 坐标' },
  },

  usage: {
    when:          '多个并列因子归类为一个核心结论；或一个核心分解为多个子项',
    notWhen:       '需要展示因果或时序时（用 causalChain / stepList）',
    typicalHeight: '2.5~3.2 英寸',
    scenarios: [
      { trigger: '多个症状归一个根因', example: '"客户流失 / 团队倦怠 / NPS 下降 / 增长停滞" → "缺乏战略聚焦"' },
      { trigger: '多个解决方案归一个战略', example: '"流程重构 / 系统改造 / 团队培训 / 激励调整" → "数字化转型"' },
      { trigger: '一个核心拆分为多个支柱', example: '"AI 落地" → 智能调研 / 知识引擎 / 可视化交付（leftSummary 方向）' },
    ],
  },

  get selfLearning() {
    const p = path.join(__dirname, '../learning/templates/bracket-group.json');
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return { errorPatterns: [], corrections: [] }; }
  },

  // v3.7.9: keyPoints 适配器（从 storyboard-converter 自动迁移）
  fromKeyPoints(keyPoints, page) {
    const { splitTitleDesc } = require('../lib/keypoints-helpers');
    const kps = keyPoints || [];
    const title = (page && page.title) || '';
    // 假设最后一项是"汇总"，前面是"并列项"
          if (kps.length < 2) return { items: kps, summary: title || '汇总' };
          const items   = kps.slice(0, -1).map(kp => {
            const { title: t, desc: d } = splitTitleDesc(kp);
            return d ? { title: t, desc: d } : t;
          });
          const summary = splitTitleDesc(kps[kps.length - 1]).title;
          return { items, summary, title };
  },



  render(pres, slide, data, infra) {
    const { C, shadow, resolveStartY, validateBounds, FONTS } = infra;
    const { items = [], summary, summaryDesc, title, direction = 'rightSummary', startY } = data;
    const count = items.length;
    if (count === 0 || !summary) return;

    const sy = resolveStartY(slide, startY, 1.0);
    let curY = sy;

    // v4.1.2: 若 contentSlide 母版已画大标题（_hasContentTitle），跳过自画 title 避免重复
    const skipOwnTitle = !!slide._hasContentTitle && !data.forceTitle;
    if (title && !skipOwnTitle) {
      slide.addText(title, {
        x: 0.75, y: sy, w: 8.5, h: 0.4,
        fontSize: 16, fontFace: FONTS.primary, bold: true,
        color: C.PRIMARY, align: 'left', valign: 'middle', margin: 0,
      });
      curY = sy + 0.5;
    }

    // 布局：rightSummary = [items 左] [大括号 中] [summary 右]
    //       leftSummary  = [summary 左] [大括号 中] [items 右]
    const itemsW  = 3.5;
    const braceW  = 0.7;
    const summW   = 3.0;
    const totalW  = itemsW + braceW + summW + 0.5;  // 含间距
    const left0   = (10 - totalW) / 2;
    const itemX   = direction === 'leftSummary' ? left0 + summW + 0.5 + braceW : left0;
    const braceX  = direction === 'leftSummary' ? left0 + summW + 0.25 : left0 + itemsW + 0.25;
    const summX   = direction === 'leftSummary' ? left0 : left0 + itemsW + 0.5 + braceW;

    // v4.1.0: _contentMaxBottom 感知 — banner 模式下自动收缩高度
    const maxBottom = slide._contentMaxBottom || 4.85;
    const totalH = Math.min(2.8, 0.55 * count + 0.3, maxBottom - curY - 0.3);
    const itemH = (totalH - 0.2) / count;

    // 左侧（或右侧）的并列项
    items.forEach((it, i) => {
      const y = curY + 0.1 + i * itemH;
      const txt = typeof it === 'string' ? it : it.title;
      const dsc = typeof it === 'object' ? it.desc : '';

      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: itemX, y, w: itemsW, h: itemH - 0.08,
        rectRadius: 0.06, fill: { color: C.BG_LIGHT },
        line: { color: C.BORDER, width: 0.5 },
      });
      slide.addText(txt, {
        x: itemX + 0.1, y, w: itemsW - 0.2, h: dsc ? (itemH - 0.08) * 0.6 : (itemH - 0.08),
        fontSize: 12, fontFace: FONTS.primary, bold: true,  // v3.7.15: 13 → 12
        color: C.PRIMARY, valign: dsc ? 'bottom' : 'middle', margin: 0,
        shrinkText: true,
      });
      if (dsc) {
        slide.addText(dsc, {
          x: itemX + 0.1, y: y + (itemH - 0.08) * 0.55, w: itemsW - 0.2, h: (itemH - 0.08) * 0.4,
          fontSize: 9, fontFace: FONTS.primary,  // v3.7.15: 10 → 9
          color: C.TEXT_LIGHT, valign: 'top', margin: 0,
          shrinkText: true,
        });
      }
    });

    // 大括号
    const braceShape = direction === 'leftSummary'
      ? pres.shapes.LEFT_BRACE   // 左括号（开口向右）
      : pres.shapes.RIGHT_BRACE; // 右括号（开口向左）
    slide.addShape(braceShape, {
      x: braceX, y: curY + 0.1, w: braceW, h: totalH,
      fill: { color: C.WHITE },
      line: { color: C.SECONDARY, width: 2.5 },
    });

    // 汇总词
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: summX, y: curY + 0.1 + (totalH - 1.2) / 2,
      w: summW, h: 1.2,
      rectRadius: 0.1,
      fill: { color: C.PRIMARY },
      shadow: shadow(),
    });
    slide.addText(summary, {
      x: summX + 0.1, y: curY + 0.1 + (totalH - 1.2) / 2,
      w: summW - 0.2, h: summaryDesc ? 0.7 : 1.2,
      fontSize: 20, fontFace: FONTS.primary, bold: true,
      color: C.WHITE, align: 'center', valign: summaryDesc ? 'bottom' : 'middle', margin: 0,
    });
    if (summaryDesc) {
      slide.addText(summaryDesc, {
        x: summX + 0.15, y: curY + 0.1 + (totalH - 1.2) / 2 + 0.7,
        w: summW - 0.3, h: 0.4,
        fontSize: 11, fontFace: FONTS.primary,
        color: C.WHITE, transparency: 20,
        align: 'center', valign: 'top', margin: 0,
      });
    }

    slide._bottomY = curY + totalH + 0.3;  // v4.0.6: 让下游 layout 接力
    validateBounds(slide, curY + totalH + 0.3);
  },
};
