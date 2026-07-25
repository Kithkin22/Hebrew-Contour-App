/**
 * Side-by-Side publication composer — natural-height verse rows.
 *
 * Atomic unit: one invisible row per canonical verse
 *   [ Hebrew | Verse# | English ]
 *
 * Contour supplies Hebrew text/lineation/formatting only — NOT canvas spacing.
 * English joins by canonical verse key. Preview and DOCX share this model.
 */
(function (root) {
  'use strict';

  // Proportions ~46% | 6% | 48% of 10800 twips usable width
  var HEB_COL_TWIPS = 5000;
  var NUM_COL_TWIPS = 650;
  var ENG_COL_TWIPS = 5150;
  var ENG_AVG_CHAR_EM = 0.5;

  var PUBLICATION_PAGE = {
    letterWidthPx: 816,
    letterHeightPx: 1056,
    marginPx: 72,
    fontPt: 13,
    fontPx: (13 * 96) / 72,
    lineHeight: 1.4,
    engFontPt: 13,
    engLineHeight: 1.35,
    indentStepPx: 14,
    rowGapPx: 14, // natural inter-verse gap (not Contour canvas)
    hebFontHalfPoints: 26,
    engFontHalfPoints: 26,
  };

  function pageTokens(page) {
    var pub = PUBLICATION_PAGE;
    var p = page || {};
    var letterW = p.letterWidthPx != null ? p.letterWidthPx : pub.letterWidthPx;
    var letterH = p.letterHeightPx != null ? p.letterHeightPx : pub.letterHeightPx;
    var margin = p.marginPx != null ? p.marginPx : pub.marginPx;
    var hebFs = p.bodyFontSizePx != null ? p.bodyFontSizePx : pub.fontPx;
    var hebLh = p.bodyLineHeight != null ? p.bodyLineHeight : pub.lineHeight;
    var engPt = p.engFontPt != null ? p.engFontPt : pub.engFontPt;
    var engLh = p.engLineHeight != null ? p.engLineHeight : pub.engLineHeight;
    var engFontPx = (engPt * 96) / 72;
    return {
      letterWidthPx: letterW,
      letterHeightPx: letterH,
      marginPx: margin,
      printableHeightPx: Math.max(0, letterH - 2 * margin),
      printableWidthPx: Math.max(0, letterW - 2 * margin),
      bodyFontSizePx: hebFs,
      bodyLineHeight: hebLh,
      hebrewLinePx: hebFs * hebLh,
      indentStepPx: p.indentStepPx != null ? p.indentStepPx : pub.indentStepPx,
      rowGapPx: p.rowGapPx != null ? p.rowGapPx : pub.rowGapPx,
      engColTwips: ENG_COL_TWIPS,
      numColTwips: NUM_COL_TWIPS,
      hebColTwips: HEB_COL_TWIPS,
      engContentWidthPx: ENG_COL_TWIPS / 15,
      hebContentWidthPx: HEB_COL_TWIPS / 15,
      engFontPx: engFontPx,
      engLinePx: engFontPx * engLh,
      engFontPt: engPt,
      hebFontHalfPoints: pub.hebFontHalfPoints,
      engFontHalfPoints: pub.engFontHalfPoints,
    };
  }

  function publicationIndentPx(clause, metrics) {
    var m = metrics || pageTokens();
    var stepPub = m.indentStepPx || 14;
    if (!clause) return 0;
    if (typeof clause.indentPx === 'number' && typeof contourTabIndentStepPx === 'function') {
      var stepC = contourTabIndentStepPx() || 30;
      var levels = stepC > 0 ? clause.indentPx / stepC : clause.indent || 0;
      return Math.max(0, Math.round(levels * stepPub));
    }
    if (typeof clauseIndentPx === 'function' && typeof contourTabIndentStepPx === 'function') {
      var cPx = clauseIndentPx(clause);
      var step = contourTabIndentStepPx() || 30;
      return Math.max(0, Math.round((step > 0 ? cPx / step : clause.indent || 0) * stepPub));
    }
    return Math.max(0, Math.round((clause.indent || 0) * stepPub));
  }

  function publicationIndentDocxTwips(clause) {
    return Math.round(publicationIndentPx(clause) * 15);
  }

  function cloneClauses(clauses) {
    return (clauses || []).map(function (c) {
      return {
        indent: c.indent || 0,
        indentPx: typeof c.indentPx === 'number' ? c.indentPx : undefined,
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

  function resolveVerseKey(ref) {
    if (typeof canonicalAlephVerseKey === 'function') {
      var k = canonicalAlephVerseKey(ref);
      if (k) return k;
    }
    return String(ref || '').trim();
  }

  function englishLinesFromText(text, preserveLineBreaks) {
    var raw = String(text == null ? '' : text);
    if (preserveLineBreaks) return raw.length ? raw.split('\n') : [''];
    var collapsed = raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    return collapsed ? [collapsed] : [''];
  }

  function estimateLineWrapCount(text, contentWidthPx, fontPx) {
    var len = String(text || '').length;
    if (!len) return 1;
    var charsPerLine = Math.max(8, Math.floor(contentWidthPx / (fontPx * ENG_AVG_CHAR_EM)));
    return Math.max(1, Math.ceil(len / charsPerLine));
  }

  function estimateHebrewHeight(clauses, metrics) {
    var list = clauses || [];
    if (!list.length) return metrics.hebrewLinePx;
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      var words = (list[i].words || [])
        .map(function (w) {
          return w.text || '';
        })
        .join(' ');
      var wraps = estimateLineWrapCount(words, metrics.hebContentWidthPx, metrics.bodyFontSizePx);
      total += wraps * metrics.hebrewLinePx;
    }
    return total;
  }

  function estimateEnglishHeight(text, preserveLineBreaks, metrics) {
    var lines = englishLinesFromText(text, preserveLineBreaks);
    var total = 0;
    for (var i = 0; i < lines.length; i++) {
      total += estimateLineWrapCount(lines[i], metrics.engContentWidthPx, metrics.engFontPx) * metrics.engLinePx;
    }
    return total || metrics.engLinePx;
  }

  function hebrewWordCount(verse) {
    var n = 0;
    ((verse && verse.clauses) || []).forEach(function (c) {
      (c.words || []).forEach(function (w) {
        if (String((w && w.text) || '').trim()) n++;
      });
    });
    return n;
  }

  function tokenVerseKey(token, fallbackKey) {
    if (!token) return fallbackKey;
    var raw = token.verseKey || token.verseRef || token.ref || token.canonicalVerse || '';
    if (!raw) return fallbackKey;
    return resolveVerseKey(raw) || fallbackKey;
  }

  /**
   * Split a Contour verse whose clauses/words carry mixed canonical keys.
   * Preserves display order; never assigns a whole mixed block to the first verse.
   */
  function expandContourVerseUnits(v, vi, parentKey) {
    var units = [];
    var clauses = (v && v.clauses) || [];
    var currentKey = null;
    var bucket = [];

    function flush() {
      if (!bucket.length || !currentKey) return;
      units.push({
        verseKey: currentKey,
        verseIndex: vi,
        verseNumber: verseNumberFromRef(currentKey),
        hebrewVerse: { ref: currentKey, clauses: cloneClauses(bucket) },
        parentRef: (v && v.ref) || parentKey,
      });
      bucket = [];
    }

    clauses.forEach(function (c) {
      var clauseKey = tokenVerseKey(c, parentKey);
      var words = c.words || [];
      if (!words.length) {
        if (clauseKey !== currentKey) {
          flush();
          currentKey = clauseKey;
        }
        bucket.push(c);
        return;
      }
      var runKey = null;
      var runWords = [];
      function flushRun() {
        if (!runWords.length || !runKey) return;
        if (runKey !== currentKey) {
          flush();
          currentKey = runKey;
        }
        bucket.push({
          indent: c.indent || 0,
          indentPx: typeof c.indentPx === 'number' ? c.indentPx : undefined,
          alignment: c.alignment,
          words: runWords,
          verseKey: runKey,
        });
        runWords = [];
      }
      words.forEach(function (w) {
        var wk = tokenVerseKey(w, clauseKey);
        if (runKey && wk !== runKey) flushRun();
        runKey = wk;
        runWords.push(w);
      });
      flushRun();
    });
    flush();

    if (!units.length) {
      units.push({
        verseKey: parentKey,
        verseIndex: vi,
        verseNumber: verseNumberFromRef(parentKey),
        hebrewVerse: { ref: parentKey, clauses: cloneClauses(clauses) },
        parentRef: (v && v.ref) || parentKey,
      });
    }
    return units;
  }

  /**
   * Join Hebrew Contour verses + English by canonical verse key.
   * Returns { rows, report, errors }.
   */
  function buildCanonicalVersePairs(verses, getEnglishForVerse) {
    var hebrewByVerse = Object.create(null);
    var order = [];
    var errors = [];
    var report = [];

    (verses || []).forEach(function (v, vi) {
      var parentKey = resolveVerseKey(v && v.ref);
      if (!parentKey) {
        errors.push('Missing canonical verse key for Contour verse at index ' + vi);
        return;
      }
      var units = expandContourVerseUnits(v, vi, parentKey);
      units.forEach(function (unit) {
        var key = unit.verseKey;
        if (hebrewByVerse[key]) {
          var prev = hebrewByVerse[key];
          // Fragments from the same Contour verse (mixed-block split) combine in order.
          // Two distinct Contour verse records claiming the same key fail validation.
          if (prev.verseIndex !== vi) {
            errors.push('Duplicate Hebrew verse for ' + key);
            return;
          }
          prev.hebrewVerse.clauses = (prev.hebrewVerse.clauses || []).concat(
            unit.hebrewVerse.clauses || [],
          );
          return;
        }
        hebrewByVerse[key] = unit;
        order.push(key);
      });
    });

    var englishSeen = Object.create(null);
    var rows = [];
    order.forEach(function (key, rowIndex) {
      var heb = hebrewByVerse[key];
      var v = heb.hebrewVerse;
      var lookupVerse = { ref: key, clauses: v.clauses };
      var engSrc =
        (typeof getEnglishForVerse === 'function' &&
          getEnglishForVerse(lookupVerse, heb.verseIndex)) || {
          text: '',
          preserveLineBreaks: false,
        };
      if (engSrc && engSrc.verseKey) {
        var engKey = resolveVerseKey(engSrc.verseKey);
        if (engKey && engKey !== key) {
          errors.push('English/Hebrew key mismatch for ' + key + ' (English claimed ' + engKey + ')');
        }
      }
      if (englishSeen[key]) {
        errors.push('Duplicate English verse for ' + key);
      }
      englishSeen[key] = true;

      var hasHeb = hebrewWordCount(v) > 0;
      if (!hasHeb) {
        errors.push('Missing Hebrew for ' + key);
      }

      var num = verseNumberFromRef(key) || heb.verseNumber || '';
      var keyVerse = (String(key).match(/:(\d+)\s*$/) || [])[1];
      if (num && keyVerse && String(+keyVerse) !== String(num)) {
        errors.push('Verse number mismatch for ' + key);
      }

      rows.push({
        verseKey: key,
        verseIndex: heb.verseIndex,
        verseNumber: num,
        hebrewVerse: v,
        englishSrc: engSrc,
      });
      report.push({
        verseKey: key,
        hebrewFound: hasHeb,
        englishFound: !!(engSrc && String(engSrc.text || '').length),
        outputRow: rowIndex + 1,
        status: hasHeb ? 'verified' : 'missing-hebrew',
      });
    });

    if (!rows.length && (verses || []).length) {
      errors.push('No verifiable Hebrew/English verse rows could be built');
    }

    return { rows: rows, report: report, errors: errors, hebrewByVerse: hebrewByVerse };
  }

  function validatePublicationPairing(pairResult) {
    var errors = (pairResult && pairResult.errors) || [];
    return {
      ok: errors.length === 0,
      errors: errors,
      report: (pairResult && pairResult.report) || [],
    };
  }

  function buildVerseRow(pair, metrics) {
    var clauses = cloneClauses(pair.hebrewVerse && pair.hebrewVerse.clauses);
    var engText = pair.englishSrc && pair.englishSrc.text != null ? String(pair.englishSrc.text) : '';
    var preserve = !!(pair.englishSrc && pair.englishSrc.preserveLineBreaks);
    var lines = englishLinesFromText(engText, preserve);
    var hebH = estimateHebrewHeight(clauses, metrics);
    var engH = estimateEnglishHeight(engText, preserve, metrics);
    var rowHeight = Math.max(hebH, engH);

    return {
      type: 'verse-row',
      verseKey: pair.verseKey,
      verseIndex: pair.verseIndex,
      verseNumber: pair.verseNumber,
      hebrew: {
        lines: clauses,
        units: clauses,
        direction: 'rtl',
        measuredHeight: hebH,
      },
      english: {
        text: engText,
        lines: lines,
        preserveLineBreaks: preserve,
        source: (pair.englishSrc && pair.englishSrc.source) || '',
        measuredHeight: engH,
      },
      measuredHebrewHeight: hebH,
      measuredEnglishHeight: engH,
      rowHeight: rowHeight,
      keepTogether: true,
      splitPart: null,
      // Compat aliases for existing preview/DOCX wiring
      ref: pair.verseKey,
      verseNumberText: pair.verseNumber,
      hebrewClauses: clauses,
      contentPx: rowHeight,
      finalHeight: rowHeight,
      contentHeight: rowHeight,
      spacingAfter: metrics.rowGapPx,
      contourSpacingAfterPx: metrics.rowGapPx,
      englishContentPx: engH,
      contourMinContentPx: hebH,
    };
  }

  function splitTallRow(row, printablePx, metrics) {
    if (row.rowHeight <= printablePx) return [row];
    var clauses = row.hebrew.units || [];
    var lines = row.english.lines || [''];
    var engChunks = [];
    var chunk = [];
    var chunkPx = 0;
    for (var i = 0; i < lines.length; i++) {
      var lp = estimateEnglishHeight(lines[i], true, metrics);
      if (chunk.length && chunkPx + lp > printablePx * 0.55) {
        engChunks.push(chunk);
        chunk = [];
        chunkPx = 0;
      }
      chunk.push(lines[i]);
      chunkPx += lp;
    }
    if (chunk.length) engChunks.push(chunk);
    if (!engChunks.length) engChunks = [['']];

    var clauseChunks = [];
    if (!clauses.length) {
      clauseChunks = engChunks.map(function () {
        return [];
      });
    } else {
      var per = Math.max(1, Math.ceil(clauses.length / engChunks.length));
      for (var c = 0; c < clauses.length; c += per) clauseChunks.push(clauses.slice(c, c + per));
      while (clauseChunks.length < engChunks.length) clauseChunks.push([]);
      while (engChunks.length < clauseChunks.length) engChunks.push(['']);
    }

    var parts = [];
    var n = Math.max(engChunks.length, clauseChunks.length);
    for (var p = 0; p < n; p++) {
      var eLines = engChunks[p] || [''];
      var hUnits = clauseChunks[p] || [];
      var eText = eLines.join('\n');
      var eH = estimateEnglishHeight(eText, true, metrics);
      var hH = estimateHebrewHeight(hUnits, metrics);
      var rh = Math.max(eH, hH);
      var isLast = p === n - 1;
      parts.push({
        type: 'verse-row',
        verseKey: row.verseKey,
        verseIndex: row.verseIndex,
        verseNumber: p === 0 ? row.verseNumber : '',
        hebrew: { lines: hUnits, units: hUnits, direction: 'rtl', measuredHeight: hH },
        english: {
          text: eText,
          lines: eLines,
          preserveLineBreaks: true,
          source: row.english.source,
          measuredHeight: eH,
        },
        measuredHebrewHeight: hH,
        measuredEnglishHeight: eH,
        rowHeight: rh,
        keepTogether: false,
        splitPart: p,
        ref: row.verseKey,
        verseNumberText: p === 0 ? row.verseNumber : '',
        hebrewClauses: hUnits,
        contentPx: rh,
        finalHeight: rh,
        contentHeight: rh,
        spacingAfter: isLast ? metrics.rowGapPx : 0,
        contourSpacingAfterPx: isLast ? metrics.rowGapPx : 0,
        englishContentPx: eH,
        contourMinContentPx: hH,
      });
    }
    return parts.length ? parts : [row];
  }

  function paginateRows(rows, metrics) {
    var printable = metrics.printableHeightPx;
    var pages = [];
    var current = [];
    var used = 0;

    function pushPage() {
      if (!current.length) return;
      pages.push({ rows: current, blocks: current, segments: current });
      current = [];
      used = 0;
    }

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var pieces = row.rowHeight > printable ? splitTallRow(row, printable, metrics) : [row];
      for (var p = 0; p < pieces.length; p++) {
        var piece = pieces[p];
        var h = piece.rowHeight;
        var gap = piece.spacingAfter || 0;
        if (current.length && used + h > printable) pushPage();
        if (!current.length && h > printable) {
          current.push(piece);
          pushPage();
          continue;
        }
        current.push(piece);
        used += h + gap;
      }
    }
    pushPage();
    return pages;
  }

  /**
   * @param {object} opts
   * @param {Array} opts.verses - Contour verses
   * @param {function} opts.getEnglishForVerse
   * @param {boolean} [opts.throwOnPairingError=false]
   * @returns {{ rows, blocks, segments, pages, metrics, pairing }}
   */
  function composePublicationLayout(opts) {
    opts = opts || {};
    var verses = opts.verses || [];
    var getEng = opts.getEnglishForVerse || function () {
      return { text: '', preserveLineBreaks: false };
    };
    var metrics = pageTokens(opts.page);
    var paired = buildCanonicalVersePairs(verses, getEng);
    var validation = validatePublicationPairing(paired);
    if (!validation.ok && opts.throwOnPairingError) {
      var first = validation.errors[0] || 'unknown verse';
      var verseHint = first.match(/(?:for|verse)\s+(.+?)(?:\.|$)/i);
      var named = verseHint ? verseHint[1].replace(/\.$/, '') : first;
      var err = new Error(
        'Side-by-side export could not verify Hebrew and English pairing for ' + named + '.',
      );
      err.pairingErrors = validation.errors;
      err.pairingReport = validation.report;
      throw err;
    }

    var rows = paired.rows.map(function (pair) {
      return buildVerseRow(pair, metrics);
    });
    var pages = paginateRows(rows, metrics);
    return {
      rows: rows,
      blocks: rows,
      segments: rows,
      pages: pages,
      metrics: metrics,
      pairing: validation,
    };
  }

  root.PUBLICATION_PAGE = PUBLICATION_PAGE;
  root.composePublicationLayout = composePublicationLayout;
  root.buildCanonicalVersePairs = buildCanonicalVersePairs;
  root.validatePublicationPairing = validatePublicationPairing;
  root.publicationIndentPx = publicationIndentPx;
  root.publicationIndentDocxTwips = publicationIndentDocxTwips;
  // No Contour discourse spacing in publication — stubs for any leftover callers
  root.publicationClauseSpacingPx = function () {
    return 0;
  };
  root.publicationVerseSpacingPx = function () {
    return 0;
  };
  root.publicationSpacingAfterDocxTwips = function () {
    return 0;
  };
  root.publicationVerseSpacingDocxTwips = function () {
    return 0;
  };
  root.PUBLICATION_LAYOUT_COL_TWIPS = {
    heb: HEB_COL_TWIPS,
    num: NUM_COL_TWIPS,
    eng: ENG_COL_TWIPS,
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
