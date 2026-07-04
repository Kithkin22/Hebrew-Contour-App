/* Canonical contour page renderer — single source of truth for editor + export layout */

const CONTOUR_PAGE = {
  letterWidthPx: 816,
  letterHeightPx: 1056,
  marginPx: 96,
  hebrewAnchorInsetPx: 32,
  displayIndentPx: 30,
  bodyFontSizePx: 26,
  bodyLineHeight: 2.1,
  passageTitleFontSizePx: 14,
  verseRefFontSizePx: 13,
  breakPx: { compact: -8, small: 18, medium: 40, large: 72 },
  verseSpacingEm: { single: 2.1, oneHalf: 3.15, double: 4.2 },
  docxFontHalfPoints: 32,
};
window.CONTOUR_PAGE = CONTOUR_PAGE;

function contourPxToDocxTwips(px) {
  return Math.round(px * 15);
}
window.contourPxToDocxTwips = contourPxToDocxTwips;

function contourDisplayIndentPx() {
  return CONTOUR_PAGE.displayIndentPx;
}
window.contourDisplayIndentPx = contourDisplayIndentPx;

function contourIndentDocxTwips(level) {
  return Math.max(0, level || 0) * contourPxToDocxTwips(CONTOUR_PAGE.displayIndentPx);
}
window.contourIndentDocxTwips = contourIndentDocxTwips;

function contourBreakDocxTwips(level) {
  const px = CONTOUR_PAGE.breakPx[level];
  return px ? contourPxToDocxTwips(px) : 0;
}
window.contourBreakDocxTwips = contourBreakDocxTwips;

function contourVerseSpacingDocxTwips(level) {
  const em = CONTOUR_PAGE.verseSpacingEm[level];
  if (!em) return 0;
  return contourPxToDocxTwips(em * CONTOUR_PAGE.bodyFontSizePx);
}
window.contourVerseSpacingDocxTwips = contourVerseSpacingDocxTwips;

function contourPageCssVarsBlock() {
  const t = CONTOUR_PAGE;
  return `:root{`
    + `--contour-letter-width:${t.letterWidthPx}px;`
    + `--contour-letter-margin:${t.marginPx}px;`
    + `--contour-letter-min-height:${t.letterHeightPx}px;`
    + `--contour-hebrew-anchor-inset:${t.hebrewAnchorInsetPx}px;`
    + `--contour-display-indent-px:${t.displayIndentPx}px;`
    + `--contour-body-font-size:${t.bodyFontSizePx}px;`
    + `--contour-body-line-height:${t.bodyLineHeight};`
    + `--contour-passage-title-size:${t.passageTitleFontSizePx}px;`
    + `--contour-verse-ref-size:${t.verseRefFontSizePx}px;`
    + `--contour-break-compact:${t.breakPx.compact}px;`
    + `--contour-break-sm:${t.breakPx.small}px;`
    + `--contour-break-md:${t.breakPx.medium}px;`
    + `--contour-break-lg:${t.breakPx.large}px;`
    + `--contour-verse-spacing-single:${t.verseSpacingEm.single}em;`
    + `--contour-verse-spacing-oneHalf:${t.verseSpacingEm.oneHalf}em;`
    + `--contour-verse-spacing-double:${t.verseSpacingEm.double}em;`
    + '}';
}
window.contourPageCssVarsBlock = contourPageCssVarsBlock;

function injectContourPageTokens() {
  const id = 'contour-page-tokens';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = contourPageCssVarsBlock();
}
window.injectContourPageTokens = injectContourPageTokens;

function contourScriptFontFamily(isGreek) {
  return isGreek
    ? "'SBL Greek','Gentium Plus','Times New Roman',serif"
    : "'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
}

function contourPageBodySelector(root) {
  return root ? `${root} .contour-page-body` : '.contour-page-body,#editor.contour-document-page';
}

function contourPageExportCss(opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const textDir = isGreek ? 'ltr' : 'rtl';
  const textAlign = isGreek ? 'left' : 'right';
  const textFont = contourScriptFontFamily(isGreek);
  const bodySel = '.contour-page-body';
  const sheetSel = '.contour-document-sheet.contour-document-sheet--export';

  return contourPageCssVarsBlock()
    + 'body{margin:0;padding:24px;background:#fff;color:#222;font-family:Arial,Helvetica,sans-serif}'
    + '@page{margin:0.6in}'
    + `${sheetSel}{direction:ltr;text-align:left;width:var(--contour-letter-width);min-height:var(--contour-letter-min-height);`
    + 'margin:0 auto;padding:var(--contour-letter-margin);box-sizing:border-box;background:#fff}'
    + `${sheetSel} .contour-passage-title{display:block;unicode-bidi:isolate;direction:ltr;text-align:left;`
    + 'font-family:Arial,Helvetica,sans-serif;font-size:var(--contour-passage-title-size);font-weight:700;'
    + 'line-height:1.35;margin:0 0 24px 0;color:#1e293b}'
    + `${bodySel}{direction:ltr!important;text-align:left!important;unicode-bidi:normal;`
    + 'font-size:var(--contour-body-font-size);line-height:var(--contour-body-line-height);font-family:' + textFont + '}'
    + `${bodySel}.lang-hebrew .verse-block,${bodySel}.lang-hebrew .verse-block{direction:${textDir};text-align:${textAlign};`
    + 'width:100%;padding-right:var(--contour-hebrew-anchor-inset);box-sizing:border-box}'
    + `${bodySel} .clause{display:block;direction:${textDir};text-align:${textAlign};unicode-bidi:isolate;`
    + 'border-radius:6px;padding:2px 8px;margin:2px 0;font-family:' + textFont + '}'
    + `${bodySel} .clause.layout-break-compact{margin-bottom:var(--contour-break-compact)!important}`
    + `${bodySel} .clause.layout-break-sm{margin-bottom:var(--contour-break-sm)!important}`
    + `${bodySel} .clause.layout-break-md{margin-bottom:var(--contour-break-md)!important}`
    + `${bodySel} .clause.layout-break-lg{margin-bottom:var(--contour-break-lg)!important}`
    + `${bodySel} .verse-block{margin-bottom:0}`
    + `${bodySel} .verse-block.verse-spacing-single{margin-bottom:var(--contour-verse-spacing-single)!important}`
    + `${bodySel} .verse-block.verse-spacing-oneHalf{margin-bottom:var(--contour-verse-spacing-oneHalf)!important}`
    + `${bodySel} .verse-block.verse-spacing-double{margin-bottom:var(--contour-verse-spacing-double)!important}`
    + `${bodySel} .word{display:inline-block;direction:${textDir};text-align:${textAlign};padding:0 3px;border-radius:4px;font-family:${textFont}}`
    + `${bodySel} .maqaf-connector{display:inline;padding:0;margin:0 -1px;font-family:inherit;line-height:inherit;vertical-align:baseline}`
    + `${bodySel} .word.deleted{text-decoration:line-through;opacity:.35}`
    + `${bodySel} .word.pred{color:#0b61a4;font-weight:bold}`
    + `${bodySel} .word.subj{color:#b02a2a;font-weight:bold}`
    + `${bodySel} .word.fmt-bold{font-weight:bold}`
    + `${bodySel} .word.fmt-italic{font-style:italic}`
    + `${bodySel} .word.fmt-underline{text-decoration:underline}`
    + `${bodySel} .word.fmt-double-underline{border-bottom:3px double currentColor}`
    + `${bodySel} .word.bracket-start::before{content:"[";font-family:Arial,Helvetica,sans-serif;margin-left:2px;margin-right:1px;color:var(--bracket-color,#000);font-weight:bold}`
    + `${bodySel} .word.bracket-end::after{content:"]";font-family:Arial,Helvetica,sans-serif;margin-left:1px;margin-right:2px;color:var(--bracket-color,#000);font-weight:bold}`
    + `${bodySel} .muted,.contour-passage-title,.verse-ref{unicode-bidi:isolate;direction:ltr;text-align:left;color:#666;font-size:var(--contour-verse-ref-size);font-family:Arial,Helvetica,sans-serif}`
    + `${bodySel} .verse-ref{margin-bottom:8px}`
    + '.export-legend{border:1px solid #999;border-collapse:collapse;margin:12px 0 20px 0;width:100%;font-family:Arial,Helvetica,sans-serif}'
    + '.export-legend th,.export-legend td{border:1px solid #999;padding:6px}'
    + '.export-legend th{background:#eee;text-align:left}'
    + '.legend-swatch{display:inline-block;min-width:56px;padding:2px 8px;border:1px solid #999;border-radius:4px;background:#fff;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.legend-preview-word{font-family:' + contourScriptFontFamily(false) + ';font-size:20px}'
    + '.legend-preview-greek{font-family:' + contourScriptFontFamily(true) + ';font-size:20px}'
    + '.comment-marker{display:inline-block;direction:ltr;font-family:Arial,Helvetica,sans-serif;font-size:.58em;color:#b02a2a;background:transparent;border:0;padding:0;margin:0 1px;vertical-align:super;line-height:1;font-weight:bold}'
    + (typeof contourExportOverlayCss === 'function' ? contourExportOverlayCss() : '')
    + '@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}button{display:none}}';
}
window.contourPageExportCss = contourPageExportCss;

function exportLayoutBreakCss() {
  const sel = '.contour-page-body';
  return `${sel} .clause{display:block;border-radius:6px;padding:2px 8px;margin:2px 0}`
    + `${sel} .clause.layout-break-compact{margin-bottom:var(--contour-break-compact)!important}`
    + `${sel} .clause.layout-break-sm{margin-bottom:var(--contour-break-sm)!important}`
    + `${sel} .clause.layout-break-md{margin-bottom:var(--contour-break-md)!important}`
    + `${sel} .clause.layout-break-lg{margin-bottom:var(--contour-break-lg)!important}`
    + `${sel} .verse-block{margin-bottom:0}`
    + `${sel} .verse-block.verse-spacing-single{margin-bottom:var(--contour-verse-spacing-single)!important}`
    + `${sel} .verse-block.verse-spacing-oneHalf{margin-bottom:var(--contour-verse-spacing-oneHalf)!important}`
    + `${sel} .verse-block.verse-spacing-double{margin-bottom:var(--contour-verse-spacing-double)!important}`;
}
window.exportLayoutBreakCss = exportLayoutBreakCss;

function contourPassageTitleForExport() {
  const refFn = typeof passageRefForDisplay === 'function' ? passageRefForDisplay : null;
  const fmtFn = typeof formatPassageTitleDisplay === 'function' ? formatPassageTitleDisplay : null;
  const ref = refFn ? refFn() : (state && state.ref) || '';
  if (!ref || !String(ref).trim()) return '';
  const text = fmtFn ? fmtFn(ref) : String(ref).trim();
  return text;
}

window.contourPassageTitleForExport = contourPassageTitleForExport;

function buildContourPassageTitleExportHtml() {
  const text = contourPassageTitleForExport();
  if (!text) return '';
  return `<div class="contour-passage-title" dir="ltr"><bdi class="contour-passage-title-text" dir="ltr">${typeof esc === 'function' ? esc(text) : text}</bdi></div>`;
}
window.buildContourPassageTitleExportHtml = buildContourPassageTitleExportHtml;

function buildContourPageBodyHtml(forExport) {
  if (typeof buildContourEditorHtmlFromState !== 'function') return '';
  return buildContourEditorHtmlFromState(!!forExport);
}

function buildContourPageShellHtml(bodyHtml, opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const titleHtml = opts.includeTitle === false ? '' : buildContourPassageTitleExportHtml();
  const bodyWrapHtml = opts.includeOverlays !== false
    && typeof buildContourExportBodyWrapHtml === 'function'
    ? buildContourExportBodyWrapHtml(bodyHtml, opts)
    : (() => {
      const langCls = isGreek ? 'lang-greek' : 'lang-hebrew';
      return `<div class="contour-export-body-wrap"><div class="contour-page-body ${langCls}" dir="ltr">${bodyHtml || ''}</div></div>`;
    })();
  return `<div class="contour-document-sheet contour-document-sheet--export">`
    + titleHtml
    + bodyWrapHtml
    + '</div>';
}
window.buildContourPageShellHtml = buildContourPageShellHtml;

function buildContourExportDocument(opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const bodyHtml = opts.bodyHtml != null ? opts.bodyHtml : buildContourPageBodyHtml(true);
  if (!bodyHtml) return null;
  const titleText = contourPassageTitleForExport() || (state && state.ref) || 'Contour Export';
  const pageTitle = typeof xmlEscape === 'function' ? xmlEscape(opts.docTitle || titleText) : (opts.docTitle || titleText);
  const legendHtml = typeof legendHtmlForExport === 'function' ? legendHtmlForExport() : '';
  const inclusiosHtml = typeof inclusiosHtmlForExport === 'function' ? inclusiosHtmlForExport() : '';
  const commentsHtml = typeof commentsHtmlForExport === 'function' ? commentsHtmlForExport() : '';
  const arcsHtml = typeof arcsHtmlForExport === 'function' ? arcsHtmlForExport() : '';
  const pageShell = buildContourPageShellHtml(bodyHtml, {
    isGreek,
    paneState: opts.paneState || (typeof state !== 'undefined' ? state : null),
  });
  const css = contourPageExportCss({ isGreek });
  const printBtn = opts.includePrintButton
    ? '<button onclick="window.print()" style="margin-bottom:16px;padding:8px 12px">Print / Save as PDF</button>'
    : '';
  const fitScript = typeof buildContourExportFitScript === 'function'
    ? buildContourExportFitScript(!!opts.fitOnePage)
    : '';
  const printScript = opts.printScript || '';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + pageTitle + '</title><style>' + css + '</style></head><body>'
    + printBtn
    + legendHtml
    + inclusiosHtml
    + pageShell
    + commentsHtml
    + arcsHtml
    + fitScript
    + printScript
    + '</body></html>';
}
window.buildContourExportDocument = buildContourExportDocument;

injectContourPageTokens();
