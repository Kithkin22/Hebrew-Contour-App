/* Greek Inspector lexicon — MorphGNT + Open Scriptures Strong's + Perseus LSJ (CC-BY-SA / open).
 * BDAG is not embedded; optional external licensed lookup hook only. */
(function(){
  const MORPHGNT_BASE = 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/';
  const STRONGS_URL = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js';
  const LSJ_URL = 'https://raw.githubusercontent.com/perseids-project/lsj-js/master/vendor/lsj.json';
  const LSJ_LINK_BASE = 'https://apps.perseids.org/lsj/#/search/';

  const MORPHGNT_BOOK = {
    Matt:'61-Mt', Mark:'62-Mk', Luke:'63-Lk', John:'64-Jn', Acts:'65-Ac', Rom:'66-Ro',
    '1Cor':'67-1Co', '2Cor':'68-2Co', Gal:'69-Ga', Eph:'70-Eph', Phil:'71-Php', Col:'72-Col',
    '1Thess':'73-1Th', '2Thess':'74-2Th', '1Tim':'75-1Ti', '2Tim':'76-2Ti', Titus:'77-Tit',
    Phlm:'78-Phm', Heb:'79-Heb', Jas:'80-Jas', '1Pet':'81-1Pe', '2Pet':'82-2Pe',
    '1John':'83-1Jn', '2John':'84-2Jn', '3John':'85-3Jn', Jude:'86-Jud', Rev:'87-Re'
  };

  const POS_LABEL = {
    A:'adjective', C:'conjunction', D:'adverb', I:'interjection', N:'noun', P:'preposition',
    RA:'article', RD:'demonstrative pronoun', RI:'interrogative pronoun', RP:'personal pronoun',
    RR:'relative pronoun', V:'verb', X:'particle'
  };
  const TENSE = {P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Y:'pluperfect'};
  const VOICE = {A:'active',M:'middle',P:'passive'};
  const MOOD = {I:'indicative',D:'imperative',S:'subjunctive',O:'optative',N:'infinitive',P:'participle'};
  const CASE = {N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative'};
  const NUM = {S:'singular',P:'plural'};
  const GEND = {M:'masculine',F:'feminine',N:'neuter'};

  let strongsDict = null;
  let strongsLemmaIndex = null;
  let lsjDict = null;
  let lsjGreekIndex = null;
  const morphCache = {};
  const lookupCache = {};

  function stripHtml(html){
    const d = document.createElement('div');
    d.innerHTML = String(html || '');
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function cleanGreekWord(text){
    return String(text || '')
      .replace(/[0-9]/g, '')
      .replace(/[.,;:!?()[\]{}«»"'·—–-]/g, '')
      .trim();
  }

  function normGreek(text){
    return cleanGreekWord(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[᾽᾿''`]/g, '')
      .toLowerCase();
  }

  function decodeMorphCode(pos, code){
    const c = String(code || '').replace(/-/g, '');
    if(pos === 'V-' || pos === 'V'){
      const person = {1:'1st',2:'2nd',3:'3rd'}[c[0]] || '';
      const tense = TENSE[c[1]] || '';
      const voice = VOICE[c[2]] || '';
      const mood = MOOD[c[3]] || '';
      const case_ = CASE[c[4]] || '';
      const num = NUM[c[5]] || '';
      const gend = GEND[c[6]] || '';
      return [person, tense, voice, mood, case_, num, gend].filter(Boolean).join(' ');
    }
    const case_ = CASE[c[0]] || '';
    const num = NUM[c[1]] || '';
    const gend = GEND[c[2]] || '';
    return [POS_LABEL[pos] || pos, case_, num, gend].filter(Boolean).join(' ');
  }

  async function loadStrongs(){
    if(strongsDict) return strongsDict;
    const resp = await fetch(STRONGS_URL);
    if(!resp.ok) throw new Error('Strong\'s load failed');
    const text = await resp.text();
    const m = text.match(/var\s+strongsGreekDictionary\s*=\s*(\{[\s\S]*\})\s*;?/);
    if(!m) throw new Error('Strong\'s parse failed');
    strongsDict = JSON.parse(m[1]);
    strongsLemmaIndex = {};
    Object.keys(strongsDict).forEach(id => {
      const entry = strongsDict[id];
      const key = normGreek(entry.lemma || entry.translit || '');
      if(key && !strongsLemmaIndex[key]) strongsLemmaIndex[key] = id;
    });
    return strongsDict;
  }

  async function loadLsj(){
    if(lsjDict) return lsjDict;
    const resp = await fetch(LSJ_URL);
    if(!resp.ok) throw new Error('LSJ load failed');
    lsjDict = await resp.json();
    lsjGreekIndex = {};
    Object.keys(lsjDict).forEach(headword => {
      const entry = lsjDict[headword];
      (entry.g || []).forEach(form => {
        const k = normGreek(form);
        if(k && !lsjGreekIndex[k]) lsjGreekIndex[k] = headword;
      });
      (entry.m || []).forEach(form => {
        const k = normGreek(form);
        if(k && !lsjGreekIndex[k]) lsjGreekIndex[k] = headword;
      });
      const hk = normGreek(headword);
      if(hk && !lsjGreekIndex[hk]) lsjGreekIndex[hk] = headword;
    });
    return lsjDict;
  }

  function parseMorphgntText(raw){
    const byVerse = {};
    raw.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      if(parts.length < 7) return;
      const loc = parts[0];
      const chapter = parseInt(loc.slice(2, 4), 10);
      const verse = parseInt(loc.slice(4, 6), 10);
      const pos = parts[1];
      const morphCode = parts[2];
      const lemma = parts[parts.length - 1];
      const surface = parts[parts.length - 2];
      const key = chapter + ':' + verse;
      if(!byVerse[key]) byVerse[key] = [];
      byVerse[key].push({
        chapter, verse,
        pos, morphCode,
        parsing: decodeMorphCode(pos, morphCode),
        lemma, surface
      });
    });
    return byVerse;
  }

  window.loadGreekMorphgnt = async function(bookId){
    const file = MORPHGNT_BOOK[bookId];
    if(!file) return null;
    if(morphCache[bookId]) return morphCache[bookId];
    const resp = await fetch(MORPHGNT_BASE + file + '-morphgnt.txt');
    if(!resp.ok) throw new Error('MorphGNT load failed');
    morphCache[bookId] = parseMorphgntText(await resp.text());
    loadStrongs().catch(err => console.warn('Strong\'s preload failed', err));
    return morphCache[bookId];
  };

  function parseRefChapterVerse(ref){
    const m = String(ref || '').match(/(\d+)\s*:\s*(\d+)/);
    if(!m) return null;
    return {chapter: +m[1], verse: +m[2]};
  }

  function wordIndexInVerse(vi, ci, wi){
    if(!window.state || !state.verses || !state.verses[vi]) return wi;
    let idx = 0;
    const verse = state.verses[vi];
    for(let c = 0; c < verse.clauses.length; c++){
      const clause = verse.clauses[c];
      for(let w = 0; w < clause.words.length; w++){
        if(c === ci && w === wi) return idx;
        if(!clause.words[w].deleted) idx++;
      }
    }
    return wi;
  }

  function activeGreekBookId(){
    const sel = document.getElementById('bookSelect');
    if(sel && sel.value) return sel.value;
    return null;
  }

  function morphEntryForWord(wordEl){
    const bookId = activeGreekBookId();
    const data = bookId && morphCache[bookId];
    if(!data || !wordEl || !window.state) return null;
    const v = +wordEl.dataset.v;
    const c = +wordEl.dataset.c;
    const w = +wordEl.dataset.w;
    const ref = state.verses[v] && state.verses[v].ref;
    const cv = parseRefChapterVerse(ref);
    if(!cv) return null;
    const list = data[cv.chapter + ':' + cv.verse];
    if(!list || !list.length) return null;
    const idx = wordIndexInVerse(v, c, w);
    return list[idx] || list[Math.min(idx, list.length - 1)];
  }

  function lookupStrongs(lemma){
    if(!strongsLemmaIndex || !strongsDict) return null;
    const id = strongsLemmaIndex[normGreek(lemma)];
    if(!id) return null;
    const entry = strongsDict[id];
    const gloss = stripHtml(entry.strongs_def || '').replace(/^\s+/, '');
    return {
      id,
      lemma: entry.lemma || lemma,
      gloss: gloss.length > 160 ? gloss.slice(0, 157) + '…' : gloss,
      derivation: stripHtml(entry.derivation || '')
    };
  }

  function lookupLsj(lemma){
    if(!lsjDict || !lsjGreekIndex) return null;
    const headword = lsjGreekIndex[normGreek(lemma)] || lsjDict[lemma] && lemma;
    const key = headword || (lsjDict[lemma] ? lemma : null);
    if(!key || !lsjDict[key]) return null;
    const entry = lsjDict[key];
    const gloss = stripHtml(entry.d || '');
    return {
      headword: key,
      gloss: gloss.length > 200 ? gloss.slice(0, 197) + '…' : gloss,
      url: LSJ_LINK_BASE + encodeURIComponent(key)
    };
  }

  async function lookupGreekWord(wordEl, surfaceWord){
    const cacheKey = [surfaceWord, wordEl && wordEl.dataset.v, wordEl && wordEl.dataset.c, wordEl && wordEl.dataset.w].join('|');
    if(lookupCache[cacheKey]) return lookupCache[cacheKey];

    await Promise.all([loadStrongs(), loadLsj()]);

    const morph = morphEntryForWord(wordEl);
    const lemma = (morph && morph.lemma) || cleanGreekWord(surfaceWord);
    const strongs = lookupStrongs(lemma);
    const lsj = lookupLsj(lemma);

    const result = {
      word: cleanGreekWord(surfaceWord) || lemma,
      lemma,
      root: lemma,
      parsing: (morph && morph.parsing) || '—',
      gloss: (strongs && strongs.gloss) || '—',
      strongs: strongs ? strongs.id : '—',
      strongsUrl: strongs ? 'https://openscriptures.org/strongs/greek/' + strongs.id.replace('G', '') + '.html' : '',
      lsj: lsj || null
    };

    lookupCache[cacheKey] = result;
    return result;
  }

  function ensureInspectorRows(){
    const box = document.getElementById('wordInspector');
    if(!box) return;
    // Contour now creates #wiLemma itself (Lexical form). Only add greek-only rows here.
    if(document.getElementById('wiGloss')) return;

    const wordRow = box.querySelector('#wiWord') && box.querySelector('#wiWord').closest('.wi-row');
    const rootRow = box.querySelector('#wiRoot') && box.querySelector('#wiRoot').closest('.wi-row');
    const parsingRow = box.querySelector('#wiParsing') && box.querySelector('#wiParsing').closest('.wi-row');

    if(rootRow && rootRow.querySelector('.wi-label') && !document.getElementById('wiRootLabel')){
      rootRow.querySelector('.wi-label').id = 'wiRootLabel';
    }
    if(wordRow && wordRow.querySelector('.wi-label') && !document.getElementById('wiWordLabel')){
      wordRow.querySelector('.wi-label').id = 'wiWordLabel';
    }

    function insertAfter(refRow, html){
      if(!refRow) return null;
      refRow.insertAdjacentHTML('afterend', html);
      return refRow.nextElementSibling;
    }

    if(!document.getElementById('wiLemma') && wordRow){
      insertAfter(wordRow, '<div class="wi-row" id="wiLemmaRow"><div class="wi-label" id="wiLemmaLabel">Lexical form</div><div class="wi-value wi-hebrew" id="wiLemma">—</div></div>');
    }
    if(!document.getElementById('wiGlossRow') && parsingRow){
      insertAfter(parsingRow, '<div class="wi-row" id="wiGlossRow"><div class="wi-label" id="wiGlossLabel">Gloss</div><div class="wi-value" id="wiGloss">—</div></div>');
    }
    if(!document.getElementById('wiStrongsRow') && document.getElementById('wiGlossRow')){
      insertAfter(document.getElementById('wiGlossRow'), '<div class="wi-row" id="wiStrongsRow"><div class="wi-label" id="wiStrongsLabel">Strong\'s</div><div class="wi-value" id="wiStrongs">—</div></div>');
    }

    const lexRow = document.getElementById('wiBdbRow');
    if(lexRow){
      lexRow.id = 'wiLexiconRow';
      const label = lexRow.querySelector('.wi-label');
      if(label) label.id = 'wiLexiconLabel';
      const gloss = document.getElementById('wiBdbGloss');
      if(gloss) gloss.id = 'wiLexiconGloss';
      const link = document.getElementById('wiBdbLink');
      if(link) link.id = 'wiLexiconLink';
    }

    if(!document.getElementById('wiBdagRow')){
      box.insertAdjacentHTML('beforeend',
        '<div class="wi-row" id="wiBdagRow"><div class="wi-label">BDAG</div><div class="wi-value wi-bdag-note muted small">Not embedded (copyright). Optional licensed tools may be linked later.</div></div>'
      );
    }
  }

  window.updateInspectorLanguageRows = function(){
    ensureInspectorRows();
    const isGreek = window.state && state.language === 'greek';
    const lemmaRow = document.getElementById('wiLemmaRow');
    const glossRow = document.getElementById('wiGlossRow');
    const strongsRow = document.getElementById('wiStrongsRow');
    const bdagRow = document.getElementById('wiBdagRow');
    const lexRow = document.getElementById('wiLexiconRow');
    const lexLabel = document.getElementById('wiLexiconLabel');
    const lexLink = document.getElementById('wiLexiconLink');
    const rootLabel = document.getElementById('wiRootLabel');
    const wordLabel = document.getElementById('wiWordLabel');
    const lemmaLabel = document.getElementById('wiLemmaLabel');

    if(wordLabel) wordLabel.textContent = 'Text form';
    if(lemmaLabel) lemmaLabel.textContent = 'Lexical form';
    if(rootLabel) rootLabel.textContent = 'Root';

    if(isGreek){
      if(lemmaRow) lemmaRow.style.display = '';
      if(glossRow) glossRow.style.display = '';
      if(strongsRow) strongsRow.style.display = '';
      if(bdagRow) bdagRow.style.display = '';
      if(lexLabel) lexLabel.textContent = 'LSJ';
      if(lexLink) lexLink.textContent = 'Open in Perseus LSJ ↗';
      document.querySelectorAll('#wordInspector .wi-hebrew,#wordInspector .wi-greek').forEach(el => {
        el.classList.remove('wi-hebrew');
        el.classList.add('wi-greek');
      });
    }else{
      if(lemmaRow) lemmaRow.style.display = '';
      if(glossRow) glossRow.style.display = 'none';
      if(strongsRow) strongsRow.style.display = 'none';
      if(bdagRow) bdagRow.style.display = 'none';
      if(lexLabel) lexLabel.textContent = 'BDB';
      if(lexLink) lexLink.textContent = 'Open in Sefaria BDB ↗';
      document.querySelectorAll('#wordInspector #wiWord,#wordInspector #wiRoot,#wordInspector #wiLemma').forEach(el => {
        el.classList.remove('wi-greek');
        el.classList.add('wi-hebrew');
      });
    }
    if(lexRow) lexRow.style.display = '';
  };

  function fillLexiconRow(data){
    const gloss = document.getElementById('wiLexiconGloss') || document.getElementById('wiBdbGloss');
    const link = document.getElementById('wiLexiconLink') || document.getElementById('wiBdbLink');
    if(!gloss || !link) return;
    if(!data){
      gloss.textContent = '—';
      link.style.display = 'none';
      return;
    }
    gloss.textContent = data.gloss || '—';
    link.href = data.url || '#';
    link.style.display = data.url ? 'inline-block' : 'none';
  }

  window.applyGreekLexiconToInspector = async function(wordEl, wiWord, wiRoot, wiParsing){
    if(window.CONTOUR_INSPECTOR_ENABLED === false) return;
    if(!window.state || state.language !== 'greek') return;

    ensureInspectorRows();
    window.updateInspectorLanguageRows();

    const wiLemma = document.getElementById('wiLemma');
    const wiGloss = document.getElementById('wiGloss');
    const wiStrongs = document.getElementById('wiStrongs');

    const surface = (wiWord && wiWord.textContent && wiWord.textContent !== '—')
      ? wiWord.textContent
      : (wordEl && wordEl.textContent || '').replace(/\d+/g, '').trim();

    try{
      const g = await lookupGreekWord(wordEl, surface);
      if(window.CONTOUR_INSPECTOR_ENABLED === false) return;
      if(wiWord) wiWord.textContent = g.word || '—';
      if(wiLemma) wiLemma.textContent = g.lemma || '—';
      if(wiRoot && (!wiRoot.textContent || wiRoot.textContent === '—')) wiRoot.textContent = g.root || g.lemma || '—';
      if(wiParsing && (!wiParsing.textContent || wiParsing.textContent === '—')) wiParsing.textContent = g.parsing || '—';
      if(wiGloss) wiGloss.textContent = g.gloss || '—';
      if(wiStrongs){
        wiStrongs.textContent = g.strongs || '—';
        if(g.strongsUrl && g.strongs !== '—'){
          wiStrongs.innerHTML = '<a href="' + g.strongsUrl + '" target="_blank" rel="noopener">' + g.strongs + '</a>';
        }
      }
      fillLexiconRow(g.lsj);
    }catch(err){
      console.warn('Greek lexicon lookup failed', err);
      fillLexiconRow(null);
    }
  };

  function wrapApplyLanguageLayout(){
    if(typeof window.applyLanguageLayout !== 'function' || window.applyLanguageLayout.__greekWrapped) return;
    const orig = window.applyLanguageLayout;
    window.applyLanguageLayout = function(){
      orig.apply(this, arguments);
      window.updateInspectorLanguageRows();
    };
    window.applyLanguageLayout.__greekWrapped = true;
  }

  function init(){
    ensureInspectorRows();
    wrapApplyLanguageLayout();
    window.updateInspectorLanguageRows();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
