/**
 * Shared Contour publication layout composer.
 * Pure layout model for Side-by-Side Print Preview and Side-by-Side DOCX.
 * Contour clause/verse spacing is a minimum; English overflow expands and shifts later anchors.
 */
(function (root) {
  'use strict';

  var ENG_COL_TWIPS = 6200;
  var NUM_COL_TWIPS = 500;
  var HEB_COL_TWIPS = 4100;
  var ENG_FONT_PT = 11.5;
  var ENG_LINE_HEIGHT = 1.2;
  var ENG_AVG_CHAR_EM = 0.5;

  function pageTokens(page) {
    var p = page || (typeof CONTOUR_PAGE !== 'undefined' ? CONTOUR_PAGE : null) || {};
    var letterW = p.letterWidthPx != null ? p.letterWidthPx : 816;
    var letterH = p.letterHeightPx != null ? p.letterHeightPx : 1056;
    var margin = p.marginPx != null ? p.marginPx : 96;
    var bodyFs = p.bodyFontSizePx != null ? p.bodyFontSizePx : 26;
    var bodyLh = p.bodyLineHeight != null ? p.bodyLineHeight : 2.1;
    var breakPx = p.breakPx || { compact: -8, small: 18, medium: 40, large: 72 };
    var verseEm = p.verseSpacingEm || { single: 2.1, oneHalf: 3.15, double: 4.2 };
    return {
      letterWidthPx: letterW,
      letterHeightPx: letterH,
      marginPx: margin,
      printableHeightPx: Math.max(0, letterH - 2 * margin),
      printableWidthPx: Math.max(0, letterW - 2 * margin),
      bodyFontSizePx: bodyFs,
      bodyLineHeight: bodyLh,
      hebrewLinePx: bodyFs * bodyLh,
      breakPx: breakPx,
      verseSpacingEm: verseEm,
      engColTwips: ENG_COL_TWIPS,
      numColTwips: NUM_COL_TWIPS,
      hebColTwips: HEB_COL_TWIPS,
      engContentWidthPx: ENG_COL_TWIPS / 15,
      engFontPx: (ENG_FONT_PT * 96) / 72,
      engLinePx: ((ENG_FONT_PT * 96) / 72) * ENG_LINE_HEIGHT,
    };
  }

  function clauseSpacingPx(clause) {
    if (typeof clauseSpacingAfterPx === 'function') return clauseSpacingAfterPx(clause);
    if (!clause) return 0;
    if (typeof clause.spacingAfterPx === 'number') return Math.round(clause.spacingAfterPx);
    var level = String((clause && clause.spacingAfter) || 'default').toLowerCase();
    var page = pageTokens();
    if (level === 'compact') return page.breakPx.compact || -8;
    if (level === 'small') return page.breakPx.small || 18;
    if (level === 'medium') return page.breakPx.medium || 40;
    if (level === 'large') return page.breakPx.large || 72;
    return 0;
  }

  function verseSpacingPx(verse) {
    if (typeof verseSpacingAfterDocxTwips === 'function' && typeof contourPxToDocxTwips === 'function') {
      var tw = verseSpacingAfterDocxTwips(verse);
      if (tw) return Math.round(tw / 15);
    }
    var level = String((verse && verse.spacingAfter) || 'default');
    if (level === 'onehalf' || level === '1.5') level = 'oneHalf';
    if (level === 'default') return 0;
    var page = pageTokens();
    var em = page.verseSpacingEm[level];
    if (em == null) return 0;
    return Math.round(em * page.bodyFontSizePx);
  }

  function cloneClauses(clauses) {
    return (clauses || []).map(function (c) {
      return {
        indent: c.indent || 0,
        indentPx: typeof c.indentPx === 'number' ? c.indentPx : undefined,
        spacingAfter: c.spacingAfter,
        spacingAfterPx: typeof c.spacingAfterPx === 'number' ? c.spacingAfterPx : undefined,
        alignment: c.alignment,
        words: (c.words || []).map(function (w) {
          return {
            text: w.text || '',
            format: w.format ? Object.assign({}, w.format) : {},
            color: w.color,
            deleted: w.deleted,
            specials: Array.isArray(w.specials) ? w.specials.slice() : [],
          };
        }),
      };
    });
  }

  function verseNumberFromRef(ref) {
    var m = String(ref || '').match(/(\d+)\s*:\s*(\d+)/);
    if (m) return String(+m[2]);
    var bare = String(ref || '').match(/(\d+)\s*$/);
    return bare ? String(+bare[1]) : '';
  }

  function estimateHebrewBlockPx(clauses, metrics) {
    var list = clauses || [];
    if (!list.length) return metrics.hebrewLinePx;
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      total += metrics.hebrewLinePx;
      if (i < list.length - 1) {
        // Inter-clause Contour gaps belong to content; trailing gap is spacingAfter.
        total += Math.max(0, clauseSpacingPx(list[i]));
      }
    }
    return total;
  }

  function estimateEnglishContentPx(text, preserveLineBreaks, metrics) {
    var raw = String(text == null ? '' : text);
    var lines;
    if (preserveLineBreaks) {
      lines = raw.length ? raw.split('\n') : [''];
    } else {
      var collapsed = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      lines = collapsed ? [collapsed] : [''];
    }
    var charsPerLine = Math.max(
      8,
      Math.floor(metrics.engContentWidthPx / (metrics.engFontPx * ENG_AVG_CHAR_EM)),
    );
    var wrapped = 0;
    for (var i = 0; i < lines.length; i++) {
      var len = lines[i].length;
      if (len === 0) {
        wrapped += 1;
        continue;
      }
      wrapped += Math.max(1, Math.ceil(len / charsPerLine));
    }
    return wrapped * metrics.engLinePx;
  }

  function contourTrailingSpacingPx(verse, clauses) {
    var list = clauses || [];
    var last = list.length ? list[list.length - 1] : null;
    var clauseTrail = last ? clauseSpacingPx(last) : 0;
    // Compact (negative) collapses; treat as 0 for publication floor of "gap after".
    if (clauseTrail < 0) clauseTrail = 0;
    return clauseTrail + verseSpacingPx(verse);
  }

  function buildSegment(verse, verseIndex, engSrc, metrics) {
    var clauses = cloneClauses(verse && verse.clauses);
    var contourMinContentPx = estimateHebrewBlockPx(clauses, metrics);
    var contourSpacingAfterPx = contourTrailingSpacingPx(verse, verse && verse.clauses);
    var contourBlockPx = contourMinContentPx + contourSpacingAfterPx;
    var engText = engSrc && engSrc.text != null ? String(engSrc.text) : '';
    var preserve = !!(engSrc && engSrc.preserveLineBreaks);
    var englishContentPx = estimateEnglishContentPx(engText, preserve, metrics);
    // Match Word/preview: Contour trail lives inside the Hebrew column, so segment
    // height is max(Contour block, English) — never Contour-lines + English + trail.
    var contentPx = Math.max(contourBlockPx, englishContentPx);
    return {
      type: 'verse-segment',
      verseIndex: verseIndex,
      verseNumber: verseNumberFromRef(verse && verse.ref),
      ref: (verse && verse.ref) || '',
      hebrewClauses: clauses,
      contourMinContentPx: contourMinContentPx,
      contourSpacingAfterPx: contourSpacingAfterPx,
      english: {
        text: engText,
        preserveLineBreaks: preserve,
        source: (engSrc && engSrc.source) || '',
      },
      englishContentPx: englishContentPx,
      contentPx: contentPx,
      // Extra after Contour block only when English-driven expansion needs more than Contour floor.
      spacingAfterPx: 0,
      keepTogether: true,
      splitPart: null,
      splitOf: null,
    };
  }

  /**
   * Ensure Contour minima are never compressed and English overflow shifts later anchors.
   * Contour trailing spacing is part of the Contour block floor inside contentPx.
   */
  function applyEnglishExpansion(segments) {
    var i;
    for (i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var contourBlock = seg.contourMinContentPx + seg.contourSpacingAfterPx;
      seg.contentPx = Math.max(contourBlock, seg.englishContentPx);
      if (seg.spacingAfterPx < 0) seg.spacingAfterPx = 0;
    }
    // Collision pass: Contour-min start of i+1 must stay ≥ Contour-only distance from i.
    var contourCursor = 0;
    var pubCursor = 0;
    for (i = 0; i < segments.length; i++) {
      var s = segments[i];
      var contourBlock = s.contourMinContentPx + s.contourSpacingAfterPx;
      var contourStart = contourCursor;
      var pubStart = pubCursor;
      if (pubStart < contourStart && i > 0) {
        segments[i - 1].spacingAfterPx += contourStart - pubStart;
        pubCursor = contourStart;
        pubStart = contourStart;
      }
      contourCursor = contourStart + contourBlock;
      pubCursor = pubStart + s.contentPx + s.spacingAfterPx;
      if (pubCursor < contourCursor) {
        s.spacingAfterPx += contourCursor - pubCursor;
        pubCursor = contourCursor;
      }
    }
    return segments;
  }

  function segmentHeightOnPage(seg, isLastOnPage) {
    // Trailing Contour/expansion gap after the last segment on a page still occupies space
    // when measuring keep-together against printable height (matches Word cell padding feel).
    return seg.contentPx + (isLastOnPage ? 0 : seg.spacingAfterPx);
  }

  function splitTallSegment(seg, printablePx) {
    var parts = [];
    var clauses = seg.hebrewClauses || [];
    var metrics = pageTokens();
    // Prefer splitting English lines when English alone exceeds the page.
    if (seg.englishContentPx > printablePx && seg.english.preserveLineBreaks) {
      var lines = String(seg.english.text || '').split('\n');
      var chunkLines = [];
      var chunkPx = 0;
      var partIndex = 0;
      function flushEnglishChunk(isLast) {
        if (!chunkLines.length && partIndex > 0) return;
        var text = chunkLines.join('\n');
        var engPx = estimateEnglishContentPx(text, true, metrics);
        var heb = partIndex === 0 ? clauses : [];
        var hebPx = estimateHebrewBlockPx(heb, metrics);
        parts.push({
          type: 'verse-segment',
          verseIndex: seg.verseIndex,
          verseNumber: partIndex === 0 ? seg.verseNumber : '',
          ref: seg.ref,
          hebrewClauses: heb,
          contourMinContentPx: hebPx,
          contourSpacingAfterPx: isLast ? seg.contourSpacingAfterPx : 0,
          english: {
            text: text,
            preserveLineBreaks: true,
            source: seg.english.source,
          },
          englishContentPx: engPx,
          contentPx: Math.max(hebPx + (isLast ? seg.contourSpacingAfterPx : 0), engPx),
          spacingAfterPx: isLast ? seg.spacingAfterPx : 0,
          keepTogether: false,
          splitPart: partIndex,
          splitOf: seg.verseIndex,
        });
        partIndex += 1;
        chunkLines = [];
        chunkPx = 0;
      }
      for (var li = 0; li < lines.length; li++) {
        var linePx = estimateEnglishContentPx(lines[li], true, metrics);
        if (chunkLines.length && chunkPx + linePx > printablePx) flushEnglishChunk(false);
        chunkLines.push(lines[li]);
        chunkPx += linePx;
      }
      flushEnglishChunk(true);
      if (parts.length) return parts;
    }

    // Clause-level split: first part carries English + as many clauses as fit.
    if (clauses.length <= 1) {
      // Cannot split further; emit as-is (may overflow a single page).
      return [seg];
    }
    var budget = Math.max(metrics.hebrewLinePx, printablePx - Math.min(seg.englishContentPx, printablePx * 0.5));
    var used = 0;
    var batch = [];
    var first = true;
    var splitIndex = 0;
    function flushClauses(isLast) {
      if (!batch.length) return;
      var hebPx = estimateHebrewBlockPx(batch, metrics);
      var engText = first ? seg.english.text : '';
      var engPx = first ? seg.englishContentPx : 0;
      var trail = isLast ? seg.contourSpacingAfterPx : 0;
      parts.push({
        type: 'verse-segment',
        verseIndex: seg.verseIndex,
        verseNumber: first ? seg.verseNumber : '',
        ref: seg.ref,
        hebrewClauses: batch,
        contourMinContentPx: hebPx,
        contourSpacingAfterPx: trail,
        english: {
          text: engText,
          preserveLineBreaks: first ? seg.english.preserveLineBreaks : false,
          source: seg.english.source,
        },
        englishContentPx: engPx,
        contentPx: Math.max(hebPx + trail, engPx),
        spacingAfterPx: isLast ? seg.spacingAfterPx : 0,
        keepTogether: false,
        splitPart: splitIndex,
        splitOf: seg.verseIndex,
      });
      splitIndex += 1;
      first = false;
      batch = [];
      used = 0;
    }
    for (var ci = 0; ci < clauses.length; ci++) {
      var add = metrics.hebrewLinePx;
      if (batch.length) add += Math.max(0, clauseSpacingPx(batch[batch.length - 1]));
      if (batch.length && used + add > budget) flushClauses(false);
      batch.push(clauses[ci]);
      used += add;
    }
    flushClauses(true);
    return parts.length ? parts : [seg];
  }

  function paginateSegments(segments, metrics) {
    var printable = metrics.printableHeightPx;
    var pages = [];
    var current = [];
    var used = 0;

    function pushPage() {
      if (!current.length) return;
      pages.push({ segments: current });
      current = [];
      used = 0;
    }

    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var pieces = [seg];
      if (seg.contentPx > printable) {
        pieces = splitTallSegment(seg, printable);
      }
      for (var p = 0; p < pieces.length; p++) {
        var piece = pieces[p];
        var h = piece.contentPx;
        var gap = piece.spacingAfterPx;
        // If keep-together and won't fit with current page content, break page first.
        if (current.length && used + h > printable) {
          pushPage();
        }
        if (!current.length && h > printable) {
          // Still too tall after split attempt — place alone.
          current.push(piece);
          pushPage();
          continue;
        }
        current.push(piece);
        used += h + gap;
        // If trailing gap pushed past page end, still OK (gap is after content).
        if (used - gap > printable) {
          // Content itself overflowed somehow; force new page after this piece.
          pushPage();
        }
      }
    }
    pushPage();
    return pages;
  }

  /**
   * @param {object} opts
   * @param {Array} opts.verses
   * @param {function} opts.getEnglishForVerse - (verse, verseIndex) => { text, preserveLineBreaks, source? }
   * @param {object} [opts.page] - CONTOUR_PAGE-like metrics override
   * @returns {{ segments, pages, metrics }}
   */
  function composePublicationLayout(opts) {
    opts = opts || {};
    var verses = opts.verses || [];
    var getEng =
      opts.getEnglishForVerse ||
      function () {
        return { text: '', preserveLineBreaks: false };
      };
    var metrics = pageTokens(opts.page);
    var segments = [];
    for (var vi = 0; vi < verses.length; vi++) {
      var v = verses[vi];
      var engSrc = getEng(v, vi) || { text: '', preserveLineBreaks: false };
      segments.push(buildSegment(v, vi, engSrc, metrics));
    }
    applyEnglishExpansion(segments);
    var pages = paginateSegments(segments, metrics);
    return {
      segments: segments,
      pages: pages,
      metrics: metrics,
    };
  }

  root.composePublicationLayout = composePublicationLayout;
  root.PUBLICATION_LAYOUT_COL_TWIPS = {
    eng: ENG_COL_TWIPS,
    num: NUM_COL_TWIPS,
    heb: HEB_COL_TWIPS,
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
