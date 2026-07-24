/* file-menu-new-project-v1 */
function initProjectFileMenu(){const card=document.getElementById('projectFileMenuCard');const trigger=document.getElementById('projectMenuTrigger');const dd=document.getElementById('projectFileMenuDropdown');if(!card||!trigger||!dd)return;window.closeProjectFileMenu=closeProjectFileMenu;window.openProjectFileMenu=openProjectFileMenu;trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.addEventListener('click',function(e){e.stopPropagation();toggleProjectFileMenu(trigger);});trigger.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleProjectFileMenu(trigger);}});dd.querySelectorAll('[data-action]').forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();const action=btn.getAttribute('data-action');if(typeof window.handleProjectFileAction==='function')window.handleProjectFileAction(action);});});card.querySelectorAll('.file-menu-has-submenu > .file-menu-item').forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();const li=btn.parentElement;if(!li)return;if(window.matchMedia('(hover: none)').matches||e.detail>0){li.classList.toggle('submenu-open');}});});const openRecentBtn=document.getElementById('openRecentMenuBtn');if(openRecentBtn&&!openRecentBtn.dataset.bound){openRecentBtn.dataset.bound='1';openRecentBtn.addEventListener('click',function(e){e.stopPropagation();renderProjectFileSubmenus();const li=this.parentElement;if(li)li.classList.add('submenu-open');});}document.getElementById('projectFileInput').onchange=function(e){importProjectFile(e.target.files[0]);e.target.value='';};
  const alephInput=document.getElementById('alephTranslationFileInput');
  if(alephInput&&!alephInput.dataset.bound){
    alephInput.dataset.bound='1';
    alephInput.onchange=function(e){importAlephTranslationFile(e.target.files[0]);e.target.value='';};
  }document.addEventListener('click',function(e){if(!card.classList.contains('menu-open'))return;if(card.contains(e.target)||dd.contains(e.target))return;closeProjectFileMenu();});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&card.classList.contains('menu-open'))closeProjectFileMenu();});}

document.querySelectorAll('[data-text-color]').forEach(btn=>btn.onclick=()=>setSelectedColor(btn.dataset.textColor));
document.getElementById('applyCustomColor').onclick=()=>setSelectedColor(document.getElementById('customTextColor').value);
document.getElementById('clearTextColor').onclick=()=>setSelectedColor('');
document.getElementById('toggleBold').onclick=()=>toggleSelectedFormat('bold');
document.getElementById('toggleItalic').onclick=()=>toggleSelectedFormat('italic');
document.getElementById('toggleUnderline').onclick=()=>toggleSelectedFormat('underline');
document.getElementById('toggleDoubleUnderline').onclick=()=>toggleSelectedFormat('doubleUnderline');
document.querySelectorAll('[data-highlight-color]').forEach(btn=>btn.onclick=()=>setSelectedHighlight(btn.dataset.highlightColor));
document.getElementById('applyCustomHighlight').onclick=()=>setSelectedHighlight(document.getElementById('customHighlightColor').value);
document.getElementById('clearHighlight').onclick=()=>setSelectedHighlight('');
document.getElementById('clearWordFormatting').onclick=()=>clearSelectedFormatting();
document.getElementById('toggleDeleteWord').onclick=()=>toggleDeletedSelected();
document.getElementById('setBracketStart').onclick=()=>setBracketAnchor();
document.getElementById('bracketToSelected').onclick=()=>bracketToSelected();
document.getElementById('clearSelectedBrackets').onclick=()=>clearSelectedBrackets();
document.getElementById('clearAllBrackets').onclick=()=>clearAllBrackets();
document.getElementById('newInclusio').onclick=addInclusio;
if(document.getElementById('setInclusioOpeningStatic'))document.getElementById('setInclusioOpeningStatic').onclick=()=>setInclusioAnchor('opening');
if(document.getElementById('setInclusioClosingStatic'))document.getElementById('setInclusioClosingStatic').onclick=()=>setInclusioAnchor('closing');
document.getElementById('deleteActiveInclusio').onclick=()=>deleteActiveInclusio();
document.getElementById('clearInclusioMarkers').onclick=clearInclusioMarkers;
document.getElementById('setCommentStart').onclick=setCommentAnchorStart;
document.getElementById('addCommentBtn').onclick=addCommentFromSelection;
document.getElementById('clearCommentStart').onclick=clearCommentAnchorStart;
if(document.getElementById('commentActionIcon'))document.getElementById('commentActionIcon').onclick=(e)=>{e.stopPropagation();document.getElementById('commentPopover')?.classList.add('menu-open');};
if(document.getElementById('popoverSetCommentStart'))document.getElementById('popoverSetCommentStart').onclick=()=>{setCommentAnchorStart();let pop=document.getElementById('commentPopover');if(pop)pop.classList.remove('menu-open');updateCommentPopover();};
if(document.getElementById('popoverAddComment'))document.getElementById('popoverAddComment').onclick=()=>{hideCommentPopover();addCommentFromSelection();};
if(document.getElementById('popoverClearCommentStart'))document.getElementById('popoverClearCommentStart').onclick=()=>{clearCommentAnchorStart();let pop=document.getElementById('commentPopover');if(pop)pop.classList.remove('menu-open');updateCommentPopover();};
if(document.getElementById('popoverCloseCommentMenu'))document.getElementById('popoverCloseCommentMenu').onclick=()=>{let pop=document.getElementById('commentPopover');if(pop)pop.classList.remove('menu-open');};
document.addEventListener('scroll',()=>setTimeout(updateCommentPopover,0),true);
window.addEventListener('resize',()=>setTimeout(updateCommentPopover,0));
document.addEventListener('click',(e)=>{let pop=document.getElementById('commentPopover');if(pop&&pop.classList.contains('menu-open')&&!pop.contains(e.target)&&!e.target.classList.contains('word'))pop.classList.remove('menu-open');});

function xmlEscape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function docxXml(){let textHeader=state.language==='greek'?'Greek Text':'Hebrew Text';let headers=[textHeader,'Translation','Gloss','Parsing','Notes',...state.columns];let rows=clauseRows().map(r=>[r.hebrew,r.ann['Translation']||'',r.translation,r.ann['Parsing']||'',r.notes,...state.columns.map(c=>r.ann[c]||'')]);function cell(t,rtl){return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p>${rtl?'<w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>':''}<w:r><w:t xml:space="preserve">${xmlEscape(t)}</w:t></w:r></w:p></w:tc>`}let table='<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>';table+='<w:tr>'+headers.map(h=>cell(h,false)).join('')+'</w:tr>';rows.forEach(r=>{table+='<w:tr>'+r.map((v,i)=>cell(v,i===0&&state.language!=='greek')).join('')+'</w:tr>';});table+='</w:tbl>';return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${table}<w:sectPr/></w:body></w:document>`;}

/** Canonical Aleph/Contour verse key: "Book Chapter:Verse" (e.g. "Job 19:21"). */
function canonicalAlephVerseKey(ref){
  const raw=String(ref||'').trim().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  if(!raw)return '';
  if(typeof parseBibleReference==='function'){
    const parsed=parseBibleReference(raw);
    if(parsed&&parsed.sc&&parsed.sv&&parsed.sc===parsed.ec&&parsed.sv===parsed.ev){
      return parsed.bookName+' '+parsed.sc+':'+parsed.sv;
    }
  }
  const full=raw.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if(full)return full[1].trim()+' '+(+full[2])+':'+(+full[3]);
  const cv=raw.match(/^(\d+)\s*:\s*(\d+)$/);
  return cv?(+cv[1])+':'+(+cv[2]):'';
}
function chapterVerseSuffix(key){
  const m=String(key||'').match(/(\d+)\s*:\s*(\d+)\s*$/);
  return m?(+m[1])+':'+(+m[2]):'';
}
function alephEntryText(val){
  if(val==null)return '';
  if(typeof val==='string')return val;
  if(typeof val==='object'&&!Array.isArray(val)&&typeof val.text==='string')return val.text;
  return null;
}
function validateAlephTranslationJson(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return 'Not a valid Aleph Translation JSON file.';
  if(data.app!=='aleph')return 'Not an Aleph translation export (expected app: "aleph").';
  if(data.version!==1)return 'Unsupported Aleph translation JSON version (expected version: 1).';
  if(typeof data.reference!=='string'||!data.reference.trim())return 'Missing passage reference.';
  if(!data.translations||typeof data.translations!=='object'||Array.isArray(data.translations)){
    return 'Missing translations map.';
  }
  const keys=Object.keys(data.translations);
  if(!keys.length)return 'Translations map is empty.';
  for(let i=0;i<keys.length;i++){
    const key=keys[i];
    if(!String(key||'').trim())return 'translations contains an empty verse key.';
    if(alephEntryText(data.translations[key])===null){
      return 'Invalid translation for "'+key+'". Expected a string or { "text": "..." }.';
    }
  }
  return null;
}
function alephPassageMatchError(reference){
  const contourRef=state.ref||'';
  if(!contourRef.trim())return 'Open a Contour passage before importing a translation.';
  const pa=typeof parseBibleReference==='function'?parseBibleReference(contourRef):null;
  const pb=typeof parseBibleReference==='function'?parseBibleReference(reference):null;
  if(!pb)return 'Could not parse the file reference "'+reference+'". Use a form like "Job 19:21-29".';
  if(!pa)return 'Could not parse the Contour passage "'+contourRef+'".';
  if(pa.bookId!==pb.bookId){
    return 'Wrong book. Contour has '+pa.bookName+', but the file is for '+pb.bookName+'.';
  }
  const same=pa.sc===pb.sc&&pa.sv===pb.sv&&pa.ec===pb.ec&&pa.ev===pb.ev;
  if(same)return null;
  const a=typeof normalizePassageRangeRef==='function'?normalizePassageRangeRef(contourRef):contourRef;
  const b=typeof normalizePassageRangeRef==='function'?normalizePassageRangeRef(reference):reference;
  return 'Wrong passage range. Contour has "'+a+'", but the file is for "'+b+'".';
}
function normalizeAlephTranslationsMap(raw){
  const byCanon={};
  const byChapterVerse={};
  let collisions=0;
  Object.keys(raw||{}).forEach(function(rawKey){
    const text=alephEntryText(raw[rawKey]);
    if(text===null)return;
    const entry={text:String(text)};
    const canon=canonicalAlephVerseKey(rawKey);
    const cv=chapterVerseSuffix(canon||rawKey);
    if(canon){
      if(byCanon[canon]&&byCanon[canon].text!==entry.text)collisions++;
      byCanon[canon]=entry;
    }
    if(cv){
      if(byChapterVerse[cv]&&byChapterVerse[cv].text!==entry.text)collisions++;
      byChapterVerse[cv]=entry;
    }
  });
  return {byCanon:byCanon,byChapterVerse:byChapterVerse,collisions:collisions};
}
function applyAlephTranslationImport(data){
  const err=validateAlephTranslationJson(data);
  if(err)return {ok:false,error:err};
  if(!state.verses||!state.verses.length){
    return {ok:false,error:'Open or generate the Contour passage before importing a translation.'};
  }
  const mismatch=alephPassageMatchError(data.reference);
  if(mismatch)return {ok:false,error:mismatch};
  const normalized=normalizeAlephTranslationsMap(data.translations);
  markUndo();
  state.alephTranslations={
    reference:String(data.reference).trim(),
    translations:normalized.byCanon,
    byChapterVerse:normalized.byChapterVerse,
    importedAt:new Date().toISOString()
  };
  syncStateBundle();
  if(autosaveReady)autoSaveProject();
  let matched=0;
  state.verses.forEach(function(v){
    if(getAlephTranslationForVerse(v).trim())matched++;
  });
  let status='Imported Aleph translation ('+matched+' Contour verse'+(matched===1?'':'s')+' with text).';
  if(normalized.collisions)status+=' Note: '+normalized.collisions+' duplicate key'+(normalized.collisions===1?'':'s')+' resolved by keeping the last value.';
  updateSaveStatus(status);
  return {ok:true,matched:matched,collisions:normalized.collisions};
}
function importAlephTranslationFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const data=JSON.parse(String(reader.result||''));
      const result=applyAlephTranslationImport(data);
      if(!result.ok)alert(result.error);
    }catch(e){
      const detail=(e&&e.message)?String(e.message):'Invalid JSON.';
      alert('Could not parse Aleph Translation JSON.\n\n'+detail);
    }
  };
  reader.onerror=function(){alert('Could not read that file.');};
  reader.readAsText(file,'utf-8');
}
function promptImportAlephTranslation(){
  const input=document.getElementById('alephTranslationFileInput');
  if(!input){alert('Import control is unavailable. Reload the app and try again.');return;}
  input.click();
}
function getAlephTranslationForVerse(v){
  const store=state.alephTranslations;
  if(!store)return '';
  const canon=canonicalAlephVerseKey(v&&v.ref);
  if(canon&&store.translations&&store.translations[canon]){
    return String(store.translations[canon].text||'');
  }
  const cv=chapterVerseSuffix(v&&v.ref);
  if(cv&&store.byChapterVerse&&store.byChapterVerse[cv]){
    return String(store.byChapterVerse[cv].text||'');
  }
  // Legacy in-memory maps that stored plain strings under "19:21"
  if(cv&&store.translations&&typeof store.translations[cv]==='string'){
    return String(store.translations[cv]||'');
  }
  if(cv&&store.translations&&store.translations[cv]&&typeof store.translations[cv].text==='string'){
    return String(store.translations[cv].text||'');
  }
  return '';
}

function contourDocxXml(opts){
  opts=opts||{};
  const sideBySide=!!opts.sideBySide;
  const isGreek=state.language==='greek';
  function hex(c){return String(c||'').replace('#','').toUpperCase() || '000000';}
  function baseRunProps(extra=''){
    const font=isGreek?'SBL Greek':'SBL BibLit';
    return `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${isGreek?'':'<w:rtl/>'}<w:sz w:val="32"/><w:szCs w:val="32"/>${extra}`;
  }
  function wordRun(w,l){
    if(isMaqafConnector(w)){
      return `<w:r><w:rPr>${baseRunProps()}</w:rPr><w:t xml:space="preserve">${xmlEscape(w.text||MAQAF_CHAR)}</w:t></w:r>`;
    }
    ensureSelectableWordFields(w);
    let f=w.format||{};
    let color=w.color || (w.specials&&w.specials.includes('predicate')?'#0b61a4':(w.specials&&w.specials.includes('subject')?'#b02a2a':''));
    let rpr=baseRunProps();
    if(color) rpr+=`<w:color w:val="${hex(color)}"/>`;
    if(f.bold) rpr+='<w:b/><w:bCs/>';
    if(f.italic) rpr+='<w:i/><w:iCs/>';
    if(f.underline) rpr+='<w:u w:val="single"/>';
    if(f.doubleUnderline) rpr+='<w:u w:val="double"/>';
    if(f.highlight) rpr+=`<w:shd w:val="clear" w:color="auto" w:fill="${hex(f.highlight)}"/>`;
    if(w.deleted) rpr+='<w:strike/>';
    let suppressCommentStart=l&&isCommentBoundary(l,'start')&&!w.bracketSource;
    let suppressCommentEnd=l&&isCommentBoundary(l,'end')&&!w.bracketSource;
    let txt=((w.bracketStart&&!suppressCommentStart)?'[':'')+w.text+((w.bracketEnd&&!suppressCommentEnd)?']':'')+' ';
    return `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${xmlEscape(txt)}</w:t></w:r>`;
  }
  function hebrewClauseParagraph(v,vi,c,ci){
    const indentTwips=typeof contourIndentDocxTwipsForClause==='function'?contourIndentDocxTwipsForClause(c):Math.max(0,(c.indent||0)*720);
    let runs=c.words.map((w,wi)=>wordRun(w,{v:vi,c:ci,w:wi})).join('');
    let ppr=isGreek?`<w:jc w:val="left"/><w:ind w:left="${indentTwips}"/>`:`<w:bidi/><w:jc w:val="right"/><w:ind w:right="${indentTwips}"/>`;
    const clauseTwips=typeof spacingAfterDocxTwips==='function'?spacingAfterDocxTwips(c):0;
    const isLastClause=ci===v.clauses.length-1;
    const verseTwips=isLastClause&&typeof verseSpacingAfterDocxTwips==='function'?verseSpacingAfterDocxTwips(v):0;
    const spaceTwips=clauseTwips+verseTwips;
    if(spaceTwips)ppr+=`<w:spacing w:after="${spaceTwips}"/>`;
    return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
  }
  function hebrewVerseParagraphs(v,vi){
    let paras='';
    if(!(typeof verseRefHidden==='function'&&verseRefHidden(v))){
      paras+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr><w:t>${xmlEscape(v.ref)}</w:t></w:r></w:p>`;
    }
    v.clauses.forEach((c,ci)=>{paras+=hebrewClauseParagraph(v,vi,c,ci);});
    return paras;
  }
  function englishTranslationParagraphs(text){
    const raw=String(text||'');
    if(!raw.trim())return '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
    return raw.split(/\n/).map(line=>`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`).join('');
  }
  let body='';
  const exportTitle=typeof contourPassageTitleForExport==='function'?contourPassageTitleForExport():(state.ref||'');
  if(exportTitle){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${xmlEscape(exportTitle)}</w:t></w:r></w:p>`;
  }
  function legendRunProps(e){
    let rpr=`<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/>`;
    if(e.type==='highlight')rpr+=`<w:shd w:val="clear" w:color="auto" w:fill="${hex(e.color||'#fff36d')}"/>`;
    if(e.type==='textColor')rpr+=`<w:color w:val="${hex(e.color||'#000000')}"/>`;
    if(e.type==='bracket')rpr+=`<w:color w:val="${hex(e.color||'#000000')}"/><w:b/>`;
    if(e.type==='bold')rpr+='<w:b/>';
    if(e.type==='italic')rpr+='<w:i/>';
    if(e.type==='underline')rpr+='<w:u w:val="single"/>';
    if(e.type==='doubleUnderline')rpr+='<w:u w:val="double"/>';
    if(e.type==='predicate')rpr+='<w:color w:val="0B61A4"/><w:b/>';
    if(e.type==='subject')rpr+='<w:color w:val="B02A2A"/><w:b/>';
    return rpr;
  }
  function legendSampleText(e){return e.type==='bracket'?'[ ... ]':(isGreek?'λόγος':'דָּבָר');}
  let legendEntries=legendEntriesForExport();
  if(legendEntries.length){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Legend / Key</w:t></w:r></w:p>`;
    legendEntries.forEach(e=>{
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr>${legendRunProps(e)}</w:rPr><w:t xml:space="preserve">${xmlEscape(legendSampleText(e))}</w:t></w:r><w:r><w:t xml:space="preserve">  —  ${xmlEscape(e.label||'')}</w:t></w:r></w:p>`;
    });
  }
  if(typeof migrateAllInclusios==='function')migrateAllInclusios();
  if(state.inclusios&&state.inclusios.length){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Units</w:t></w:r></w:p>`;
    state.inclusios.forEach((inc,idx)=>{
      const letter=String.fromCharCode(65+(idx%26));
      const span=typeof deriveInclusioSpan==='function'?deriveInclusioSpan(inc):'';
      const open=inc.openingAnchor?.normalizedText||'';
      const close=inc.closingAnchor?.normalizedText||'';
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">[${letter}] ${xmlEscape(inc.label||'')} — ${xmlEscape(span)}</w:t></w:r></w:p>`;
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve">Opening: ${xmlEscape(open)}; Closing: ${xmlEscape(close)}</w:t></w:r></w:p>`;
      if(inc.theme||inc.evidence)body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve">${xmlEscape([inc.theme&&'Theme: '+inc.theme,inc.evidence&&'Evidence: '+inc.evidence].filter(Boolean).join('; '))}</w:t></w:r></w:p>`;
    });
  }
  if(sideBySide){
    let table='<w:tbl><w:tblPr><w:tblW w:w="10800" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>';
    table+='<w:tr><w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Hebrew</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Translation</w:t></w:r></w:p></w:tc></w:tr>';
    state.verses.forEach((v,vi)=>{
      const heb=hebrewVerseParagraphs(v,vi)||'<w:p><w:r><w:t></w:t></w:r></w:p>';
      const eng=englishTranslationParagraphs(getAlephTranslationForVerse(v));
      table+=`<w:tr><w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr>${heb}</w:tc><w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr>${eng}</w:tc></w:tr>`;
    });
    table+='</w:tbl>';
    body+=table;
  }else{
    state.verses.forEach((v,vi)=>{body+=hebrewVerseParagraphs(v,vi);});
  }
  ensureComments();
  if(state.comments&&state.comments.length){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Comments</w:t></w:r></w:p>`;
    state.comments.forEach((cm,idx)=>{
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">[${idx+1}] ${xmlEscape(commentAnchorText(cm.start,cm.end)||'Anchor missing')} — </w:t></w:r><w:r><w:t xml:space="preserve">${xmlEscape(cm.text||'')}</w:t></w:r></w:p>`;
    });
  }
  ensureArcs();
  if(state.arcs&&state.arcs.length){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Arc Connections</w:t></w:r></w:p>`;
    state.arcs.forEach((arc,idx)=>{
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">[${idx+1}] ${xmlEscape(arc.label||'Arc connection')} — </w:t></w:r><w:r><w:t xml:space="preserve">From: ${xmlEscape(locToLabel(arc.start))}; To: ${xmlEscape(locToLabel(arc.end))}</w:t></w:r></w:p>`;
    });
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;
}

function stripExportPrefix(name){
  // Remove an institutional/course prefix from export names.
  // This keeps user-provided titles like "Ruth 1 Table" from becoming
  // "AMBS — Ruth 1 Table" in Safari/macOS PDF Save As dialogs.
  return String(name||'')
    .replace(/^\s*AMBS\s*[—–-]\s*/i,'')
    .replace(/^\s*AMBS\s+/i,'')
    .trim();
}

function suggestedExportBase(kind){
  let lang=state.language==='greek'?'greek':'hebrew';
  let rawRef=stripExportPrefix(state.ref||kind||'contour-export');
  let ref=rawRef.replace(/[^A-Za-z0-9א-תΑ-Ωα-ω_. -]+/g,'-').replace(/\s+/g,' ').replace(/^-+|-+$/g,'').trim();
  return stripExportPrefix(ref||lang+'-'+kind);
}
function askExportFilename(defaultName, ext){
  let cleanDefault=stripExportPrefix(String(defaultName||'contour-export').replace(new RegExp('\\.'+ext+'$','i'),''));
  let entered=typeof prompt==='function'?prompt('Save/export as:', cleanDefault):cleanDefault;
  if(entered===null)return null;
  entered=stripExportPrefix(String(entered||cleanDefault).trim()||cleanDefault);
  entered=entered.replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim();
  if(!entered) entered=cleanDefault || 'contour-export';
  if(!entered.toLowerCase().endsWith('.'+ext))entered+='.'+ext;
  return entered;
}
function triggerDownload(blob,fname){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=fname;
  a.rel='noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
window.triggerDownload=triggerDownload;

function exportTitleFromFilename(fname){
  return stripExportPrefix(String(fname||'contour-export').replace(/\.[^.]+$/,''));
}
function preparePrintFilename(fname){
  const title=exportTitleFromFilename(fname);
  const oldTitle=document.title;
  // Safari/macOS often uses the current document title as the suggested PDF filename.
  // Temporarily set the parent page title before opening/printing the export window.
  document.title=title;
  setTimeout(()=>{document.title=oldTitle;},8000);
  return {title,oldTitle};
}

function exportContourDocx(opts){
  opts=opts||{};
  if(!opts.skipParallel&&isParallelActive()){exportContourDocxParallel();return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const fname=askExportFilename(suggestedExportBase('contour-editor'),'docx');
  if(!fname)return;
  downloadDocxZip(docxZipFiles(contourDocxXml()),fname);
}
function exportContourSideBySideDocx(opts){
  opts=opts||{};
  if(!opts.skipParallel&&isParallelActive()){
    withPaneExport(stateBundle.activePane,function(){exportContourSideBySideDocx({skipParallel:true});});
    return;
  }
  if(!state.verses.length){alert('Create or generate text first.');return;}
  if(!state.alephTranslations){
    if(!confirm('No Aleph translation is imported yet. Export side-by-side with blank translation column?'))return;
  }
  const fname=askExportFilename(suggestedExportBase('side-by-side'),'docx');
  if(!fname)return;
  // Reuses contourDocxXml Hebrew pipeline (word runs, clause spacing, annotations).
  downloadDocxZip(docxZipFiles(contourDocxXml({sideBySide:true})),fname);
}
window.exportContourSideBySideDocx=exportContourSideBySideDocx;
window.promptImportAlephTranslation=promptImportAlephTranslation;
function exportContourHtml(){
  if(isParallelActive()){alert('For parallel passages, export each pane separately or use Word export.');return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const fname=askExportFilename(suggestedExportBase('contour-editor'),'html');if(!fname)return;
  const html=typeof buildContourExportDocument==='function'?buildContourExportDocument({
    includeSupplement:true,
    worksheet:false,
  }):null;
  if(!html){alert('Create or generate text first.');return;}
  triggerDownload(new Blob([html],{type:'text/html;charset=utf-8'}),fname);
}
function buildContourPrintScript(printMeta) {
  const title = JSON.stringify(printMeta.title);
  const oldTitle = JSON.stringify(printMeta.oldTitle);
  return '<script>document.title=' + title + ';'
    + 'setTimeout(function(){'
    + 'try{if(window.opener)window.opener.document.title=' + title + ';}catch(e){}'
    + 'window.print();'
    + '},300);'
    + 'window.onafterprint=function(){try{if(window.opener)window.opener.document.title=' + oldTitle + ';}catch(e){}};'
    + '<\/script>';
}
window.buildContourPrintScript = buildContourPrintScript;

/** Open export HTML in a popup and trigger the system print / Save-as-PDF dialog. */
function openPdfPrintWindow(html, printMeta) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked. Allow popups for this page, then try again.');
    return null;
  }
  const meta = printMeta || { title: document.title, oldTitle: document.title };
  try { win.document.open(); } catch (e) { /* older browsers */ }
  win.document.write(html);
  win.document.close();
  try { win.document.title = meta.title; } catch (e) { /* ignore */ }
  const restoreTitle = () => {
    try { document.title = meta.oldTitle; } catch (e) { /* ignore */ }
  };
  const triggerPrint = () => {
    try { win.focus(); } catch (e) { /* ignore */ }
    try { win.print(); } catch (e) { /* ignore */ }
  };
  const schedulePrint = () => setTimeout(triggerPrint, 300);
  try {
    win.addEventListener('afterprint', restoreTitle, { once: true });
  } catch (e) { /* ignore */ }
  try {
    if (win.document.readyState === 'complete') schedulePrint();
    else win.addEventListener('load', schedulePrint, { once: true });
  } catch (e) {
    schedulePrint();
  }
  setTimeout(restoreTitle, 12000);
  return win;
}
window.openPdfPrintWindow = openPdfPrintWindow;

function exportContourPdf(opts){
  openWorksheetPdfWizard(opts);
}

function exportWorksheetPdf(settings, opts) {
  if (typeof exportWorksheetPdfSnapshot === 'function') {
    exportWorksheetPdfSnapshot(settings, opts);
    return;
  }
  alert('Worksheet export is unavailable. Please reload the app.');
}
window.exportWorksheetPdf = exportWorksheetPdf;

function openWorksheetPdfWizard(opts) {
  opts = opts || {};
  if (!opts.skipParallel && isParallelActive()) { exportContourPdfParallel(); return; }
  if (!state.verses.length) { alert('Create or generate text first.'); return; }
  if (typeof showWorksheetPdfWizard === 'function') {
    showWorksheetPdfWizard(opts);
    return;
  }
  exportWorksheetPdf(typeof WORKSHEET_EXPORT_DEFAULTS !== 'undefined' ? WORKSHEET_EXPORT_DEFAULTS : {
    scaleMode: '100',
    includeLegend: !!opts.includeLegend,
  });
}
window.openWorksheetPdfWizard = openWorksheetPdfWizard;

const crcTable=(()=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xffffffff;for(let i=0;i<u8.length;i++)c=crcTable[(c^u8[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(n){return [n&255,(n>>>8)&255]}function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function makeZip(files){let enc=new TextEncoder(),parts=[],central=[],offset=0;files.forEach(f=>{let name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);let local=new Uint8Array([0x50,0x4b,3,4,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),0,0,...name]);parts.push(local,data);central.push({name,crc,size:data.length,offset});offset+=local.length+data.length;});let cd=[];central.forEach(f=>{cd.push(new Uint8Array([0x50,0x4b,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(f.crc),...u32(f.size),...u32(f.size),...u16(f.name.length),0,0,0,0,0,0,0,0,0,0,...u32(f.offset),...f.name]));});let cdSize=cd.reduce((a,b)=>a+b.length,0);let end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),0,0]);return new Blob([...parts,...cd,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}

function openTablePdfPrintWindow(tableHtml,exportTitle){
  const fname=askExportFilename(suggestedExportBase('contour-table'),'pdf');if(!fname)return;
  const printMeta=preparePrintFilename(fname);
  const isGreek=state.language==='greek';
  const textDir=isGreek?'ltr':'rtl';
  const textAlign=isGreek?'left':'right';
  const textFont=isGreek?"'SBL Greek','Gentium Plus','Times New Roman',serif":"'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${xmlEscape(printMeta.title)}</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#222}.export-title{font-weight:bold;margin-bottom:14px}table{border-collapse:collapse;width:100%;background:white;direction:ltr;text-align:left}th,td{border:1px solid #999;padding:7px;vertical-align:top}th{background:#eee}.ann-ltr{direction:ltr;text-align:left}.heb{direction:${textDir};text-align:${textAlign};font-size:20px;font-family:${textFont}}.greek{direction:ltr;text-align:left;font-size:20px;font-family:${textFont}}.parallel-table-title{margin:18px 0 8px 0;font-size:18px}@page{margin:0.6in}@media print{button{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><button onclick="window.print()" style="margin-bottom:16px;padding:8px 12px">Print / Save as PDF</button><div class="export-title">${xmlEscape(exportTitle||state.ref||'Contour Table')}</div>${tableHtml}</body></html>`;
  openPdfPrintWindow(html, printMeta);
}
function exportTablePdf(opts){
  opts=opts||{};
  if(!opts.skipParallel&&isParallelActive()){exportTablePdfParallel();return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const tableHtml=typeof buildTableHtmlForPane==='function'?buildTableHtmlForPane(state,0):((document.getElementById('annTable')||{}).outerHTML||'');
  if(!tableHtml){alert('Create or generate text first.');return;}
  openTablePdfPrintWindow(tableHtml,state.ref||'Contour Table');
}

document.getElementById('docxExport').onclick=()=>{if(isParallelActive()){exportTableDocxParallel();return;}let files=[{name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},{name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},{name:'word/document.xml',data:docxXml()}];let fname=askExportFilename(suggestedExportBase('contour-table'),'docx');if(!fname)return;triggerDownload(makeZip(files),fname);};

document.getElementById('tablePdfExport').onclick=()=>{if(isParallelActive()){exportTablePdfParallel();return;}exportTablePdf();};
document.getElementById('addLegendEntry').onclick=()=>addLegend('highlight','#fff36d','');
document.getElementById('detectLegendEntries').onclick=detectUsedLegendEntries;
document.getElementById('clearLegendEntries').onclick=()=>{if(confirm('Clear all legend entries?')){state.legend=[];renderLegendEditor();autoSaveProject();}};
document.getElementById('contourDocxExport').onclick=exportContourDocx;
document.getElementById('contourPdfExport').onclick=()=>openWorksheetPdfWizard();
document.getElementById('contourPdfExportLegend').onclick=()=>openWorksheetPdfWizard({ includeLegend: true });
