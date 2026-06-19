/* Sefaria BDB lookup — aligned with Aleph lexicon autofill (always_consonants + lookup_ref). */
(function(){
  const BDB_DICTIONARY = 'BDB Dictionary';
  const BDB_AUGMENTED_STRONG = 'BDB Augmented Strong';
  const SEFARIA_WORDS_API = 'https://www.sefaria.org/api/words';
  const HEBREW_DIACRITICS_RE = /[\u0591-\u05C7\u05BF\u05C1\u05C2]/g;
  const HTML_TAG_RE = /<[^>]+>/g;
  const CACHE = {};

  const TERSE_POS_RE = /^[a-z](?:[-a-z0-9]{0,8})?$/i;
  const STEM_SHORT = {
    Qal:'Qal', 'Niph.':'Niph', Niphal:'Niph', 'Niph':'Niph',
    'Pi.':'Piel', Piel:'Piel', 'Pu.':'Pual', Pual:'Pual',
    'Hi.':'Hiph', Hiphil:'Hiph', 'Hiph':'Hiph',
    'Ho.':'Hoph', Hophal:'Hoph', 'Hoph':'Hoph',
    'Hith.':'Hith', Hithpael:'Hith', 'Hithp':'Hith',
    "P'al":'Peal', Peal:'Peal', Poal:'Poal', Aphel:'Aphel'
  };
  const PREFIX_LABEL = {
    C:'conj', R:'prep', T:'particle', S:'suffix', H:'art'
  };
  const OSIS_STEM = {
    q:'Qal', Q:'Qal', n:'Niph', N:'Niph', p:'Piel', P:'Pual',
    h:'Hiph', H:'Hoph', t:'Hith', r:'Piel', b:'Piel', c:'Hiph', v:'Qal'
  };
  const OSIS_TYPE = {
    q:'perf', Q:'perf', s:'perf', S:'perf',
    y:'impf', Y:'impf', i:'impf',
    w:'wayy', W:'wayy',
    r:'ptcp', R:'ptcp', p:'ptcp', P:'ptcp',
    c:'infc', C:'infc', m:'infc',
    a:'infa', A:'infa',
    v:'imp', V:'imp',
    u:'vol', U:'vol'
  };

  function stripLexiconHtml(text){
    return String(text || '')
      .replace(HTML_TAG_RE, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripHebrewDiacritics(word){
    return String(word || '').replace(HEBREW_DIACRITICS_RE, '');
  }

  function cleanHebrewWord(word){
    return String(word || '')
      .replace(/[0-9]/g, '')
      .replace(/[.,;:!?()[\]{}"׳״·]/g, '')
      .replace(/[־־]/g, '')
      .trim();
  }

  function consonantsMatch(a, b){
    return stripHebrewDiacritics(a) === stripHebrewDiacritics(b);
  }

  function normKey(word, passageRef){
    return [normKeyWord(word), passageRef || ''].join('|');
  }

  function normKeyWord(word){
    return cleanHebrewWord(word)
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0591-\u05C7]/g, '')
      .toLowerCase();
  }

  function normalizePassageRefForSefaria(reference){
    const trimmed = String(reference || '').trim();
    if(!trimmed) return undefined;
    const normalized = trimmed
      .replace(/\s+/g, ' ')
      .replace(/^(\d?\s*[A-Za-z]+)\s+(\d+):(\d+)/, '$1.$2.$3')
      .replace(/^(\d?\s*[A-Za-z]+)\s+(\d+)/, '$1.$2');
    return normalized.includes('.') ? normalized : undefined;
  }

  function extractShortGloss(senses){
    if(!senses || !senses.length) return '';
    for(let i = 0; i < senses.length; i++){
      const sense = senses[i];
      const nested = extractShortGloss(sense.senses);
      if(nested) return nested;
      const definition = stripLexiconHtml(sense.definition || '');
      if(!definition) continue;
      const firstClause = (definition.split(/[;,]/)[0] || '').trim();
      if(firstClause.length > 0 && firstClause.length <= 120) return firstClause;
      if(definition.length <= 120) return definition;
      return definition.slice(0, 117).trim() + '…';
    }
    return '';
  }

  function normalizeStem(raw){
    const text = stripLexiconHtml(raw).replace(/^[\u2014\-–—\s]+/, '').trim();
    if(!text) return '';
    return STEM_SHORT[text] || text.replace(/\.$/, '');
  }

  function isTersePosTag(text){
    const t = String(text || '').trim();
    return t.length > 0 && t.length <= 10 && TERSE_POS_RE.test(t);
  }

  function collectGrammarNodes(content, out){
    if(!content || typeof content !== 'object') return;
    if(content.grammar && typeof content.grammar === 'object') out.push(content.grammar);
    for(const sense of (content.senses || [])){
      collectGrammarNodes(sense, out);
    }
  }

  function grammarMatchesSurface(grammar, surfaceWord){
    const forms = grammar && grammar.binyan_form;
    if(!forms || !forms.length || !surfaceWord) return false;
    return forms.some(form => consonantsMatch(form, surfaceWord));
  }

  function formatGrammarNode(grammar){
    if(!grammar) return '';
    const stem = normalizeStem(grammar.verbal_stem);
    const morph = stripLexiconHtml(grammar.morphology || '');
    const parts = [];
    if(stem) parts.push(stem);
    if(morph && !isTersePosTag(morph)){
      parts.push(compactEnglishMorphology(morph));
    }
    return parts.filter(Boolean).join(' ');
  }

  function compactEnglishMorphology(text){
    return String(text || '')
      .replace(/\bsequential imperfect\b/gi, 'wayy')
      .replace(/\bsequential perfect\b/gi, 'seq-perf')
      .replace(/\bimperfect\b/gi, 'impf')
      .replace(/\bperfect\b/gi, 'perf')
      .replace(/\bimperative\b/gi, 'imp')
      .replace(/\bparticiple active\b/gi, 'ptcp act')
      .replace(/\bparticiple passive\b/gi, 'ptcp pass')
      .replace(/\bparticiple\b/gi, 'ptcp')
      .replace(/\binfinitive construct\b/gi, 'infc')
      .replace(/\binfinitive absolute\b/gi, 'infa')
      .replace(/\b(\d)(?:st|nd|rd|th)\s+person\b/gi, '$1')
      .replace(/\bmasculine\b/gi, 'm')
      .replace(/\bfeminine\b/gi, 'f')
      .replace(/\bcommon\b/gi, 'c')
      .replace(/\bsingular\b/gi, 's')
      .replace(/\bplural\b/gi, 'p')
      .replace(/\btr\.\s*v\.?\b/gi, 'verb')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function grammarText(content, surfaceWord){
    const grammars = [];
    collectGrammarNodes(content, grammars);
    if(grammars.length){
      const matched = surfaceWord
        ? grammars.find(g => grammarMatchesSurface(g, surfaceWord))
        : null;
      const chosen = matched || grammars.find(g => g.verbal_stem || g.morphology) || grammars[0];
      const formatted = formatGrammarNode(chosen);
      if(formatted) return formatted;
    }
    const morphology = content && content.morphology;
    if(morphology && !isTersePosTag(morphology)){
      return stripLexiconHtml(morphology);
    }
    return '';
  }

  function decodeMorphHBCode(code){
    const raw = String(code || '').trim();
    if(!raw || !/^[A-Za-z0-9/]+$/.test(raw)) return '';
    const prefixes = [];
    const segments = raw.split('/');
    let verbSeg = '';
    segments.forEach(seg => {
      if(/^V/i.test(seg)) verbSeg = seg;
      else if(seg.length <= 3){
        for(const ch of seg){
          if(PREFIX_LABEL[ch]) prefixes.push(PREFIX_LABEL[ch]);
        }
      }
    });
    if(!verbSeg) return '';
    const body = verbSeg.slice(1);
    if(body.length < 2) return '';
    const stem = OSIS_STEM[body[0]] || '';
    const type = OSIS_TYPE[body[1]] || '';
    const pgn = body.slice(2).replace(/(\d)([mfc])([sp])/i, (_, p, g, n) => p + g + n);
    const parts = prefixes.concat([stem, type, pgn]).filter(Boolean);
    return parts.join(' ');
  }

  function compactEnglishParsingList(text){
    const chunks = String(text || '').split(/\s*;\s*/).map(part => {
      return part
        .replace(/^Conjunction\b/i, 'conj')
        .replace(/^Preposition\b/i, 'prep')
        .replace(/^Particle\b/i, 'part')
        .replace(/^Suffix\b/i, 'suf')
        .replace(/^Verb\b/i, '')
        .replace(/\b(Qal|Niphal|Piel|Pual|Hiphil|Hophal|Hithpael|Peal|P'al|Aphel)\b/gi, m => normalizeStem(m))
        .replace(/\bsequential imperfect\b/gi, 'wayy')
        .replace(/\bsequential perfect\b/gi, 'seq-perf')
        .replace(/\bimperfect\b/gi, 'impf')
        .replace(/\bperfect\b/gi, 'perf')
        .replace(/\bimperative\b/gi, 'imp')
        .replace(/\bparticiple active\b/gi, 'ptcp act')
        .replace(/\bparticiple passive\b/gi, 'ptcp pass')
        .replace(/\bparticiple\b/gi, 'ptcp')
        .replace(/\binfinitive construct\b/gi, 'infc')
        .replace(/\binfinitive absolute\b/gi, 'infa')
        .replace(/\b(\d)(?:st|nd|rd|th)\s+person\b/gi, '$1')
        .replace(/\bmasculine\b/gi, 'm')
        .replace(/\bfeminine\b/gi, 'f')
        .replace(/\bcommon\b/gi, 'c')
        .replace(/\bsingular\b/gi, 's')
        .replace(/\bplural\b/gi, 'p')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b(\d)\s+([mfc])\s+([sp])\b/gi, '$1$2$3');
    }).filter(Boolean);
    return chunks.join(' · ');
  }

  function compactMorphHBParsing(entry){
    if(!entry) return '';
    const text = String(entry.parsing || '').trim();
    if(text) return compactEnglishParsingList(text);
    return decodeMorphHBCode(entry.morph || entry.morphology || '');
  }

  function parsingRichness(text){
    const t = String(text || '').trim();
    if(!t || t === '—') return 0;
    if(isTersePosTag(t)) return 1;
    return t.split(/\s+/).length + (/\d/.test(t) ? 2 : 0);
  }

  function mergeInspectorParsing(morphEntry, sefariaParsing){
    const morphText = compactMorphHBParsing(morphEntry);
    const sefariaText = String(sefariaParsing || '').trim();
    if(morphText && parsingRichness(morphText) >= parsingRichness(sefariaText)){
      return morphText;
    }
    if(sefariaText && sefariaText !== '—') return sefariaText;
    return morphText || '—';
  }

  function morphologyIndicatesRootless(morphology){
    return /\b(?:preposition|adjective|adverb|conjunction|pronoun|particle|interjection|article)\b/i
      .test(String(morphology || '').trim());
  }

  function definitionIndicatesRootless(definition){
    return /^(?:pr(?:ep)?|adj|adv|conj|c|pron|part|interj|art)\.?\b|\b(?:preposition|adjective|adverb|conjunction|pronoun|particle|interjection|article)\b/i
      .test(String(definition || '').trim());
  }

  function entryLacksHebrewRoot(entry){
    if(!entry) return true;
    if(entry.root === true) return false;
    const morphology = (entry.content && entry.content.morphology) || '';
    if(morphologyIndicatesRootless(morphology)) return true;
    const gloss = extractShortGloss(entry.content && entry.content.senses) || '';
    if(definitionIndicatesRootless(gloss)) return true;
    return false;
  }

  function deriveRoot(entry, surfaceWord){
    if(!entry) return '';
    if(entryLacksHebrewRoot(entry)) return '';
    if(entry.root === true) return stripHebrewDiacritics(entry.headword || '');
    const fromNotes = String(entry.headword || '').match(/√\s*([\u0590-\u05FF]+)/);
    if(fromNotes && fromNotes[1]) return stripHebrewDiacritics(fromNotes[1]);
    return stripHebrewDiacritics(entry.headword || surfaceWord || '');
  }

  function pickBdbDictionaryEntry(entries, surfaceWord){
    const bdbEntries = (entries || []).filter(e => e.parent_lexicon === BDB_DICTIONARY);
    if(!bdbEntries.length) return null;
    const exact = bdbEntries.find(e => consonantsMatch(e.headword, surfaceWord));
    if(exact) return exact;
    const rootEntry = bdbEntries.find(e => e.root === true);
    if(rootEntry) return rootEntry;
    return bdbEntries[0];
  }

  function pickAugmentedStrongEntry(entries, surfaceWord, bdbHeadword){
    const strongEntries = (entries || []).filter(e =>
      e.parent_lexicon === BDB_AUGMENTED_STRONG &&
      e.strong_number &&
      e.language_code !== 'arc'
    );
    if(!strongEntries.length) return null;
    const target = bdbHeadword || surfaceWord;
    const exact = strongEntries.find(e => consonantsMatch(e.headword, target));
    if(exact) return exact;
    const surfaceMatch = strongEntries.find(e => consonantsMatch(e.headword, surfaceWord));
    if(surfaceMatch) return surfaceMatch;
    return strongEntries[0];
  }

  function bdbUrl(headword){
    return 'https://www.sefaria.org/BDB,' + encodeURIComponent(headword || '') + '?lang=bi';
  }

  function displayRoot(entry, lemma, surfaceWord){
    if(!entry) return lemma || '';
    if(entryLacksHebrewRoot(entry)) return '';
    if(entry.root === true) return entry.headword || lemma || '';
    const fromNotes = String(entry.headword || '').match(/√\s*([\u0590-\u05FF]+)/);
    if(fromNotes && fromNotes[1]) return fromNotes[1];
    return lemma || stripHebrewDiacritics(entry.headword || surfaceWord || '');
  }

  function buildResult(surfaceWord, bdbEntry, strongEntry){
    const lemma = (bdbEntry && bdbEntry.headword) || (strongEntry && strongEntry.headword) || surfaceWord;
    const gloss =
      extractShortGloss(strongEntry && strongEntry.content && strongEntry.content.senses) ||
      extractShortGloss(bdbEntry && bdbEntry.content && bdbEntry.content.senses) ||
      '';
    const parsing =
      grammarText(strongEntry && strongEntry.content, surfaceWord) ||
      grammarText(bdbEntry && bdbEntry.content, surfaceWord) ||
      '';
    const rootSource = bdbEntry || strongEntry;
    const root = displayRoot(rootSource, lemma, surfaceWord);
    const headwordForUrl = (bdbEntry && bdbEntry.headword) || (strongEntry && strongEntry.headword) || surfaceWord;

    return {
      headword: headwordForUrl,
      lemma,
      root: root || lemma,
      gloss: gloss || '—',
      parsing: parsing || '—',
      strongNumber: (strongEntry && strongEntry.strong_number) ||
        (bdbEntry && bdbEntry.strong_numbers && bdbEntry.strong_numbers[0]) ||
        '',
      url: bdbUrl(headwordForUrl)
    };
  }

  async function fetchSefariaWordEntries(word, options){
    const cleaned = cleanHebrewWord(word);
    if(!cleaned) return [];
    const params = new URLSearchParams();
    params.set('always_consonants', '1');
    const lookupRef = options && options.passageRef
      ? normalizePassageRefForSefaria(options.passageRef)
      : undefined;
    if(lookupRef) params.set('lookup_ref', lookupRef);
    const url = SEFARIA_WORDS_API + '/' + encodeURIComponent(cleaned) + '?' + params.toString();
    const resp = await fetch(url);
    if(!resp.ok) throw new Error('Sefaria lookup failed');
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  }

  window.lookupSefariaBDB = async function(word, options){
    const w = cleanHebrewWord(word);
    if(!w || !/[\u0590-\u05FF]/.test(w)) return null;
    const passageRef = options && options.passageRef;
    const key = normKey(w, passageRef);
    if(CACHE[key]) return CACHE[key];

    try{
      const entries = await fetchSefariaWordEntries(w, { passageRef });
      const bdbEntry = pickBdbDictionaryEntry(entries, w);
      const strongEntry = pickAugmentedStrongEntry(entries, w, bdbEntry && bdbEntry.headword);
      if(!bdbEntry && !strongEntry) return null;
      const result = buildResult(w, bdbEntry, strongEntry);
      CACHE[key] = result;
      return result;
    }catch(err){
      console.warn('Sefaria BDB lookup failed', err);
      return null;
    }
  };

  window.mergeInspectorParsing = mergeInspectorParsing;
  window.compactMorphHBParsing = compactMorphHBParsing;

  window.passageRefForWordEl = function(wordEl){
    if(!wordEl || !window.state || !state.verses) return state && state.ref ? state.ref : '';
    const v = +wordEl.dataset.v;
    const ref = state.verses[v] && state.verses[v].ref;
    return ref || state.ref || '';
  };
})();
