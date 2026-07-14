/* Inspector toggle + manual inspector entries */
(function(){
  const INSPECTOR_PREF_KEY='contour4_inspector_enabled';
  const MANUAL_STORE_KEY='contour4_manual_inspector_entries';

  function norm(s){
    return String(s||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0591-\u05C7]/g,'')
      .replace(/[.,;:!?()[\]{}"׳״·]/g,'')
      .replace(/[־־]/g,'')
      .trim()
      .toLowerCase();
  }
  function isHebrew(s){return /[\u0590-\u05FF]/.test(String(s||''));}
  function looksLikeStrong(s){return /^H?\d+[A-Za-z]?$/.test(String(s||'').trim());}

  function loadManual(){
    try{return JSON.parse(localStorage.getItem(MANUAL_STORE_KEY)||'{}');}
    catch(e){return {};}
  }
  function saveManual(data){
    localStorage.setItem(MANUAL_STORE_KEY, JSON.stringify(data||{}));
    window.CONTOUR_MANUAL_INSPECTOR=data||{};
  }
  function getWordText(el){
    if(!el) return '';
    const clone=el.cloneNode(true);
    clone.querySelectorAll('sup,.comment-marker').forEach(n=>n.remove());
    return clone.textContent.trim();
  }
  function manualKeys(wordEl, word){
    const keys=[word, norm(word)].filter(Boolean);
    try{
      const v=wordEl?.dataset?.v, c=wordEl?.dataset?.c, w=wordEl?.dataset?.w;
      const ref=(window.state && state.verses && state.verses[v]) ? (state.verses[v].ref||'') : '';
      if(ref){
        keys.unshift([ref,c,w,word].filter(x=>x!==undefined&&x!==null&&x!=='').join('|'));
        const normalizedRef=String(ref).replace(/(\d+):(\d+)/,'$1 $2').replace(/\./g,' ');
        keys.unshift([normalizedRef,c,w,word].filter(x=>x!==undefined&&x!==null&&x!=='').join('|'));
      }
    }catch(e){}
    return keys;
  }
  function lookupManual(wordEl, word){
    const data=window.CONTOUR_MANUAL_INSPECTOR || loadManual();
    for(const k of manualKeys(wordEl, word)){
      if(data[k]) return data[k];
    }
    return null;
  }
  function setInspectorEnabled(enabled, opts) {
    opts = opts || {};
    window.CONTOUR_INSPECTOR_ENABLED = !!enabled;
    const btn = document.getElementById('inspectorToggleBtn');
    if (btn) {
      btn.textContent = enabled ? 'Inspector: On' : 'Inspector: Off';
      btn.classList.toggle('off', !enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      const box = document.getElementById('wordInspector');
      if (box) { box.style.display = 'none'; box.setAttribute('aria-hidden', 'true'); }
      clearTimeout(window.__inspectorHoverTimer);
    }
    if (!opts.skipPersist && typeof syncInspectorPref === 'function') syncInspectorPref(!!enabled);
  }
  function installInspectorToggle(){
    if(document.getElementById('inspectorToggleBtn')) return;
    const themeBtn=document.getElementById('themeToggleBtn');
    const actions=document.getElementById('appToolbarActions');
    const top=document.querySelector('.top-stack');
    if(!actions && !top) return;
    const btn=document.createElement('button');
    btn.id='inspectorToggleBtn';
    btn.type='button';
    btn.className='btn app-toolbar-btn';
    btn.onclick=()=>setInspectorEnabled(!window.CONTOUR_INSPECTOR_ENABLED);
    if(themeBtn && themeBtn.parentNode) themeBtn.parentNode.insertBefore(btn, themeBtn.nextSibling);
    else if(actions) actions.insertBefore(btn, actions.firstChild);
    else top.appendChild(btn);
    setInspectorEnabled(false, { skipPersist: true });
  }
  function installManualModal(){
    if(document.getElementById('manualInspectorModal')) return;
    const modal=document.createElement('div');
    modal.id='manualInspectorModal';
    modal.innerHTML=`
      <div class="manual-card">
        <h3>Manual Inspector Entry</h3>
        <p class="muted">Correct Lexical form, Root, and Parsing for the selected Text form. Text form stays the passage word.</p>
        <label>Text form</label>
        <input id="manualInspectorWord" class="manual-hebrew" readonly>
        <label>Lexical form</label>
        <input id="manualInspectorLemma" class="manual-hebrew" placeholder="נָשָׂא">
        <label>Root</label>
        <input id="manualInspectorRoot" class="manual-hebrew" placeholder="נשׂא">
        <label>Parsing</label>
        <input id="manualInspectorParsing" placeholder="Qal perfect 3ms">
        <div class="manual-row">
          <button class="btn" id="manualInspectorCancel" type="button">Cancel</button>
          <button class="btn danger" id="manualInspectorClear" type="button">Clear Entry</button>
          <button class="btn primary" id="manualInspectorSave" type="button">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('manualInspectorCancel').onclick=()=>modal.classList.remove('show');
    modal.addEventListener('click', e=>{if(e.target===modal) modal.classList.remove('show');});
    window.CONTOUR_MANUAL_INSPECTOR=loadManual();
  }
  function selectedWordElement(){
    if(window.state && state.selected){
      return document.querySelector(`.word[data-v="${state.selected.v}"][data-c="${state.selected.c}"][data-w="${state.selected.w}"]`);
    }
    return document.querySelector('.word.selected');
  }
  function openManualInspector(){
    installManualModal();
    const el=selectedWordElement();
    if(!el){alert('Select a word first.'); return;}
    const word=getWordText(el);
    const existing=lookupManual(el, word) || {};
    document.getElementById('manualInspectorWord').value=word;
    document.getElementById('manualInspectorLemma').value=existing.lemma || '';
    document.getElementById('manualInspectorRoot').value=existing.root || '';
    document.getElementById('manualInspectorParsing').value=existing.parsing || existing.morph || '';
    const modal=document.getElementById('manualInspectorModal');
    modal.classList.add('show');

    document.getElementById('manualInspectorSave').onclick=function(){
      const data=loadManual();
      const entry={
        word,
        lemma:document.getElementById('manualInspectorLemma').value.trim(),
        root:document.getElementById('manualInspectorRoot').value.trim(),
        parsing:document.getElementById('manualInspectorParsing').value.trim()
      };
      manualKeys(el, word).forEach(k=>{data[k]=entry;});
      saveManual(data);
      modal.classList.remove('show');
    };
    document.getElementById('manualInspectorClear').onclick=function(){
      const data=loadManual();
      manualKeys(el, word).forEach(k=>delete data[k]);
      saveManual(data);
      document.getElementById('manualInspectorLemma').value='';
      document.getElementById('manualInspectorRoot').value='';
      document.getElementById('manualInspectorParsing').value='';
    };
  }
  function installManualButton(){
    if(document.getElementById('manualInspectorBtn')) return;
    const actions=document.getElementById('appToolbarActions');
    const inspectorBtn=document.getElementById('inspectorToggleBtn');
    const top=document.querySelector('.top-stack');
    if(!actions && !top) return;
    const btn=document.createElement('button');
    btn.id='manualInspectorBtn';
    btn.type='button';
    btn.className='btn app-toolbar-btn';
    btn.textContent='Manual Forms';
    btn.title='Manually add lexical form / root / parsing for selected word';
    btn.onclick=openManualInspector;
    if(inspectorBtn && inspectorBtn.parentNode) inspectorBtn.parentNode.insertBefore(btn, inspectorBtn.nextSibling);
    else if(actions) actions.appendChild(btn);
    else top.appendChild(btn);
  }

  function relabel(){
    const wordLabel=document.getElementById('wiWordLabel');
    if(wordLabel) wordLabel.textContent='Text form';
    const lemmaLabel=document.getElementById('wiLemmaLabel');
    if(lemmaLabel) lemmaLabel.textContent='Lexical form';
    const rootLabel=document.getElementById('wiRootLabel');
    if(rootLabel) rootLabel.textContent='Root';
    document.querySelectorAll('#wordInspector .wi-label').forEach(el=>{
      const t=el.textContent.trim();
      if(t==='Word') el.textContent='Text form';
      if(t==='Lemma / Root' || t==='Root/Lemma') el.textContent='Root';
      if(t==='Gloss' && !(window.state&&state.language==='greek')) el.closest('.wi-row')?.remove();
    });
  }
  function chooseLexical(m, manual){
    if(manual && manual.lemma) return manual.lemma;
    if(window.CONTOUR_HEBREW_FORMS) return window.CONTOUR_HEBREW_FORMS.pickLexicalForm(m) || '—';
    return (m && (m.lemmaHebrew || m.lemma)) || '—';
  }
  function chooseRoot(m, manual){
    if(manual && manual.root) return manual.root;
    if(window.CONTOUR_HEBREW_FORMS) return window.CONTOUR_HEBREW_FORMS.pickRootForm(m) || '—';
    return (m && (m.rootHebrew || m.root)) || '—';
  }

  function fillBdbFields(bdb){
    const gloss=document.getElementById('wiLexiconGloss')||document.getElementById('wiBdbGloss');
    const link=document.getElementById('wiLexiconLink')||document.getElementById('wiBdbLink');
    const row=document.getElementById('wiLexiconRow')||document.getElementById('wiBdbRow');
    if(!gloss||!link) return;
    if(!bdb){
      gloss.textContent='—';
      link.style.display='none';
      if(row) row.style.display='';
      return;
    }
    gloss.textContent=bdb.gloss||'—';
    link.href=bdb.url||'#';
    link.style.display=bdb.url?'inline-block':'none';
    if(row) row.style.display='';
  }
  async function applyBdbToInspector(word, wiRoot, wiParsing, wordEl){
    if(typeof window.lookupSefariaBDB!=='function') return;
    if(window.state&&state.language==='greek'){fillBdbFields(null);return;}
    const passageRef=typeof window.passageRefForWordEl==='function'?window.passageRefForWordEl(wordEl):((window.state&&state.ref)||'');
    const bdb=await window.lookupSefariaBDB(word,{passageRef});
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(!bdb){fillBdbFields(null);return;}
    const wiLemma=document.getElementById('wiLemma');
    if(wiLemma && bdb.lemma && (wiLemma.textContent==='—' || !wiLemma.textContent.trim())){
      wiLemma.textContent=bdb.lemma;
    }
    if(wiRoot){
      // Fill Root only from an actual BDB root string; never invent Root from lemma.
      const rootText=String(bdb.root||'').trim();
      if(rootText && (wiRoot.textContent==='—' || !wiRoot.textContent.trim())) wiRoot.textContent=rootText;
    }
    let morphEntry=null;
    try{
      if(typeof window.CONTOUR_LOOKUP_MORPH==='function') morphEntry=window.CONTOUR_LOOKUP_MORPH(word, wordEl);
    }catch(e){}
    const hasMorphParsing=!!(morphEntry&&(morphEntry.parsing||morphEntry.morph||morphEntry.morphology));
    // Prefer MorphHB parsing; use BDB grammar only when MorphHB has none.
    if(wiParsing && !hasMorphParsing){
      const bdbParsing=String(bdb.parsing||'').trim();
      if(bdbParsing && bdbParsing!=='—' && (wiParsing.textContent==='—' || !wiParsing.textContent.trim())){
        wiParsing.textContent=bdbParsing;
      }
    }
    fillBdbFields(bdb);
  }
  window.applyBdbToInspector=applyBdbToInspector;
  function enhance(wordEl){
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    relabel();
    if(typeof window.updateInspectorLanguageRows==='function') window.updateInspectorLanguageRows();
    const wiWord=document.getElementById('wiWord');
    const wiLemma=document.getElementById('wiLemma');
    const wiRoot=document.getElementById('wiRoot');
    const wiParsing=document.getElementById('wiParsing');
    if(!wiWord||!wiRoot||!wiParsing) return;
    const word=(wiWord.textContent&&wiWord.textContent!=='—') ? wiWord.textContent : getWordText(wordEl);
    if(word) wiWord.textContent=word;
    let morph=null;
    try{ if(typeof window.CONTOUR_LOOKUP_MORPH==='function') morph=window.CONTOUR_LOOKUP_MORPH(word, wordEl); }catch(e){}
    const manual=lookupManual(wordEl, word);
    if(manual || morph){
      if(wiLemma) wiLemma.textContent=chooseLexical(morph, manual);
      wiRoot.textContent=chooseRoot(morph, manual);
      wiParsing.textContent=(manual&&manual.parsing) || (typeof window.mergeInspectorParsing==='function'
        ? window.mergeInspectorParsing(morph, morph&&(morph.parsing||morph.morph||morph.morphology))
        : (morph&&(morph.parsing||morph.morph||morph.morphology))) || '—';
    }else{
      if(wiLemma && looksLikeStrong(wiLemma.textContent)) wiLemma.textContent='—';
      if(looksLikeStrong(wiRoot.textContent)) wiRoot.textContent='—';
    }
    applyBdbToInspector(word, wiRoot, wiParsing, wordEl);
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false){
      const wordEl=e.target.closest&&e.target.closest('.word');
      if(wordEl){
        const box=document.getElementById('wordInspector');
        if(box){box.style.display='none';box.setAttribute('aria-hidden','true');}
        e.stopImmediatePropagation();
      }
      return;
    }
    const wordEl=e.target.closest&&e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{installInspectorToggle();installManualModal();installManualButton();relabel();});
  }else{
    installInspectorToggle();installManualModal();installManualButton();relabel();
  }
})();
