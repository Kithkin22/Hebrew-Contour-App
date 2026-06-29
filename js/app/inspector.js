/* 4.0 Hover Inspector Shell */
(function(){
  if(window.CONTOUR_INSPECTOR_ENABLED===undefined)window.CONTOUR_INSPECTOR_ENABLED=true;
  let inspectorTimer=null;
  let hideInspectorTimer=null;
  const morphLookup = window.CONTOUR_MORPH_LOOKUP || {};

  function cleanWord(text){
    return String(text||'')
      .replace(/[0-9]/g,'')
      .replace(/[.,;:!?()[\]{}"׳״·]/g,'')
      .trim();
  }

  function normalizedKey(text){
    return cleanWord(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0591-\u05C7]/g,'')
      .replace(/[־־]/g,'')
      .toLowerCase();
  }

  function getWordText(el){
    if(!el) return '';
    const clone=el.cloneNode(true);
    clone.querySelectorAll('.comment-marker,sup').forEach(n=>n.remove());
    return cleanWord(clone.textContent);
  }

  function positionInspector(el){
    const box=document.getElementById('wordInspector');
    if(!box||!el) return;
    const r=el.getBoundingClientRect();
    const pad=12;
    let x=r.left + window.scrollX;
    let y=r.bottom + window.scrollY + 8;

    box.style.display='block';
    const bw=box.offsetWidth || 240;
    const bh=box.offsetHeight || 120;

    if(x + bw + pad > window.scrollX + window.innerWidth){
      x = window.scrollX + window.innerWidth - bw - pad;
    }
    if(y + bh + pad > window.scrollY + window.innerHeight){
      y = r.top + window.scrollY - bh - 8;
    }
    box.style.left=Math.max(window.scrollX + pad, x) + 'px';
    box.style.top=Math.max(window.scrollY + pad, y) + 'px';
  }

  function showInspector(el){
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    const box=document.getElementById('wordInspector');
    if(!box||!el) return;

    const word=getWordText(el);
    const key=normalizedKey(word);
    const data=morphLookup[key] || morphLookup[word] || {};

    let morphEntry=null;
    try{
      if(typeof window.CONTOUR_LOOKUP_MORPH==='function') morphEntry=window.CONTOUR_LOOKUP_MORPH(word, el);
    }catch(e){}
    const morphParsing=(morphEntry&&(morphEntry.parsing||morphEntry.morph||morphEntry.morphology))||'';
    const localParsing=typeof window.mergeInspectorParsing==='function'
      ? window.mergeInspectorParsing(morphEntry, morphParsing||data.parsing||data.morph)
      : (morphParsing||data.parsing||data.morph||'—');

    document.getElementById('wiWord').textContent = word || '—';
    document.getElementById('wiRoot').textContent = (morphEntry&&(morphEntry.root||morphEntry.lemma)) || data.root || '—';
    document.getElementById('wiParsing').textContent = localParsing || '—';
    const wiBdbGloss=document.getElementById('wiBdbGloss');
    const wiBdbLink=document.getElementById('wiBdbLink');
    if(wiBdbGloss) wiBdbGloss.textContent='Loading…';
    if(wiBdbLink) wiBdbLink.style.display='none';
    if(typeof applyLanguageLayout==='function') applyLanguageLayout();

    positionInspector(el);
    box.setAttribute('aria-hidden','false');

    if(window.state&&state.language==='greek'&&typeof window.applyGreekLexiconToInspector==='function'){
      window.applyGreekLexiconToInspector(el, document.getElementById('wiWord'), document.getElementById('wiRoot'), document.getElementById('wiParsing'));
    }else if((!window.state||state.language!=='greek')&&typeof window.applyBdbToInspector==='function'){
      window.applyBdbToInspector(word, document.getElementById('wiRoot'), document.getElementById('wiParsing'), el);
    }else if(wiBdbGloss && window.state&&state.language==='greek'){
      wiBdbGloss.textContent='—';
    }
  }

  function hideInspector(){
    clearTimeout(inspectorTimer);
    clearTimeout(hideInspectorTimer);
    const box=document.getElementById('wordInspector');
    if(box){
      box.style.display='none';
      box.setAttribute('aria-hidden','true');
    }
  }

  function scheduleHideInspector(){
    clearTimeout(hideInspectorTimer);
    hideInspectorTimer=setTimeout(hideInspector, 250);
  }

  function cancelHideInspector(){
    clearTimeout(hideInspectorTimer);
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    const box=document.getElementById('wordInspector');
    if(box && box.style.display!=='none' && (e.target===box||box.contains(e.target))){
      cancelHideInspector();
      return;
    }
    const wordEl=e.target.closest && e.target.closest('.word');
    if(!wordEl) return;
    clearTimeout(inspectorTimer);
    cancelHideInspector();
    inspectorTimer=setTimeout(()=>showInspector(wordEl), 250);
  }, true);

  document.addEventListener('mouseout', function(e){
    const box=document.getElementById('wordInspector');
    const wordEl=e.target.closest && e.target.closest('.word');
    const leavingInspector=box && box.style.display!=='none' && (e.target===box||box.contains(e.target));
    if(!wordEl && !leavingInspector) return;
    if(e.relatedTarget){
      if(wordEl && wordEl.contains(e.relatedTarget)) return;
      if(box && (box===e.relatedTarget || box.contains(e.relatedTarget))) return;
      if(leavingInspector && e.relatedTarget.closest && e.relatedTarget.closest('.word')) return;
    }
    scheduleHideInspector();
  }, true);

  document.addEventListener('scroll', hideInspector, true);
  window.addEventListener('resize', hideInspector);
})();


/* 4.0 Hover Inspector DOM Fix */
(function(){
  function ensureWordInspector(){
    if(document.getElementById('wordInspector')) return;
    const box=document.createElement('div');
    box.id='wordInspector';
    box.setAttribute('aria-hidden','true');
    box.innerHTML = `
      <div class="wi-title">Inspector</div>
      <div class="wi-row"><div class="wi-label">Word</div><div class="wi-value wi-hebrew" id="wiWord">—</div></div>
      <div class="wi-row"><div class="wi-label">Root</div><div class="wi-value wi-hebrew" id="wiRoot">—</div></div>
      <div class="wi-row"><div class="wi-label">Parsing</div><div class="wi-value" id="wiParsing">—</div></div>
      <div class="wi-row" id="wiBdbRow"><div class="wi-label">BDB</div><div class="wi-value"><div id="wiBdbGloss">—</div><a id="wiBdbLink" href="#" target="_blank" rel="noopener" style="display:none">Open in Sefaria BDB ↗</a></div></div>
    `;
    document.body.appendChild(box);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureWordInspector);
  else ensureWordInspector();
})();


/* 4.0 MorphHB Inspector Framework */
(function(){
  const MORPH_STORE_KEY = 'contour4_hebrew_morph_data';

  function normalizeMorphKey(text){
    return String(text||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0591-\u05C7]/g,'')
      .replace(/[־־]/g,'')
      .replace(/[.,;:!?()[\]{}"׳״·]/g,'')
      .trim()
      .toLowerCase();
  }

  function loadMorphStore(){
    try{
      const raw = localStorage.getItem(MORPH_STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){
      console.warn('Could not load Hebrew morph data', e);
      return {};
    }
  }

  function saveMorphStore(data){
    localStorage.setItem(MORPH_STORE_KEY, JSON.stringify(data || {}));
    window.CONTOUR_MORPH_LOOKUP = data || {};
    updateMorphStatus();
  }

  function updateMorphStatus(){
    const badge = document.getElementById('morphStatusBadge');
    if(!badge) return;
    const data = window.CONTOUR_MORPH_LOOKUP || {};
    let count = 0;
    try{ count = Object.keys(data.words || data || {}).length; }catch(e){}
    badge.textContent = count ? `Hebrew morph data loaded: ${count} entries` : 'No Hebrew morph data loaded';
    badge.classList.toggle('show', !!count);
  }

  function installMorphImportControls(){
    if(document.getElementById('morphImportInput')) return;

    window.CONTOUR_MORPH_LOOKUP = loadMorphStore();

    const input = document.createElement('input');
    input.id = 'morphImportInput';
    input.type = 'file';
    input.accept = 'application/json,.json';
    document.body.appendChild(input);

    const badge = document.createElement('div');
    badge.id = 'morphStatusBadge';
    document.body.appendChild(badge);

    input.onchange = function(e){
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        try{
          const parsed = JSON.parse(reader.result);
          const normalized = normalizeMorphPayload(parsed);
          saveMorphStore(normalized);
          alert('Hebrew morphology data imported.');
        }catch(err){
          console.error(err);
          alert('Could not import Hebrew morphology JSON.');
        }finally{
          input.value = '';
        }
      };
      reader.readAsText(file);
    };

    // Add button into the Project/File dropdown if possible.
    const projectCard = document.querySelector('.top-stack .card.compact-card:has(.save-tools-title)') ||
                        Array.from(document.querySelectorAll('.top-stack .card.compact-card')).find(c=>/Project|save|restore/i.test(c.textContent));
    if(projectCard && !document.getElementById('importMorphDataBtn')){
      const row = projectCard.querySelector('.row') || projectCard;
      const btn = document.createElement('button');
      btn.id = 'importMorphDataBtn';
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = 'Import Hebrew Morph Data (.json)';
      btn.onclick = ()=>input.click();
      row.appendChild(btn);

      const clear = document.createElement('button');
      clear.id = 'clearMorphDataBtn';
      clear.className = 'btn danger';
      clear.type = 'button';
      clear.textContent = 'Clear Morph Data';
      clear.onclick = ()=>{
        if(confirm('Clear imported Hebrew morphology data?')){
          localStorage.removeItem(MORPH_STORE_KEY);
          window.CONTOUR_MORPH_LOOKUP = {};
          updateMorphStatus();
        }
      };
      row.appendChild(clear);
    }

    updateMorphStatus();
  }

  function normalizeMorphPayload(payload){
    // Supported shapes:
    // 1. { words: { key: {root, parsing, lemma, morph} } }
    // 2. { key: {root, parsing, lemma, morph} }
    // 3. [ {key, word, ref, root, lemma, parsing, morph}, ... ]
    const out = { words:{}, refs:{} };

    function addEntry(key, entry){
      if(!key || !entry) return;
      const e = {
        word: entry.word || entry.surface || '',
        root: entry.root || entry.lemma || '',
        lemma: entry.lemma || entry.root || '',
        parsing: entry.parsing || entry.morph || entry.morphology || ''
      };
      out.words[key] = e;
      const norm = normalizeMorphKey(e.word || key);
      if(norm && !out.words[norm]) out.words[norm] = e;
      if(entry.ref){
        const refKey = String(entry.ref).trim();
        if(refKey) out.refs[refKey] = e;
      }
    }

    if(Array.isArray(payload)){
      payload.forEach(entry=>{
        const key = entry.key || entry.id || entry.word || entry.surface;
        addEntry(key, entry);
      });
    }else if(payload && typeof payload === 'object'){
      const source = payload.words || payload;
      Object.entries(source).forEach(([key, entry])=>{
        if(entry && typeof entry === 'object') addEntry(key, entry);
      });
      if(payload.refs && typeof payload.refs === 'object'){
        Object.entries(payload.refs).forEach(([key, entry])=>{
          if(entry && typeof entry === 'object') out.refs[key] = {
            word: entry.word || entry.surface || '',
            root: entry.root || entry.lemma || '',
            lemma: entry.lemma || entry.root || '',
            parsing: entry.parsing || entry.morph || entry.morphology || ''
          };
        });
      }
    }
    return out;
  }

  function getWordLoc(el){
    if(!el) return null;
    const v = el.dataset.v;
    const c = el.dataset.c;
    const w = el.dataset.w;
    if(v == null || w == null) return null;
    return {v, c, w};
  }

  function getReferenceKey(el, wordText){
    const loc = getWordLoc(el);
    if(!loc) return '';
    let ref = '';
    try{
      if(window.state && state.verses && state.verses[loc.v]){
        ref = state.verses[loc.v].ref || '';
      }
    }catch(e){}
    return [ref, loc.c, loc.w, wordText].filter(x=>x!==undefined && x!==null && x!=='').join('|');
  }

  window.CONTOUR_LOOKUP_MORPH = function(wordText, wordEl){
    const data = window.CONTOUR_MORPH_LOOKUP || loadMorphStore() || {};
    const words = data.words || data;
    const refs = data.refs || {};
    const refKey = getReferenceKey(wordEl, wordText);
    const norm = normalizeMorphKey(wordText);
    return refs[refKey] || words[refKey] || words[wordText] || words[norm] || null;
  };

  // Patch inspector display if it exists.
  const oldLookup = window.CONTOUR_LOOKUP_MORPH;
  function patchInspector(){
    installMorphImportControls();

    // Override inspector fields by listening before/after hover updates.
    document.addEventListener('mouseover', function(e){
      if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
      const wordEl = e.target.closest && e.target.closest('.word');
      if(!wordEl) return;
      setTimeout(function(){
        const wiWord = document.getElementById('wiWord');
        const wiRoot = document.getElementById('wiRoot');
        const wiParsing = document.getElementById('wiParsing');
        if(!wiWord || !wiRoot || !wiParsing) return;
        const word = wiWord.textContent && wiWord.textContent !== '—'
          ? wiWord.textContent
          : (wordEl.textContent || '').replace(/[0-9]/g,'').trim();
        const m = window.CONTOUR_LOOKUP_MORPH(word, wordEl);
        if(m){
          wiRoot.textContent = m.root || m.lemma || '—';
          wiParsing.textContent = typeof window.compactMorphHBParsing==='function'
            ? (window.compactMorphHBParsing(m) || m.parsing || m.morph || '—')
            : (m.parsing || m.morph || '—');
        }
      }, 280);
    }, true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchInspector);
  else patchInspector();
})();


/* Inspector MorphHB/Job JSON support — Word, Lemma/Root, Parsing only */
(function(){
  function isHebrew(s){ return /[\u0590-\u05FF]/.test(String(s||'')); }
  function norm(s){
    return String(s||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0591-\u05C7]/g,'')
      .replace(/[.,;:!?()[\]{}"׳״·]/g,'')
      .replace(/[־־]/g,'')
      .trim()
      .toLowerCase();
  }
  function looksLikeStrong(s){
    return /^H?\d+[A-Za-z]?$/.test(String(s||'').trim());
  }
  function removeGlossRow(){
    if(window.state&&state.language==='greek') return;
    const gloss = document.getElementById('wiGloss');
    if(gloss && gloss.closest('.wi-row')) gloss.closest('.wi-row').remove();
  }
  function relabel(){
    document.querySelectorAll('#wordInspector .wi-label').forEach(el=>{
      if(el.textContent.trim()==='Root') el.textContent='Lemma / Root';
      if(el.textContent.trim()==='Gloss') el.closest('.wi-row')?.remove();
    });
  }
  function getWordTextFromEl(el){
    if(!el) return '';
    const clone=el.cloneNode(true);
    clone.querySelectorAll('sup,.comment-marker').forEach(n=>n.remove());
    return clone.textContent.trim();
  }
  function refKeys(wordEl, word){
    const keys=[];
    try{
      const v=wordEl?.dataset?.v, c=wordEl?.dataset?.c, w=wordEl?.dataset?.w;
      const ref=(window.state && state.verses && state.verses[v]) ? (state.verses[v].ref||'') : '';
      if(ref){
        keys.push([ref,c,w,word].filter(x=>x!==undefined&&x!==null&&x!=='').join('|'));
        const normalizedRef=String(ref).replace(/(\d+):(\d+)/,'$1 $2').replace(/\./g,' ');
        keys.push([normalizedRef,c,w,word].filter(x=>x!==undefined&&x!==null&&x!=='').join('|'));
      }
    }catch(e){}
    return keys;
  }
  function lookupMorph(wordEl, word){
    let data = window.CONTOUR_MORPH_LOOKUP || {};
    if(!data || !Object.keys(data).length){
      try{ data = JSON.parse(localStorage.getItem('contour4_hebrew_morph_data')||'{}'); }catch(e){}
    }
    const words=data.words||{};
    const refs=data.refs||{};
    const keys=[...refKeys(wordEl,word), word, norm(word)];
    for(const k of keys){
      if(refs[k]) return refs[k];
      if(words[k]) return words[k];
    }
    return null;
  }
  function chooseLemmaRoot(m){
    if(!m) return '—';
    const candidates=[
      m.rootHebrew, m.hebrewRoot, m.lemmaHebrew, m.hebrewLemma,
      m.lexeme, m.root, m.lemma, m.word
    ];
    const heb=candidates.find(v=>v && isHebrew(v));
    if(heb) return heb;
    const nonStrong=candidates.find(v=>v && !looksLikeStrong(v));
    return nonStrong || '—';
  }
  function enhance(wordEl){
    const wiWord=document.getElementById('wiWord');
    const wiRoot=document.getElementById('wiRoot');
    const wiParsing=document.getElementById('wiParsing');
    if(!wiWord || !wiRoot || !wiParsing) return;

    relabel();
    removeGlossRow();

    const word=(wiWord.textContent && wiWord.textContent!=='—') ? wiWord.textContent : getWordTextFromEl(wordEl);
    const m=lookupMorph(wordEl, word);

    if(m){
      wiRoot.textContent=chooseLemmaRoot(m);
      wiParsing.textContent=typeof window.compactMorphHBParsing==='function'
        ? (window.compactMorphHBParsing(m) || m.parsing || m.morph || m.morphology || '—')
        : (m.parsing || m.morph || m.morphology || '—');
    }else{
      if(looksLikeStrong(wiRoot.textContent)) wiRoot.textContent='—';
    }
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(window.state&&state.language==='greek') return;
    const wordEl=e.target.closest && e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{relabel();removeGlossRow();});
  }else{
    relabel();removeGlossRow();
  }
})();
