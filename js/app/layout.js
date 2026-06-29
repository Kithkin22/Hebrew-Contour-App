/* editor-overflow-fix-v1-js */
let _editorLayoutFixQueued=false;
function scheduleEditorLayoutFix(){
  if(_editorLayoutFixQueued)return;
  _editorLayoutFixQueued=true;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      _editorLayoutFixQueued=false;
      applyEditorLayoutFix();
    });
  });
}
function applyEditorLayoutFix(){
  document.querySelectorAll('.card.main-workspace,#contourWorkspaceShell,#annotationTabsShell,#contourTab,#singleEditorSection,#parallelCompareWrap,.contour-with-comments,#editorWrap,#editor,.parallel-scroll-area').forEach(el=>{void el.offsetWidth;});
  if(typeof renderArcOverlay==='function')renderArcOverlay();
  document.dispatchEvent(new CustomEvent('hc-layout-changed'));
}
(function(){
  if(window._editorLayoutObserver)return;
  function bind(){
    const targets=document.querySelectorAll('.card.main-workspace,#editorWrap,#editor,.hc-app-body,.hc-right-panel,.hc-sidebar,.hc-workspace');
    if(!targets.length||typeof ResizeObserver==='undefined')return;
    window._editorLayoutObserver=new ResizeObserver(()=>scheduleEditorLayoutFix());
    targets.forEach(el=>window._editorLayoutObserver.observe(el));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
  setTimeout(bind,1500);
})();

function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive()){renderParallelEditors();renderDualTables();}else{renderEditor();renderTable();}renderLegendEditor();renderInclusioManager();if(!isWorkspaceTableView())renderCommentsPanel();setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();else if(typeof renderArcManager==='function')renderArcManager();if(stateBundle.parallelEnabled)updateParallelAlignStatus();if(autosaveReady)autoSaveProject();scheduleEditorLayoutFix();}
function wordFormatClasses(w,l){let f=w.format||{};let suppressCommentStart=l&&isCommentBoundary(l,'start')&&!w.bracketSource;let suppressCommentEnd=l&&isCommentBoundary(l,'end')&&!w.bracketSource;return `${f.bold?'fmt-bold':''} ${f.italic?'fmt-italic':''} ${f.underline?'fmt-underline':''} ${f.doubleUnderline?'fmt-double-underline':''} ${f.highlight?'fmt-highlight':''} ${(w.bracketStart&&!suppressCommentStart)?'bracket-start':''} ${(w.bracketEnd&&!suppressCommentEnd)?'bracket-end':''}`;}
function wordInlineStyle(w){let styles=[];if(w.color)styles.push('color:'+esc(w.color));if(w.format&&w.format.highlight)styles.push('background-color:'+esc(w.format.highlight));let bc=w.bracketColor||w.inclusioColor;if(bc)styles.push('--bracket-color:'+esc(bc));return styles.join(';');}
function renderEditor(){const ed=document.getElementById('editor');const layout=getLanguageLayout();const scriptStyle=`direction:${layout.dir};text-align:${layout.textAlign};font-family:${layout.fontFamily}`;ensureComments();if(!state.verses.length){ed.innerHTML='<div class="editor-empty-state" dir="ltr"><p class="editor-empty-title">No text loaded yet</p><p class="muted">Use <strong>Generate text</strong> or <strong>Paste text</strong> in the menu bar above.</p></div>';hideCommentPopover();return;}let html='';let activeKey=selectedWordKey();state.verses.forEach((v,vi)=>{html+=`<div class="muted" dir="ltr">${esc(v.ref)}</div>`;v.clauses.forEach((c,ci)=>{let sel=state.selected&&state.selected.v==vi&&state.selected.c==ci;let marginStyle=layout.indentSide==='left'?`margin-left:${c.indent*36}px`:`margin-right:${c.indent*36}px`;html+=`<div class="clause ${sel?'selected':''}" data-v="${vi}" data-c="${ci}" dir="${layout.dir}" style="${marginStyle};${scriptStyle}">`;c.words.forEach((w,wi)=>{let l={v:vi,c:ci,w:wi};let ids=commentIdsForLoc(l);let commentClass=ids.length?'comment-anchored':'';let activeCommentClass=(state.activeCommentId&&ids.includes(state.activeCommentId))?'comment-active':'';let wsel=state.selected&&state.selected.v==vi&&state.selected.c==ci&&state.selected.w==wi;let same=activeKey && normalizeHebrewWord(w.text)===activeKey && !wsel;html+=`<span class="word ${wsel?'selected':''} ${same?'sameword':''} ${commentClass} ${activeCommentClass} ${w.deleted?'deleted':''} ${w.specials.includes('predicate')?'pred':''} ${w.specials.includes('subject')?'subj':''} ${wordFormatClasses(w,l)}" data-v="${vi}" data-c="${ci}" data-w="${wi}" style="${wordInlineStyle(w)}">${esc(w.text)}</span>${commentMarkersForLoc(l)} `});html+='</div>';});});ed.innerHTML=html;document.querySelectorAll('.word').forEach(el=>el.onclick=(ev)=>{let clicked={v:+el.dataset.v,c:+el.dataset.c,w:+el.dataset.w};if(ev.shiftKey&&locOK(state.selected)){applyBracketRange(state.selected,clicked);return;}state.selected=clicked;let ids=commentIdsForLoc(clicked);if(ids.length)state.activeCommentId=ids[0];render();});document.querySelectorAll('.comment-marker').forEach(el=>el.onclick=(ev)=>{ev.stopPropagation();activateComment(el.dataset.commentId);});}
function clauseRows(){let rows=[];state.verses.forEach((v,vi)=>v.clauses.forEach((c,ci)=>{let words=c.words.filter(w=>!w.deleted).map(w=>w.text).join(' ');let notes=c.words.filter(w=>w.note).map(w=>'['+w.text+'] — '+w.note).join('; ');let trans=c.words.filter(w=>w.translation).map(w=>'['+w.text+'] — '+w.translation).join('; ');rows.push({vi,ci,ref:v.ref,clause:ci+1,hebrew:words,indent:c.indent,notes,translation:trans,ann:c.ann||{}});}));return rows;}
function renderTable(){let rows=clauseRows();let textHeader=(state.language==='greek'?'Greek Text':'Hebrew Text');let textClass=(state.language==='greek'?'greek':'heb');let ltr=' class="ann-ltr" dir="ltr"';let html='<table id="annTable" dir="ltr"><thead><tr><th class="'+textClass+'">'+textHeader+'</th><th'+ltr+'>Translation</th><th'+ltr+'>Gloss</th><th'+ltr+'>Parsing</th><th'+ltr+'>Notes</th>';state.columns.forEach(col=>html+=`<th class="ann-ltr" dir="ltr">${esc(col)}</th>`);html+='</tr></thead><tbody>';rows.forEach(r=>{html+=`<tr data-v="${r.vi}" data-c="${r.ci}"><td class="${textClass}">${esc(r.hebrew)}</td><td class="ann-ltr" dir="ltr" contenteditable data-col="Translation">${esc(r.ann['Translation']||'')}</td><td class="ann-ltr" dir="ltr">${esc(r.translation)}</td><td class="ann-ltr" dir="ltr" contenteditable data-col="Parsing">${esc(r.ann['Parsing']||'')}</td><td class="ann-ltr" dir="ltr">${esc(r.notes)}</td>`;state.columns.forEach(col=>html+=`<td class="ann-ltr" dir="ltr" contenteditable data-col="${esc(col)}">${esc(r.ann[col]||'')}</td>`);html+='</tr>';});html+='</tbody></table>';const tableWrap=document.getElementById('tableWrap');tableWrap.innerHTML=html;tableWrap.dir='ltr';tableWrap.style.direction='ltr';tableWrap.style.textAlign='left';document.querySelectorAll('#annTable td[contenteditable]').forEach(td=>{applyLtrAnnotationInput(td);td.oninput=()=>{if(!td._undoSnap){markUndo();td._undoSnap=1;}let tr=td.closest('tr'),c=state.verses[+tr.dataset.v].clauses[+tr.dataset.c];c.ann=c.ann||{};c.ann[td.dataset.col]=td.innerText;if(autosaveReady)autoSaveProject();};});}
function insertBreak(){markUndo();let l=state.selected;if(!locOK(l)||l.w===0)return;let cl=state.verses[l.v].clauses[l.c];let newc={indent:cl.indent,words:cl.words.slice(l.w),specials:[],ann:{}};cl.words=cl.words.slice(0,l.w);state.verses[l.v].clauses.splice(l.c+1,0,newc);state.selected={v:l.v,c:l.c+1,w:0};render();}
function indent(delta){markUndo();let l=state.selected;if(!locOK(l))return;let cl=state.verses[l.v].clauses[l.c];if(delta<0&&cl.indent===0&&l.c>0){let prev=state.verses[l.v].clauses[l.c-1];let oldLen=prev.words.length;prev.words=prev.words.concat(cl.words);state.verses[l.v].clauses.splice(l.c,1);state.selected={v:l.v,c:l.c-1,w:oldLen};}else cl.indent=Math.max(0,cl.indent+delta);render();}
function nextLoc(l,dir){if(!state.verses.length)return null;if(!locOK(l)){return {v:0,c:0,w:0};}let v=l.v,c=l.c,w=l.w+dir;while(v>=0&&v<state.verses.length){while(c>=0&&c<state.verses[v].clauses.length){let words=state.verses[v].clauses[c].words;if(w>=0&&w<words.length)return {v,c,w};if(dir>0){c++;w=0;}else{c--;if(c>=0)w=state.verses[v].clauses[c].words.length-1;}}if(dir>0){v++;c=0;w=0;}else{v--;if(v>=0){c=state.verses[v].clauses.length-1;w=state.verses[v].clauses[c].words.length-1;}}}return l;}
function moveClause(delta){let l=state.selected;if(!locOK(l)){state.selected=nextLoc(null,1);renderEditor();return;}let v=l.v,c=l.c+delta,w=l.w;while(v>=0&&v<state.verses.length){if(c>=0&&c<state.verses[v].clauses.length){let words=state.verses[v].clauses[c].words;if(words.length){state.selected={v,c,w:Math.min(w,words.length-1)};renderEditor();return;}}if(delta>0){v++;c=0;}else{v--;if(v>=0)c=state.verses[v].clauses.length-1;}}}
function moveWord(dir){let n=nextLoc(state.selected,dir);if(n){state.selected=n;renderEditor();}}
function toggleSpecial(s){markUndo();let l=state.selected;if(!locOK(l))return;let a=state.verses[l.v].clauses[l.c].words[l.w].specials;let i=a.indexOf(s);i<0?a.push(s):a.splice(i,1);render();}
function setSelectedColor(color,applyToAll){markUndo();let l=state.selected;if(!locOK(l)){alert('Select a Hebrew word first.');return;}if(applyToAll){let key=selectedWordKey();forEachMatchingWord(key,w=>{w.color=color;});}else{state.verses[l.v].clauses[l.c].words[l.w].color=color;}render();}
function selectedWordOrAlert(){let l=state.selected;if(!locOK(l)){alert('Select a Hebrew word first.');return null;}return state.verses[l.v].clauses[l.c].words[l.w];}
function ensureFormat(w){w.format=w.format||{};return w.format;}
function toggleSelectedFormat(kind,applyToAll){markUndo();let w=selectedWordOrAlert();if(!w)return;if(applyToAll){let key=selectedWordKey();let val=!ensureFormat(w)[kind];forEachMatchingWord(key,ww=>{ensureFormat(ww)[kind]=val;});}else{let f=ensureFormat(w);f[kind]=!f[kind];}render();}
function setSelectedHighlight(color,applyToAll){markUndo();let w=selectedWordOrAlert();if(!w)return;let hl=color||'';if(applyToAll){let key=selectedWordKey();forEachMatchingWord(key,ww=>{let f=ensureFormat(ww);f.highlight=hl;if(!f.highlight)delete f.highlight;});}else{let f=ensureFormat(w);f.highlight=hl;if(!f.highlight)delete f.highlight;}render();}
function clearSelectedFormatting(applyToAll){markUndo();let w=selectedWordOrAlert();if(!w)return;if(applyToAll){let key=selectedWordKey();forEachMatchingWord(key,ww=>{ww.format={};});}else{w.format={};}render();}
function updateBracketStatus(msg){let el=document.getElementById('bracketStatus');if(el)el.textContent=msg||'Tip: select a start word, then Shift-click the end word.';}
function locRank(l){let n=0;for(let vi=0;vi<state.verses.length;vi++){for(let ci=0;ci<state.verses[vi].clauses.length;ci++){if(vi===l.v&&ci===l.c)return n+l.w;n+=state.verses[vi].clauses[ci].words.length;}}return -1;}
function orderedLocs(a,b){return locRank(a)<=locRank(b)?[a,b]:[b,a];}
function setBracketAnchor(){markUndo();if(!locOK(state.selected)){alert('Select the first word you want to bracket.');return;}bracketAnchor={...state.selected};updateBracketStatus('Bracket start set. Select or Shift-click the ending word.');}
function applyBracketRange(a,b){if(!locOK(a)||!locOK(b)){alert('Select a start and end word first.');return;}let [start,end]=orderedLocs(a,b);let sw=state.verses[start.v].clauses[start.c].words[start.w];let ew=state.verses[end.v].clauses[end.c].words[end.w];sw.bracketStart=true;ew.bracketEnd=true;state.selected=end;bracketAnchor=null;updateBracketStatus('Bracket added.');render();}
function bracketToSelected(){markUndo();if(!locOK(bracketAnchor)){setBracketAnchor();return;}if(!locOK(state.selected)){alert('Select the last word you want to bracket.');return;}applyBracketRange(bracketAnchor,state.selected);}
function clearSelectedBrackets(){markUndo();let w=selectedWordOrAlert();if(!w)return;delete w.bracketStart;delete w.bracketEnd;updateBracketStatus('Brackets cleared from selected word.');render();}
function clearAllBrackets(){markUndo();state.verses.forEach(v=>v.clauses.forEach(c=>c.words.forEach(w=>{delete w.bracketStart;delete w.bracketEnd;})));bracketAnchor=null;updateBracketStatus('All brackets cleared.');render();}

function ensureInclusios(){if(!Array.isArray(state.inclusios))state.inclusios=[];}
function locToLabel(l){if(!locOK(l))return 'not set';let v=state.verses[l.v], w=v.clauses[l.c].words[l.w];return `${v.ref}: ${w.text}`;}
function activeInclusio(){ensureInclusios();let sel=document.getElementById('activeInclusioSelect');let id=sel&&sel.value;if(!id&&state.inclusios[0])id=state.inclusios[0].id;return state.inclusios.find(x=>x.id===id)||null;}
function addInclusio(){markUndo();ensureInclusios();let label=(document.getElementById('inclusioLabel')?.value||'Inclusio').trim()||'Inclusio';let color=document.getElementById('inclusioColor')?.value||'#315efb';let item={id:'inc'+Date.now(),label,color,start:null,end:null};state.inclusios.push(item);if(!legendHas('bracket',color))addLegend('bracket',color,label);render();}
function setInclusioPoint(which){markUndo();let item=activeInclusio();if(!item){addInclusio();item=activeInclusio();}if(!locOK(state.selected)){alert('Select a word first.');return;}item[which]=cloneLoc(state.selected);applyInclusioBrackets(false);render();}
function clearInclusioWordMarkers(){state.verses.forEach(v=>v.clauses.forEach(c=>c.words.forEach(w=>{if(w.inclusioId){delete w.inclusioId;delete w.inclusioRole;delete w.inclusioColor; if(w.bracketStart&&w.bracketSource==='inclusio')delete w.bracketStart; if(w.bracketEnd&&w.bracketSource==='inclusio')delete w.bracketEnd; delete w.bracketSource; if(w.bracketColorSource==='inclusio'){delete w.bracketColor; delete w.bracketColorSource;}}})));}
function applyInclusioBrackets(doRender=true){markUndo();ensureInclusios();clearInclusioWordMarkers();state.inclusios.forEach(item=>{if(locOK(item.start)){let w=state.verses[item.start.v].clauses[item.start.c].words[item.start.w];w.bracketStart=true;w.bracketColor=item.color;w.bracketColorSource='inclusio';w.bracketSource='inclusio';w.inclusioId=item.id;w.inclusioRole='start';w.inclusioColor=item.color;}if(locOK(item.end)){let w=state.verses[item.end.v].clauses[item.end.c].words[item.end.w];w.bracketEnd=true;w.bracketColor=item.color;w.bracketColorSource='inclusio';w.bracketSource='inclusio';w.inclusioId=item.id;w.inclusioRole='end';w.inclusioColor=item.color;}});if(doRender)render();}
function clearInclusioMarkers(){markUndo();if(!confirm('Clear all inclusio markers?'))return;state.inclusios=[];clearInclusioWordMarkers();render();}
function renderInclusioManager(){ensureInclusios();let box=document.getElementById('inclusioManager');if(!box)return;if(!state.inclusios.length){box.innerHTML='<span class="muted">No inclusios yet. Click New Inclusio to begin.</span>';return;}let html='<div class="row"><label>Active <select id="activeInclusioSelect">'+state.inclusios.map((x,i)=>`<option value="${x.id}">${esc(x.label||('Inclusio '+(i+1)))}</option>`).join('')+'</select></label></div>';html+='<table style="margin-top:8px"><thead><tr><th>Marker</th><th>Start</th><th>End</th><th>Legend Label</th><th>Remove</th></tr></thead><tbody>';state.inclusios.forEach((x,i)=>{html+=`<tr><td><span style="color:${esc(x.color)};font-weight:bold">[ ]</span></td><td>${esc(locToLabel(x.start))}</td><td>${esc(locToLabel(x.end))}</td><td contenteditable data-inc-label="${i}">${esc(x.label)}</td><td><button class="btn danger" data-inc-remove="${i}">Remove</button></td></tr>`;});html+='</tbody></table>';box.innerHTML=html;box.querySelectorAll('[data-inc-label]').forEach(td=>td.oninput=()=>{let i=+td.dataset.incLabel;state.inclusios[i].label=td.innerText;let le=state.legend&&state.legend.find(e=>e.type==='bracket'&&String(e.color||'').toLowerCase()===String(state.inclusios[i].color||'').toLowerCase());if(le)le.label=td.innerText;renderLegendEditor();autoSaveProject();});box.querySelectorAll('[data-inc-remove]').forEach(btn=>btn.onclick=()=>{let i=+btn.dataset.incRemove;state.inclusios.splice(i,1);applyInclusioBrackets();});}

function toggleDeletedSelected(applyToAll){markUndo();let l=state.selected;if(!locOK(l)){alert('Select a word first.');return;}let w=state.verses[l.v].clauses[l.c].words[l.w];if(applyToAll){let key=selectedWordKey();let val=!w.deleted;forEachMatchingWord(key,ww=>{ww.deleted=val;});}else{w.deleted=!w.deleted;}render();}
function promptModal(title,text,value,cb){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=text;let inp=document.getElementById('modalInput');inp.value=value||'';applyLanguageLayout();applyLtrAnnotationInput(inp);document.getElementById('modal').classList.add('show');inp.focus();document.getElementById('modalOk').onclick=()=>{document.getElementById('modal').classList.remove('show');cb(inp.value)};document.getElementById('modalCancel').onclick=()=>document.getElementById('modal').classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable]'))return;if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undoLastChange();return;}if(e.key==='ArrowLeft'){e.preventDefault();moveWord(1);}else if(e.key==='ArrowRight'){e.preventDefault();moveWord(-1);}else if(e.key==='ArrowDown'){e.preventDefault();moveClause(1);}else if(e.key==='ArrowUp'){e.preventDefault();moveClause(-1);}else if(e.key==='Enter'){e.preventDefault();insertBreak();}else if(e.key==='Tab'){e.preventDefault();indent(1);}else if(e.key==='Backspace'){e.preventDefault();indent(-1);}else if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();toggleDeletedSelected(true);}else if(e.key==='Delete'||(e.key==='Backspace'&&e.shiftKey)){e.preventDefault();toggleDeletedSelected();}else if(e.key==='p')toggleSpecial('predicate');else if(e.key==='s')toggleSpecial('subject');else if(e.key==='n'){e.preventDefault();let l=state.selected;if(locOK(l)){let w=state.verses[l.v].clauses[l.c].words[l.w];promptModal('Word Note','Add parsing or note for selected word:',w.note,v=>{markUndo();w.note=v;render();});}}else if(e.key==='t'){e.preventDefault();let l=state.selected;if(locOK(l)){let w=state.verses[l.v].clauses[l.c].words[l.w];promptModal('Word Gloss','Add gloss for selected word:',w.translation,v=>{markUndo();w.translation=v;render();});}}});

function parseBooks(){return BOOK_NAMES.trim().split(/\r?\n/).map(l=>{const [id,name]=l.split('	');return {id,name};}).filter(b=>b.id&&b.id.endsWith('O'));}
function setupBooks(){
  const sel=document.getElementById('bookSelect');
  const source=(document.getElementById('textSource')&&document.getElementById('textSource').value)||'hebrew-bhsa';
  sel.innerHTML='';
  const books=source==='greek'?GREEK_BOOKS:parseBooks();
  books.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=b.name;if(((source==='hebrew'||source==='hebrew-bhsa')&&b.name==='Ruth')||(source==='greek'&&b.id==='Matt'))o.selected=true;sel.appendChild(o);});
  const status=document.getElementById('wlcStatus');
  if(status)status.textContent=source==='greek'?'Greek source: SBLGNT (fetched online from Faithlife/SBLGNT).':source==='hebrew-bhsa'?'Hebrew source: BHSA / ETCBC via SHEBANQ (requires internet).':'Hebrew source: bundled WLC (offline).';
}
function getWlcText(book,sc,sv,ec,ev){const out=[];let started=false;for(const line of WLC_TEXT.split(/\r?\n/)){if(!line.trim())continue;const parts=line.split('\t');if(parts.length<6)continue;const [b,c,v,_blank,_seq,txt]=parts;const cn=+c,vn=+v;if(b===book&&cn===+sc&&vn===+sv)started=true;if(started){if(b!==book)break;if(cn>+ec||(cn===+ec&&vn>+ev))break;out.push({chapter:cn,verse:vn,text:(txt||'').trim()});if(cn===+ec&&vn===+ev)break;}}return out;}
const SHEBANQ_VERSE_API='https://shebanq.ancient-data.org/hebrew/verse.json';
const BHSA_VERSION='4b';
const BHSA_LATIN_BY_WLC={
  '01O':'Genesis','02O':'Exodus','03O':'Leviticus','04O':'Numeri','05O':'Deuteronomium',
  '06O':'Josua','07O':'Judices','08O':'Ruth','09O':'Samuel_I','10O':'Samuel_II',
  '11O':'Reges_I','12O':'Reges_II','13O':'Chronica_I','14O':'Chronica_II','15O':'Esra',
  '16O':'Nehemia','17O':'Esther','18O':'Iob','19O':'Psalmi','20O':'Proverbia',
  '21O':'Ecclesiastes','22O':'Canticum','23O':'Jesaia','24O':'Jeremia','25O':'Threni',
  '26O':'Ezechiel','27O':'Daniel','28O':'Hosea','29O':'Joel','30O':'Amos','31O':'Obadia',
  '32O':'Jona','33O':'Micha','34O':'Nahum','35O':'Habakuk','36O':'Zephania','37O':'Haggai',
  '38O':'Sacharia','39O':'Maleachi'
};
function cleanBhsaVerse(raw){
  return String(raw||'')
    .replace(/<[^>]*>/g,'')
    .replace(/&nbsp;/gi,' ')
    .replace(/\{[פסמת]\}/g,'')
    .replace(/\u05C3+/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
async function fetchShebanqVerse(bhsaLatin,chapter,verse){
  const url=new URL(SHEBANQ_VERSE_API);
  url.searchParams.set('version',BHSA_VERSION);
  url.searchParams.set('book',bhsaLatin);
  url.searchParams.set('chapter',String(chapter));
  url.searchParams.set('verse',String(verse));
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data.good||!data.data||!data.data.text)return null;
  return cleanBhsaVerse(data.data.text);
}
async function getBhsaText(wlcBookId,sc,sv,ec,ev){
  const bhsaLatin=BHSA_LATIN_BY_WLC[wlcBookId];
  if(!bhsaLatin)throw new Error('No BHSA book mapping for '+wlcBookId);
  const refs=getWlcText(wlcBookId,sc,sv,ec,ev);
  if(!refs.length)return [];
  const out=[];
  for(const ref of refs){
    const text=await fetchShebanqVerse(bhsaLatin,ref.chapter,ref.verse);
    if(!text){
      if(!out.length)throw new Error(`BHSA lookup failed for ${bhsaLatin} ${ref.chapter}:${ref.verse}.`);
      break;
    }
    out.push({chapter:ref.chapter,verse:ref.verse,text});
    if(ref.chapter===+ec&&ref.verse===+ev)break;
  }
  if(!out.length)throw new Error('No Hebrew text returned from BHSA for that reference.');
  return out;
}
async function fetchSblgntBook(bookId){
  const book=GREEK_BOOKS.find(b=>b.id===bookId);
  if(!book)throw new Error('Unknown Greek book');
  if(SBLGNT_CACHE[bookId])return SBLGNT_CACHE[bookId];
  const response=await fetch(SBLGNT_BASE_URL+book.file);
  if(!response.ok)throw new Error('Could not fetch SBLGNT text');
  const text=await response.text();
  SBLGNT_CACHE[bookId]=text;
  return text;
}
function parseSblgntVerses(bookId,raw){
  const refs=[];
  const escaped=bookId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(escaped+'\\s+(\\d+):(\\d+)\\s+','g');
  let m;
  while((m=re.exec(raw))){refs.push({chapter:+m[1],verse:+m[2],start:m.index,end:re.lastIndex});}
  return refs.map((r,i)=>({chapter:r.chapter,verse:r.verse,text:raw.slice(r.end, i+1<refs.length?refs[i+1].start:raw.length).replace(/\s+/g,' ').trim()}));
}
async function getSblgntText(book,sc,sv,ec,ev){
  const raw=await fetchSblgntBook(book);
  const all=parseSblgntVerses(book,raw);
  return all.filter(v=> (v.chapter>+sc || (v.chapter===+sc&&v.verse>=+sv)) && (v.chapter<+ec || (v.chapter===+ec&&v.verse<=+ev)) );
}

function normalizeRefKey(s){
  return String(s||'').toLowerCase().replace(/[.’']/g,'').replace(/\./g,'').replace(/\s+/g,' ').trim();
}
function compactRefKey(s){return normalizeRefKey(s).replace(/\s+/g,'');}
const BOOK_ALIAS_ENTRIES = [
  {source:'hebrew',id:'01O',name:'Genesis',aliases:['genesis','gen','ge','gn']},
  {source:'hebrew',id:'02O',name:'Exodus',aliases:['exodus','exod','exo','ex']},
  {source:'hebrew',id:'03O',name:'Leviticus',aliases:['leviticus','lev','lv']},
  {source:'hebrew',id:'04O',name:'Numbers',aliases:['numbers','num','nu','nm','nb']},
  {source:'hebrew',id:'05O',name:'Deuteronomy',aliases:['deuteronomy','deut','dt','deu']},
  {source:'hebrew',id:'06O',name:'Joshua',aliases:['joshua','josh','jos']},
  {source:'hebrew',id:'07O',name:'Judges',aliases:['judges','judg','jdg','jg']},
  {source:'hebrew',id:'08O',name:'Ruth',aliases:['ruth','ru','rth']},
  {source:'hebrew',id:'09O',name:'1 Samuel',aliases:['1 samuel','1 sam','1sam','first samuel','i samuel','i sam']},
  {source:'hebrew',id:'10O',name:'2 Samuel',aliases:['2 samuel','2 sam','2sam','second samuel','ii samuel','ii sam']},
  {source:'hebrew',id:'11O',name:'1 Kings',aliases:['1 kings','1 kgs','1kgs','1 ki','first kings','i kings']},
  {source:'hebrew',id:'12O',name:'2 Kings',aliases:['2 kings','2 kgs','2kgs','2 ki','second kings','ii kings']},
  {source:'hebrew',id:'13O',name:'1 Chronicles',aliases:['1 chronicles','1 chron','1 chr','1chr','first chronicles','i chronicles']},
  {source:'hebrew',id:'14O',name:'2 Chronicles',aliases:['2 chronicles','2 chron','2 chr','2chr','second chronicles','ii chronicles']},
  {source:'hebrew',id:'15O',name:'Ezra',aliases:['ezra','ezr']},
  {source:'hebrew',id:'16O',name:'Nehemiah',aliases:['nehemiah','neh','ne']},
  {source:'hebrew',id:'17O',name:'Esther',aliases:['esther','esth','est']},
  {source:'hebrew',id:'18O',name:'Job',aliases:['job','jb']},
  {source:'hebrew',id:'19O',name:'Psalms',aliases:['psalms','psalm','ps','psa','pss']},
  {source:'hebrew',id:'20O',name:'Proverbs',aliases:['proverbs','prov','prv','pr']},
  {source:'hebrew',id:'21O',name:'Ecclesiastes',aliases:['ecclesiastes','eccl','ecc','qoheleth','qoh']},
  {source:'hebrew',id:'22O',name:'Song of Solomon',aliases:['song of solomon','song of songs','song','sos','canticles','cant']},
  {source:'hebrew',id:'23O',name:'Isaiah',aliases:['isaiah','isa','is']},
  {source:'hebrew',id:'24O',name:'Jeremiah',aliases:['jeremiah','jer','je']},
  {source:'hebrew',id:'25O',name:'Lamentations',aliases:['lamentations','lam','la']},
  {source:'hebrew',id:'26O',name:'Ezekiel',aliases:['ezekiel','ezek','eze']},
  {source:'hebrew',id:'27O',name:'Daniel',aliases:['daniel','dan','da','dn']},
  {source:'hebrew',id:'28O',name:'Hosea',aliases:['hosea','hos','ho']},
  {source:'hebrew',id:'29O',name:'Joel',aliases:['joel','jl']},
  {source:'hebrew',id:'30O',name:'Amos',aliases:['amos','am']},
  {source:'hebrew',id:'31O',name:'Obadiah',aliases:['obadiah','obad','ob']},
  {source:'hebrew',id:'32O',name:'Jonah',aliases:['jonah','jon']},
  {source:'hebrew',id:'33O',name:'Micah',aliases:['micah','mic','mi']},
  {source:'hebrew',id:'34O',name:'Nahum',aliases:['nahum','nah','na']},
  {source:'hebrew',id:'35O',name:'Habakkuk',aliases:['habakkuk','hab','hb']},
  {source:'hebrew',id:'36O',name:'Zephaniah',aliases:['zephaniah','zeph','zep','zp']},
  {source:'hebrew',id:'37O',name:'Haggai',aliases:['haggai','hag','hg']},
  {source:'hebrew',id:'38O',name:'Zechariah',aliases:['zechariah','zech','zec','zc']},
  {source:'hebrew',id:'39O',name:'Malachi',aliases:['malachi','mal','ml']},
  {source:'greek',id:'Matt',name:'Matthew',aliases:['matthew','matt','mt']},
  {source:'greek',id:'Mark',name:'Mark',aliases:['mark','mk','mrk']},
  {source:'greek',id:'Luke',name:'Luke',aliases:['luke','lk','lu']},
  {source:'greek',id:'John',name:'John',aliases:['john','jn','joh']},
  {source:'greek',id:'Acts',name:'Acts',aliases:['acts','ac']},
  {source:'greek',id:'Rom',name:'Romans',aliases:['romans','rom','ro']},
  {source:'greek',id:'1Cor',name:'1 Corinthians',aliases:['1 corinthians','1 cor','1cor','first corinthians','i corinthians','i cor']},
  {source:'greek',id:'2Cor',name:'2 Corinthians',aliases:['2 corinthians','2 cor','2cor','second corinthians','ii corinthians','ii cor']},
  {source:'greek',id:'Gal',name:'Galatians',aliases:['galatians','gal','ga']},
  {source:'greek',id:'Eph',name:'Ephesians',aliases:['ephesians','eph']},
  {source:'greek',id:'Phil',name:'Philippians',aliases:['philippians','phil','php']},
  {source:'greek',id:'Col',name:'Colossians',aliases:['colossians','col']},
  {source:'greek',id:'1Thess',name:'1 Thessalonians',aliases:['1 thessalonians','1 thess','1thess','1 thes','1thes','first thessalonians','i thessalonians']},
  {source:'greek',id:'2Thess',name:'2 Thessalonians',aliases:['2 thessalonians','2 thess','2thess','2 thes','2thes','second thessalonians','ii thessalonians']},
  {source:'greek',id:'1Tim',name:'1 Timothy',aliases:['1 timothy','1 tim','1tim','first timothy','i timothy']},
  {source:'greek',id:'2Tim',name:'2 Timothy',aliases:['2 timothy','2 tim','2tim','second timothy','ii timothy']},
  {source:'greek',id:'Titus',name:'Titus',aliases:['titus','tit']},
  {source:'greek',id:'Phlm',name:'Philemon',aliases:['philemon','phlm','philem','phm']},
  {source:'greek',id:'Heb',name:'Hebrews',aliases:['hebrews','heb']},
  {source:'greek',id:'Jas',name:'James',aliases:['james','jas','jam','jm']},
  {source:'greek',id:'1Pet',name:'1 Peter',aliases:['1 peter','1 pet','1pet','first peter','i peter']},
  {source:'greek',id:'2Pet',name:'2 Peter',aliases:['2 peter','2 pet','2pet','second peter','ii peter']},
  {source:'greek',id:'1John',name:'1 John',aliases:['1 john','1 jn','1jn','1 joh','first john','i john']},
  {source:'greek',id:'2John',name:'2 John',aliases:['2 john','2 jn','2jn','2 joh','second john','ii john']},
  {source:'greek',id:'3John',name:'3 John',aliases:['3 john','3 jn','3jn','3 joh','third john','iii john']},
  {source:'greek',id:'Jude',name:'Jude',aliases:['jude','jud']},
  {source:'greek',id:'Rev',name:'Revelation',aliases:['revelation','rev','re']}
];
function findBookAlias(bookPart){
  const key=normalizeRefKey(bookPart);
  const compact=compactRefKey(bookPart);
  for(const entry of BOOK_ALIAS_ENTRIES){
    for(const alias of entry.aliases){
      if(normalizeRefKey(alias)===key || compactRefKey(alias)===compact) return entry;
    }
  }
  return null;
}
function parseBibleReference(input){
  const cleaned=String(input||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
  const m=cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/);
  if(!m)return null;
  const book=findBookAlias(m[1]);
  if(!book)return null;
  const sc=+m[2];
  const sv=m[3]?+m[3]:1;
  const ec=m[4]?+m[4]:sc;
  const ev=m[5]?+m[5]:(m[3]?sv:999);
  return {source:book.source,bookId:book.id,bookName:book.name,sc,sv,ec,ev};
}
function setGeneratorFromParsedRef(parsed){
  document.getElementById('textSource').value=parsed.source;
  setupBooks();
  const sel=document.getElementById('bookSelect');
  sel.value=parsed.bookId;
  document.getElementById('startChapter').value=parsed.sc;
  document.getElementById('startVerse').value=parsed.sv;
  document.getElementById('endChapter').value=parsed.ec;
  document.getElementById('endVerse').value=parsed.ev;
  document.getElementById('pasteBox').dir=parsed.source==='greek'?'ltr':'rtl';
}
async function generateFromReference(){
  const box=document.getElementById('passageReference');
  const status=document.getElementById('wlcStatus');
  const parsed=parseBibleReference(box.value);
  if(!parsed){status.textContent='Could not read that reference. Try examples like Ruth 3:4-18, Jn 3:1-5, or 1 Cor 13:1-4.';return;}
  setGeneratorFromParsedRef(parsed);
  await generateWlc();
}

async function generateWlc(){
  const source=(document.getElementById('textSource')&&document.getElementById('textSource').value)||'hebrew-bhsa';
  const sel=document.getElementById('bookSelect');
  const book=sel.value,bname=sel.options[sel.selectedIndex].textContent;
  const sc=document.getElementById('startChapter').value,sv=document.getElementById('startVerse').value,ec=document.getElementById('endChapter').value,ev=document.getElementById('endVerse').value;
  const status=document.getElementById('wlcStatus');
  let verses=[];
  try{
    if(source==='greek'){
      status.textContent='Loading Greek text from SBLGNT...';
      verses=await getSblgntText(book,sc,sv,ec,ev);
      state.language='greek';
      if(typeof window.loadGreekMorphgnt==='function'){try{await loadGreekMorphgnt(book);}catch(err){console.warn('MorphGNT load failed',err);}}
    }else if(source==='hebrew-bhsa'){
      status.textContent='Loading Hebrew text from BHSA (SHEBANQ)...';
      verses=await getBhsaText(book,sc,sv,ec,ev);
      state.language='hebrew';
    }else{
      verses=getWlcText(book,sc,sv,ec,ev);
      state.language='hebrew';
    }
  }catch(e){
    status.textContent=source==='greek'?'Could not load Greek text. Check your internet connection or use paste mode.':source==='hebrew-bhsa'?'Could not load BHSA text. Check your internet connection or use WLC/paste mode.':'Could not load Hebrew text.';
    return;
  }
  if(!verses.length){status.textContent='No text found for that range.';return;}
  generatedRefs=verses.map(v=>`${bname} ${v.chapter}:${v.verse}`);
  document.getElementById('pasteBox').value=verses.map(v=>v.text).join('\n');
  document.getElementById('pasteBox').dir=source==='greek'?'ltr':'rtl';
  document.getElementById('refBox').value=`${bname} ${sc}:${sv}${(sc!==ec||sv!==ev)?'-'+ec+':'+ev:''}`;
  const sourceLabel=source==='greek'?'SBLGNT':source==='hebrew-bhsa'?'BHSA':'WLC';
  status.textContent=`Loaded ${verses.length} verse(s) from ${document.getElementById('refBox').value} (${sourceLabel}).`;
  parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value,true);
  if(typeof closeTopMenus==='function')closeTopMenus();
}
setupBooks();
syncLanguageFromSource();
applyLanguageLayout();

document.getElementById('generateWlc').onclick=generateWlc;
document.getElementById('generateReferenceBtn').onclick=generateFromReference;
document.getElementById('passageReference').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();generateFromReference();}});
document.getElementById('textSource').onchange=()=>{syncLanguageFromSource();setupBooks();applyLanguageLayout();};

document.getElementById('pasteBox').addEventListener('paste',e=>{
  e.preventDefault();
  const cleaned=cleanLogosPaste(e.clipboardData.getData('text/plain'));
  const box=e.target;
  const start=box.selectionStart,end=box.selectionEnd;
  box.value=box.value.slice(0,start)+cleaned+box.value.slice(end);
  box.selectionStart=box.selectionEnd=start+cleaned.length;
});
document.getElementById('pasteBox').addEventListener('focus',function(){
  if(this.value.trim())return;
  const layout=getLanguageLayout();
  this.placeholder=layout.language==='greek'?'Paste Greek text here...':'Paste Hebrew text here...';
});
document.getElementById('pasteBox').addEventListener('blur',function(){
  this.placeholder='';
});
function loadSampleText(){
  document.getElementById('textSource').value='hebrew';
  setupBooks();
  state.language='hebrew';
  document.getElementById('refBox').value='Ruth 3:4';
  document.getElementById('pasteBox').value='וִיהִי בְשָׁכְבוֹ וְיָדַעַתְּ אֶת־הַמָּקוֹם אֲשֶׁר יִשְׁכַּב־שָׁם וּבָאת וְגִלִּית מַרְגְּלֹתָיו וְשָׁכָבְתְּי';
  parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value,true);
}
async function loadSampleWlcPassage(){
  document.getElementById('textSource').value='hebrew';
  syncLanguageFromSource();
  setupBooks();
  document.getElementById('bookSelect').value='08O';
  document.getElementById('startChapter').value=3;
  document.getElementById('startVerse').value=4;
  document.getElementById('endChapter').value=3;
  document.getElementById('endVerse').value=4;
  await generateWlc();
}
document.getElementById('makeText').onclick=()=>{generatedRefs=[];const box=document.getElementById('pasteBox');const cleaned=cleanLogosPaste(box.value);box.value=cleaned;parseText(cleaned,document.getElementById('refBox').value,true);closeTopMenus();};
document.getElementById('sampleText').onclick=loadSampleText;

function ensureLegend(){if(!Array.isArray(state.legend))state.legend=[];}
function legendTypeLabel(type){return ({highlight:'Highlight color',textColor:'Text color',bracket:'Brackets',bold:'Bold',italic:'Italic',underline:'Underline',doubleUnderline:'Double underline',predicate:'Predicate',subject:'Subject'}[type]||type);}
function legendSampleHtml(entry){let sample=state.language==='greek'?'λόγος':'דָּבָר';let cls=state.language==='greek'?'legend-preview-greek':'legend-preview-word';let style='-webkit-print-color-adjust:exact;print-color-adjust:exact;';let text=esc(sample);if(entry.type==='highlight')style+=`background:${entry.color||'#fff36d'};color:#000;`;if(entry.type==='textColor')style+=`color:${entry.color||'#000000'};`;if(entry.type==='bold')style+='font-weight:bold;';if(entry.type==='italic')style+='font-style:italic;';if(entry.type==='underline')style+='text-decoration:underline;';if(entry.type==='doubleUnderline')style+='border-bottom:3px double currentColor;';if(entry.type==='predicate')style+='color:#0b61a4;font-weight:bold;';if(entry.type==='subject')style+='color:#b02a2a;font-weight:bold;';if(entry.type==='bracket'){text='[ ... ]';style+=`color:${entry.color||'#000000'};font-weight:bold;`;}return `<span class="legend-swatch ${cls}" style="${style}">${text}</span>`;}
function renderLegendEditor(){ensureLegend();let box=document.getElementById('legendEditor');if(!box)return;if(!state.legend.length){box.innerHTML='<p class="muted">No legend entries yet. Add an entry or click Detect Used Markings.</p>';return;}let types=['highlight','textColor','bracket','bold','italic','underline','doubleUnderline','predicate','subject'];let html='<table class="legend-table"><thead><tr><th style="width:180px">Marking</th><th style="width:90px">Color</th><th>Custom Label</th><th style="width:130px">Preview</th><th style="width:80px">Remove</th></tr></thead><tbody>';state.legend.forEach((e,i)=>{html+=`<tr data-legend-i="${i}"><td><select class="legend-type">${types.map(t=>`<option value="${t}" ${e.type===t?'selected':''}>${legendTypeLabel(t)}</option>`).join('')}</select></td><td><input class="legend-color" type="color" value="${esc(e.color||'#fff36d')}"></td><td><input class="legend-label" value="${esc(e.label||'')}"></td><td>${legendSampleHtml(e)}</td><td><button class="btn danger legend-remove">Remove</button></td></tr>`;});html+='</tbody></table>';box.innerHTML=html;box.querySelectorAll('tr[data-legend-i]').forEach(tr=>{let i=+tr.dataset.legendI;tr.querySelector('.legend-type').onchange=ev=>{state.legend[i].type=ev.target.value;renderLegendEditor();autoSaveProject();};tr.querySelector('.legend-color').oninput=ev=>{state.legend[i].color=ev.target.value;renderLegendEditor();autoSaveProject();};tr.querySelector('.legend-label').oninput=ev=>{state.legend[i].label=ev.target.value;autoSaveProject();};tr.querySelector('.legend-remove').onclick=()=>{state.legend.splice(i,1);renderLegendEditor();autoSaveProject();};});}
function addLegend(type='highlight',color='#fff36d',label=''){ensureLegend();state.legend.push({type,color,label});renderLegendEditor();autoSaveProject();}
function legendHas(type,color=''){ensureLegend();return state.legend.some(e=>e.type===type&&(!color||String(e.color||'').toLowerCase()===String(color).toLowerCase()));}
function detectUsedLegendEntries(){ensureLegend();let add=[];let sawBracket=false,sawBold=false,sawItalic=false,sawUnderline=false,sawDouble=false,sawPred=false,sawSubj=false;state.verses.forEach(v=>v.clauses.forEach(c=>c.words.forEach(w=>{let f=w.format||{};if(f.highlight&&!legendHas('highlight',f.highlight))add.push({type:'highlight',color:f.highlight,label:''});if(w.color&&!legendHas('textColor',w.color))add.push({type:'textColor',color:w.color,label:''});if(w.bracketStart||w.bracketEnd)sawBracket=true;if(f.bold)sawBold=true;if(f.italic)sawItalic=true;if(f.underline)sawUnderline=true;if(f.doubleUnderline)sawDouble=true;if(w.specials&&w.specials.includes('predicate'))sawPred=true;if(w.specials&&w.specials.includes('subject'))sawSubj=true;})));function maybe(type,color,label){if(!legendHas(type))add.push({type,color,label});}if(sawBracket)maybe('bracket','#ffffff','');if(sawBold)maybe('bold','#000000','');if(sawItalic)maybe('italic','#000000','');if(sawUnderline)maybe('underline','#000000','');if(sawDouble)maybe('doubleUnderline','#000000','');if(sawPred)maybe('predicate','#0b61a4','');if(sawSubj)maybe('subject','#b02a2a','');state.legend=state.legend.concat(add);renderLegendEditor();autoSaveProject();if(!add.length)alert('No new used markings found.');}
function legendEntriesForExport(){ensureLegend();return state.legend.filter(e=>(e.label||'').trim());}
function legendHtmlForExport(){let entries=legendEntriesForExport();if(!entries.length)return '';let rows=entries.map(e=>`<tr><td>${legendSampleHtml(e)}</td><td>${esc(e.label)}</td></tr>`).join('');return `<h3 style="font-family:Arial,Helvetica,sans-serif;margin-top:14px">Legend / Key</h3><table class="export-legend"><thead><tr><th>Marking</th><th>Label</th></tr></thead><tbody>${rows}</tbody></table>`;}

function isWorkspaceTableView(){
  const tableTab=document.getElementById('tableTab');
  return !!(tableTab && !tableTab.classList.contains('hidden'));
}
function setWorkspaceTab(tab){
  const onContour=tab==='contour';
  const onTable=tab==='table';
  document.querySelectorAll('.tabs button').forEach(x=>{
    x.classList.toggle('active',x.dataset.tab===tab);
  });
  const contourShell=document.getElementById('contourWorkspaceShell');
  if(contourShell) contourShell.classList.toggle('hidden',!onContour);
  document.getElementById('contourTab')?.classList.toggle('hidden',!onContour);
  document.getElementById('tableTab')?.classList.toggle('hidden',!onTable);
  document.getElementById('legendTab')?.classList.toggle('hidden',tab!=='legend');
  const annShell=document.getElementById('annotationTabsShell');
  if(annShell) annShell.classList.toggle('hidden',!onContour);
  const legendBelow=document.getElementById('legendBelowEditor');
  if(legendBelow) legendBelow.style.display=onContour?'block':'none';
  document.body.classList.toggle('workspace-table-view',onTable);
  document.body.classList.toggle('workspace-contour-view',onContour);
  const persistComments=document.getElementById('persistentShowComments');
  if(persistComments) persistComments.classList.toggle('hidden',!onContour);
  if(!onContour) hideCommentPopover();
  if(onTable) renderTable();
  if(tab==='legend') renderLegendEditor();
  if(onContour){renderInclusioManager();scheduleEditorLayoutFix();}
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setWorkspaceTab(b.dataset.tab));
document.getElementById('addColumn').onclick=()=>promptModal('Add Column','Column name:', '', v=>{if(v.trim() && v.trim().toLowerCase()!=='parsing')state.columns.push(v.trim());renderTable();});
document.getElementById('resetColumns').onclick=()=>{state.columns=[];renderTable();};
function freshProjectState(){return freshPaneState();}
function freshProjectBundle(){return {parallelEnabled:false,activePane:0,crossArcs:[],verseAlignPairs:null,generatedRefsByPane:[[],[]],panes:[freshPaneState(),freshPaneState()]};}
const PROJECTS_STORE_KEY='hebrewContourApp.projects.v1';
const CURRENT_PROJECT_ID_KEY='hebrewContourApp.currentProjectId.v1';
const LEGACY_STORAGE_KEY='hebrewContourApp.currentProject.v1';
const LEGACY_AUTOSAVE_KEY='hebrewContourApp.autosave.v1';
const APP_VERSION='1.3.9';
let projectStore={currentProjectId:null,projects:{}};
function newProjectId(){return 'p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
function defaultProjectName(){const ref=(state&&state.ref)?String(state.ref).trim():'';return ref||'Untitled Project';}
function readProjectStoreRaw(){try{const raw=localStorage.getItem(PROJECTS_STORE_KEY);if(raw)return JSON.parse(raw);}catch(e){}return null;}
function writeProjectStore(){localStorage.setItem(PROJECTS_STORE_KEY,JSON.stringify({currentProjectId:projectStore.currentProjectId,projects:projectStore.projects}));localStorage.setItem(CURRENT_PROJECT_ID_KEY,projectStore.currentProjectId||'');}
function getCurrentProjectRecord(){return projectStore.currentProjectId?projectStore.projects[projectStore.currentProjectId]||null:null;}
function updateCurrentProjectLabel(){const el=document.getElementById('currentProjectName');const rec=getCurrentProjectRecord();if(el)el.textContent=rec?rec.name:'Untitled Project';}
function payloadHasContent(payload){if(!payload)return false;const st=(payload.state)?payload.state:payload;if(Array.isArray(st.panes))return st.panes.some(p=>p&&Array.isArray(p.verses)&&p.verses.length);return Array.isArray(st.verses)&&st.verses.length;}
function projectPayload(){const rec=getCurrentProjectRecord();const base=projectPayloadParallel();base.projectName=rec?rec.name:defaultProjectName();return base;}
function uniqueProjectName(base){let name=(base||'Untitled Project').trim()||'Untitled Project';if(!projectStore.projects||!Object.values(projectStore.projects).some(p=>p.name===name))return name;let n=2;while(Object.values(projectStore.projects).some(p=>p.name===name+' ('+n+')'))n++;return name+' ('+n+')';}
function migrateLegacyProjects(){if(readProjectStoreRaw())return false;let legacy=null;try{const raw=localStorage.getItem(LEGACY_AUTOSAVE_KEY)||localStorage.getItem(LEGACY_STORAGE_KEY);if(raw)legacy=JSON.parse(raw);}catch(e){}const id=newProjectId();const now=new Date().toISOString();let name='Untitled Project';if(legacy&&legacy.state){if(legacy.state.ref)name=String(legacy.state.ref).trim();else if(legacy.state.panes&&legacy.state.panes[0]&&legacy.state.panes[0].ref)name=String(legacy.state.panes[0].ref).trim();else if(payloadHasContent(legacy))name='Recovered Autosave';}projectStore={currentProjectId:id,projects:{}};if(legacy&&payloadHasContent(legacy)){projectStore.projects[id]={id,name,createdAt:legacy.savedAt||now,updatedAt:legacy.savedAt||now,appVersion:APP_VERSION,payload:legacy};}else{syncStateBundle();projectStore.projects[id]={id,name,createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:projectPayloadParallel()};}writeProjectStore();try{localStorage.removeItem(LEGACY_AUTOSAVE_KEY);localStorage.removeItem(LEGACY_STORAGE_KEY);}catch(e){}return !!legacy;}
function restoreProjectPayload(payload){try{let data=(payload&&payload.state)?payload:{state:payload};if(data.state&&Array.isArray(data.state.verses)&&!data.state.panes){applyProjectPayloadParallel({state:data.state,generatedRefs:data.generatedRefs||payload.generatedRefs,generatedRefsByPane:[data.generatedRefs||payload.generatedRefs||[],[]]});}else{applyProjectPayloadParallel(payload);}clearUndoStack();render();return true;}catch(e){alert('Could not load that project file/save.');return false;}}
function persistCurrentProject(silent){const id=projectStore.currentProjectId;if(!id)return;const now=new Date().toISOString();syncStateBundle();const payload=projectPayload();let rec=projectStore.projects[id];if(rec){rec.payload=payload;rec.updatedAt=now;if((!rec.name||rec.name==='Untitled Project')&&defaultProjectName()!=='Untitled Project')rec.name=defaultProjectName();}else{rec={id,name:defaultProjectName(),createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload};projectStore.projects[id]=rec;}writeProjectStore();updateCurrentProjectLabel();renderProjectFileSubmenus();if(!silent){updateSaveStatus('Saved: '+rec.name+' · '+new Date().toLocaleTimeString());}}
function autoSaveProject(){try{persistCurrentProject(true);const rec=getCurrentProjectRecord();updateSaveStatus('Autosaved: '+(rec?rec.name:'project')+' · '+new Date().toLocaleTimeString());}catch(e){updateSaveStatus('Autosave unavailable in this browser.');}}
function switchToProject(id){if(!projectStore.projects[id])return false;if(id!==projectStore.currentProjectId)persistCurrentProject(true);projectStore.currentProjectId=id;writeProjectStore();const rec=projectStore.projects[id];if(!restoreProjectPayload(rec.payload))return false;updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('Opened: '+rec.name);return true;}
function sortedProjectEntries(){return Object.values(projectStore.projects).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));}
function updateOpenRecentMenuLabel(){const btn=document.getElementById('openRecentMenuBtn');if(!btn)return;const parallel=!!(stateBundle&&stateBundle.parallelEnabled);const label=parallel?'Open Recent in Active Pane':'Open Recent';const chev=btn.querySelector('.file-menu-chevron');btn.textContent=label+' ';if(chev)btn.appendChild(chev);}
function renderPaneProjectDropdowns(){document.querySelectorAll('.parallel-pane-load').forEach(sel=>{const pane=+sel.dataset.pane;const prev=sel.value;sel.innerHTML='<option value="">Load saved project…</option>';sortedProjectEntries().forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name||'Untitled Project';sel.appendChild(opt);});sel.value=prev&&projectStore.projects[prev]?prev:'';if(!sel.dataset.bound){sel.dataset.bound='1';sel.onchange=()=>{const id=sel.value;if(!id)return;loadProjectIntoPane(pane,id);sel.value='';};}});}
function renderProjectFileSubmenus(){const recentList=document.getElementById('recentProjectsSubmenu');const entries=sortedProjectEntries();const cur=projectStore.currentProjectId;const parallel=!!(stateBundle&&stateBundle.parallelEnabled);updateOpenRecentMenuLabel();renderPaneProjectDropdowns();if(!recentList)return;recentList.innerHTML='';if(!entries.length){recentList.innerHTML='<li role="none"><span class="file-menu-empty">'+esc('No recent projects yet.')+'</span></li>';return;}entries.forEach(function(p){const li=document.createElement('li');li.setAttribute('role','none');const btn=document.createElement('button');btn.type='button';btn.className='file-menu-item'+(p.id===cur&&!parallel?' is-current':'');btn.setAttribute('role','menuitem');btn.dataset.projectId=p.id;const when=new Date(p.updatedAt||p.createdAt).toLocaleString();btn.innerHTML=esc(p.name||'Untitled Project')+(p.id===cur&&!parallel?' <span class="file-menu-meta">(current)</span>':'')+'<span class="file-menu-meta">'+esc(when)+'</span>';btn.onclick=function(e){e.stopPropagation();if(parallel)openProjectInActivePane(p.id);else openProjectById(p.id);};li.appendChild(btn);recentList.appendChild(li);});}
function paneHasVerses(p){return !!(p&&Array.isArray(p.verses)&&p.verses.length);}function extractPaneFromPayload(payload,preferPane){const data=(payload&&payload.state)?payload:{state:payload||{}};const st=data.state||{};const pi=preferPane===1?1:0;if(st&&Array.isArray(st.panes)&&st.panes.length){let source=st.panes[pi];if(!paneHasVerses(source))source=st.panes.find(paneHasVerses)||st.panes[0]||{};const pane=Object.assign(freshPaneState(),source);let refs=Array.isArray(payload.generatedRefsByPane)?payload.generatedRefsByPane[pi]:null;if(!refs||!refs.length)refs=(Array.isArray(payload.generatedRefsByPane)?payload.generatedRefsByPane[0]:null)||payload.generatedRefs||data.generatedRefs||[];return{pane,generatedRefs:Array.isArray(refs)?refs.slice():[]};}return{pane:Object.assign(freshPaneState(),st),generatedRefs:Array.isArray(data.generatedRefs)?data.generatedRefs.slice():(Array.isArray(payload.generatedRefs)?payload.generatedRefs.slice():[])};}
function loadProjectIntoPane(paneIndex,projectId){const pi=paneIndex===1?1:0;const rec=projectStore.projects[projectId];if(!rec||!rec.payload)return false;ensureStateBundle();syncStateBundle();const extracted=extractPaneFromPayload(rec.payload,pi);stateBundle.panes[pi]=extracted.pane;stateBundle.generatedRefsByPane[pi]=extracted.generatedRefs;clearVerseAlignState();if(stateBundle.activePane===pi){bindActivePane(pi);}else{stateBundle.panes[stateBundle.activePane]=state;}if(!stateBundle.parallelEnabled){stateBundle.parallelEnabled=true;const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=true;}clearUndoStack();if(autosaveReady)autoSaveProject();render();updateSaveStatus('Loaded "'+rec.name+'" into '+paneLabel(pi));return true;}
function openProjectInActivePane(id){if(!id)return;if(stateBundle.parallelEnabled){loadProjectIntoPane(stateBundle.activePane,id);closeProjectFileMenu();return;}openProjectById(id);}
function openProjectById(id){if(!id)return;if(id===projectStore.currentProjectId){const curRec=getCurrentProjectRecord();updateSaveStatus('Already open: '+(curRec?curRec.name:'project'));closeProjectFileMenu();return;}switchToProject(id);closeProjectFileMenu();}
function initProjectManager(){const stored=readProjectStoreRaw();if(stored&&stored.projects){projectStore={currentProjectId:stored.currentProjectId,projects:stored.projects||{}};}else{migrateLegacyProjects();}if(!projectStore.currentProjectId||!projectStore.projects[projectStore.currentProjectId]){const ids=Object.keys(projectStore.projects).sort((a,b)=>(projectStore.projects[b].updatedAt||'').localeCompare(projectStore.projects[a].updatedAt||''));if(ids.length){projectStore.currentProjectId=ids[0];}else{const id=newProjectId();const now=new Date().toISOString();syncStateBundle();projectStore.currentProjectId=id;projectStore.projects[id]={id,name:'Untitled Project',createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:projectPayloadParallel()};writeProjectStore();}}const rec=getCurrentProjectRecord();if(rec&&rec.payload&&payloadHasContent(rec.payload)){try{restoreProjectPayload(rec.payload);updateSaveStatus('Restored: '+rec.name+' · last edited '+new Date(rec.updatedAt||rec.createdAt).toLocaleString());}catch(e){updateSaveStatus('Could not restore '+rec.name+'. Starting blank.');}}updateCurrentProjectLabel();renderProjectFileSubmenus();initProjectFileMenu();}
function resetManualInspectorState(){try{localStorage.setItem('contour4_manual_inspector_entries','{}');}catch(e){}window.CONTOUR_MANUAL_INSPECTOR={};}function createNewProject(opts){const saveCurrent=!(opts&&opts.saveCurrent===false);if(saveCurrent)persistCurrentProject(true);const id=newProjectId();const now=new Date().toISOString();const n=uniqueProjectName('Untitled Project');stateBundle=freshProjectBundle();state=stateBundle.panes[0];generatedRefs=stateBundle.generatedRefsByPane[0]=[];versePairPick=null;commentAnchorStart=null;clearUndoStack();resetManualInspectorState();bindActivePane(0);syncGeneratorFieldsFromActivePane();const pasteBox=document.getElementById('pasteBox');const refBox=document.getElementById('refBox');if(pasteBox){pasteBox.value='';pasteBox.dir='rtl';}if(refBox)refBox.value='';const parallelToggle=document.getElementById('parallelModeToggle');if(parallelToggle)parallelToggle.checked=false;syncStateBundle();projectStore.projects[id]={id,name:n,createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:projectPayloadParallel()};projectStore.currentProjectId=id;writeProjectStore();const wasReady=autosaveReady;autosaveReady=false;render();autosaveReady=wasReady;updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('New project: '+n);}
function clearTableProject(silent,target){ensureStateBundle();const parallel=!!stateBundle.parallelEnabled;let which=target;if(which===undefined||which===null)which=parallel?stateBundle.activePane:'single';const msg=which==='all'?'Clear all text, annotations, and table content in BOTH panes?':which===0?'Clear all text, annotations, and table content in the LEFT pane?':which===1?'Clear all text, annotations, and table content in the RIGHT pane?':'Clear all text, annotations, and table content in this project?';if(!silent&&!confirm(msg))return;const wipePane=function(pi){stateBundle.panes[pi]=freshPaneState();stateBundle.generatedRefsByPane[pi]=[];pruneCrossArcsForPane(pi);};if(which==='all'){wipePane(0);wipePane(1);stateBundle.crossArcs=[];stateBundle.verseAlignPairs=null;versePairPick=null;}else if(parallel&&(which===0||which===1)){wipePane(which);stateBundle.verseAlignPairs=null;versePairPick=null;}else{state=freshProjectState();generatedRefs=[];stateBundle.panes[stateBundle.activePane]=state;stateBundle.generatedRefsByPane[stateBundle.activePane]=generatedRefs;}bindActivePane(stateBundle.activePane);syncGeneratorFieldsFromActivePane();const pasteBox=document.getElementById('pasteBox');const refBox=document.getElementById('refBox');if(pasteBox&&!state.verses.length)pasteBox.value='';if(refBox&&!state.ref)refBox.value='';clearUndoStack();persistCurrentProject(true);const wasReady=autosaveReady;autosaveReady=false;render();autosaveReady=wasReady;const status=which==='all'?'Both panes cleared.':which===0?'Left pane cleared.':which===1?'Right pane cleared.':'Table cleared.';updateSaveStatus(status);}
function updateSaveStatus(msg){let el=document.getElementById('saveStatus');if(el)el.textContent=msg;}
function saveProjectLocal(){try{persistCurrentProject(false);}catch(e){alert('Could not save in this browser. Try Export JSON instead.');}}
function saveProjectAs(){const cur=getCurrentProjectRecord();if(!cur)return;promptModal('Save As','Save project as:',cur.name,name=>{const n=(name||'').trim();if(!n)return;persistCurrentProject(true);const id=newProjectId();const now=new Date().toISOString();projectStore.projects[id]={id,name:uniqueProjectName(n),createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:JSON.parse(JSON.stringify(projectPayload()))};projectStore.currentProjectId=id;writeProjectStore();updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('Saved as: '+projectStore.projects[id].name);});}
function newProjectPrompt(){const modal=document.getElementById('newProjectModal');if(!modal){createNewProject({saveCurrent:false});return;}const shut=()=>{modal.classList.remove('show');modal.setAttribute('aria-hidden','true');};document.getElementById('newProjectSave').onclick=()=>{shut();try{persistCurrentProject(false);}catch(e){alert('Could not save in this browser. Try Export JSON instead.');return;}createNewProject({saveCurrent:false});};document.getElementById('newProjectDontSave').onclick=()=>{shut();createNewProject({saveCurrent:false});};document.getElementById('newProjectCancel').onclick=shut;modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
function renameCurrentProject(){const cur=getCurrentProjectRecord();if(!cur)return;promptModal('Rename project','Project name:',cur.name,name=>{const n=(name||'').trim();if(!n)return;cur.name=n;writeProjectStore();updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('Renamed to: '+n);});}
function duplicateCurrentProject(){const cur=getCurrentProjectRecord();if(!cur)return;persistCurrentProject(true);promptModal('Duplicate project','Name for the copy:',cur.name+' copy',name=>{const n=(name||'').trim();if(!n)return;const id=newProjectId();const now=new Date().toISOString();projectStore.projects[id]={id,name:uniqueProjectName(n),createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:JSON.parse(JSON.stringify(projectPayload()))};switchToProject(id);closeProjectFileMenu();});}
function deleteCurrentProject(){const cur=getCurrentProjectRecord();if(!cur)return;if(!confirm('Delete project "'+cur.name+'"? Export it first if you may need it later.'))return;delete projectStore.projects[cur.id];const ids=Object.keys(projectStore.projects).sort((a,b)=>(projectStore.projects[b].updatedAt||'').localeCompare(projectStore.projects[a].updatedAt||''));if(ids.length){projectStore.currentProjectId=ids[0];writeProjectStore();switchToProject(ids[0]);}else{createNewProject({saveCurrent:false});updateSaveStatus('Project deleted. Started a new blank project.');}closeProjectFileMenu();}
function downloadProjectFile(){persistCurrentProject(true);const rec=getCurrentProjectRecord();let payload=JSON.stringify(projectPayload(),null,2);let ref=(rec?rec.name:state.ref||'hebrew-contour-project').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'hebrew-contour-project';let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));a.download=ref+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);updateSaveStatus('Exported: '+ref+'.json');}
function importProjectFile(file){if(!file)return;let reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!payloadHasContent(data)&&!(data&&data.state))throw new Error('Missing project state');persistCurrentProject(true);const id=newProjectId();const now=new Date().toISOString();const st=(data&&data.state)?data.state:data;const baseName=(data.projectName||(st.ref)||(st.panes&&st.panes[0]&&st.panes[0].ref)||file.name.replace(/\.json$/i,'')||'Imported Project').trim();const name=uniqueProjectName(baseName);projectStore.projects[id]={id,name,createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:(data&&data.state)?data:{state:st,generatedRefs:data.generatedRefs||[]}};projectStore.currentProjectId=id;writeProjectStore();restoreProjectPayload(projectStore.projects[id].payload);updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('Imported: '+name);closeProjectFileMenu();}catch(e){alert('Could not import that project JSON file.');}};reader.readAsText(file);}
function closeProjectFileMenu(){const card=document.getElementById('projectFileMenuCard');const dd=document.getElementById('projectFileMenuDropdown');const trigger=document.getElementById('projectMenuTrigger');if(card)card.classList.remove('menu-open');if(dd){dd.setAttribute('aria-hidden','true');}if(trigger)trigger.setAttribute('aria-expanded','false');document.querySelectorAll('.file-menu-has-submenu.submenu-open').forEach(el=>el.classList.remove('submenu-open'));}
function openProjectFileMenu(){if(typeof closeTopMenus==='function')closeTopMenus();const card=document.getElementById('projectFileMenuCard');const dd=document.getElementById('projectFileMenuDropdown');const trigger=document.getElementById('projectMenuTrigger');if(!card||!dd)return;renderProjectFileSubmenus();card.classList.add('menu-open');dd.setAttribute('aria-hidden','false');if(trigger)trigger.setAttribute('aria-expanded','true');}
function toggleProjectFileMenu(){const card=document.getElementById('projectFileMenuCard');if(card&&card.classList.contains('menu-open'))closeProjectFileMenu();else openProjectFileMenu();}
function handleProjectFileAction(action){closeProjectFileMenu();switch(action){case 'new-project':newProjectPrompt();break;case 'save-project':saveProjectLocal();break;case 'save-as':saveProjectAs();break;case 'export-contour-pdf':exportContourPdf();break;case 'export-contour-word':exportContourDocx();break;case 'export-contour-html':exportContourHtml();break;case 'export-table-pdf':if(isParallelActive())exportTablePdfParallel();else exportTablePdf();break;case 'export-table-word':document.getElementById('docxExport').click();break;case 'export-project-json':downloadProjectFile();break;case 'import-text':if(typeof openTopMenu==='function')openTopMenu('paste');break;case 'import-project':document.getElementById('projectFileInput').click();break;case 'settings-rename':renameCurrentProject();break;case 'settings-duplicate':duplicateCurrentProject();break;case 'settings-delete':deleteCurrentProject();break;default:break;}}
