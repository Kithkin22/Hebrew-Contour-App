/* Sefaria BDB lookup — aligned with Aleph lexicon autofill (always_consonants + lookup_ref). */
(function(){
  const BDB_DICTIONARY = 'BDB Dictionary';
  const BDB_AUGMENTED_STRONG = 'BDB Augmented Strong';
  const SEFARIA_WORDS_API = 'https://www.sefaria.org/api/words';
  const HEBREW_DIACRITICS_RE = /[\u0591-\u05C7\u05BF\u05C1\u05C2]/g;
  const HTML_TAG_RE = /<[^>]+>/g;
  const CACHE = {};

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

  function grammarText(content){
    const morphology = content && content.morphology;
    if(morphology) return stripLexiconHtml(morphology);
    for(const s of ((content && content.senses) || [])){
      const g = s.grammar;
      if(!g) continue;
      const parts = [g.verbal_stem, g.morphology].concat(g.binyan_form || []).filter(Boolean);
      if(parts.length) return parts.map(stripLexiconHtml).join(' · ');
    }
    return '';
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
      grammarText(strongEntry && strongEntry.content) ||
      grammarText(bdbEntry && bdbEntry.content) ||
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

  window.passageRefForWordEl = function(wordEl){
    if(!wordEl || !window.state || !state.verses) return state && state.ref ? state.ref : '';
    const v = +wordEl.dataset.v;
    const ref = state.verses[v] && state.verses[v].ref;
    return ref || state.ref || '';
  };
})();
