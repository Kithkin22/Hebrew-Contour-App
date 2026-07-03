/* file-menu-new-project-v1 */
function initProjectFileMenu(){const card=document.getElementById('projectFileMenuCard');const trigger=document.getElementById('projectMenuTrigger');const dd=document.getElementById('projectFileMenuDropdown');if(!card||!trigger||!dd)return;window.closeProjectFileMenu=closeProjectFileMenu;window.openProjectFileMenu=openProjectFileMenu;trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.addEventListener('click',function(e){e.stopPropagation();toggleProjectFileMenu(trigger);});trigger.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleProjectFileMenu(trigger);}});dd.querySelectorAll('[data-action]').forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();const action=btn.getAttribute('data-action');if(typeof window.handleProjectFileAction==='function')window.handleProjectFileAction(action);});});card.querySelectorAll('.file-menu-has-submenu > .file-menu-item').forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();const li=btn.parentElement;if(!li)return;if(window.matchMedia('(hover: none)').matches||e.detail>0){li.classList.toggle('submenu-open');}});});const openRecentBtn=document.getElementById('openRecentMenuBtn');if(openRecentBtn&&!openRecentBtn.dataset.bound){openRecentBtn.dataset.bound='1';openRecentBtn.addEventListener('click',function(e){e.stopPropagation();renderProjectFileSubmenus();const li=this.parentElement;if(li)li.classList.add('submenu-open');});}document.getElementById('projectFileInput').onchange=function(e){importProjectFile(e.target.files[0]);e.target.value='';};document.addEventListener('click',function(e){if(!card.classList.contains('menu-open'))return;if(card.contains(e.target)||dd.contains(e.target))return;closeProjectFileMenu();});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&card.classList.contains('menu-open'))closeProjectFileMenu();});}

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

function contourDocxXml(){
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
  let body='';
  if(state.ref){
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${xmlEscape(state.ref)}</w:t></w:r></w:p>`;
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
    body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Inclusios</w:t></w:r></w:p>`;
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
  state.verses.forEach((v,vi)=>{
    if(!(typeof verseRefHidden==='function'&&verseRefHidden(v))){
      body+=`<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr><w:t>${xmlEscape(v.ref)}</w:t></w:r></w:p>`;
    }
    v.clauses.forEach((c,ci)=>{
      let indent=Math.max(0,(c.indent||0)*720);
      let runs=c.words.map((w,wi)=>wordRun(w,{v:vi,c:ci,w:wi})).join('');
      let ppr=isGreek?`<w:jc w:val="left"/><w:ind w:left="${indent}"/>`:`<w:bidi/><w:jc w:val="right"/><w:ind w:right="${indent}"/>`;
      const clauseTwips=typeof spacingAfterDocxTwips==='function'?spacingAfterDocxTwips(c):0;
      const isLastClause=ci===v.clauses.length-1;
      const verseTwips=isLastClause&&typeof verseSpacingAfterDocxTwips==='function'?verseSpacingAfterDocxTwips(v):0;
      const spaceTwips=clauseTwips+verseTwips;
      if(spaceTwips)ppr+=`<w:spacing w:after="${spaceTwips}"/>`;
      body+=`<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
    });
  });
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
  let files=[{name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},{name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},{name:'word/document.xml',data:contourDocxXml()}];
  let fname=askExportFilename(suggestedExportBase('contour-editor'),'docx');if(!fname)return;triggerDownload(makeZip(files),fname);
}
function exportContourHtml(){
  if(isParallelActive()){alert('For parallel passages, export each pane separately or use Word export.');return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const fname=askExportFilename(suggestedExportBase('contour-editor'),'html');if(!fname)return;
  const editorHtml=typeof buildContourEditorHtmlFromState==='function'?buildContourEditorHtmlFromState(true):document.getElementById('editor').innerHTML;
  if(!editorHtml){alert('Create or generate text first.');return;}
  const isGreek=state.language==='greek';
  const textDir=isGreek?'ltr':'rtl';
  const textAlign=isGreek?'left':'right';
  const textFont=isGreek?"'SBL Greek','Gentium Plus','Times New Roman',serif":"'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
  const layoutBreakCss=typeof exportLayoutBreakCss==='function'?exportLayoutBreakCss():'';
  const html='<!doctype html><html><head><meta charset="utf-8"><title>'+xmlEscape(state.ref||'Contour Export')+'</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#222}.export-title{font-weight:bold;margin-bottom:14px}#printEditor{direction:'+textDir+';text-align:'+textAlign+';font-size:26px;line-height:2.1;font-family:'+textFont+'}.clause,.word{font-family:'+textFont+'}'+layoutBreakCss+'</style></head><body><div class="export-title">'+xmlEscape(state.ref||'Contour Export')+'</div>'+legendHtmlForExport()+(typeof inclusiosHtmlForExport==='function'?inclusiosHtmlForExport():'')+'<div id="printEditor" dir="'+textDir+'">'+editorHtml+'</div>'+commentsHtmlForExport()+arcsHtmlForExport()+'</body></html>';
  triggerDownload(new Blob([html],{type:'text/html;charset=utf-8'}),fname);
}
function exportContourPdf(opts){
  opts=opts||{};
  if(!opts.skipParallel&&isParallelActive()){exportContourPdfParallel();return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const fname=askExportFilename(suggestedExportBase('contour-editor'),'pdf');if(!fname)return;
  const printMeta=preparePrintFilename(fname);
  const win=window.open('', '_blank');
  if(!win){alert('Popup blocked. Allow popups for this page, then try again.');return;}
  let editorHtml='';
  try{
    editorHtml=typeof buildContourEditorHtmlFromState==='function'?buildContourEditorHtmlFromState(true):document.getElementById('editor').innerHTML;
  }catch(e){
    alert('Could not prepare contour PDF export. Try reloading the project.');
    return;
  }
  if(!editorHtml){alert('Create or generate text first.');return;}
  const isGreek=state.language==='greek';
  const textDir=isGreek?'ltr':'rtl';
  const textAlign=isGreek?'left':'right';
  const textFont=isGreek?"'SBL Greek','Gentium Plus','Times New Roman',serif":"'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
  const title=xmlEscape(printMeta.title);
  const refTitle=xmlEscape(state.ref||'Contour Export');
  const legendHtml=legendHtmlForExport();
  const inclusiosHtml=typeof inclusiosHtmlForExport==='function'?inclusiosHtmlForExport():'';
  const commentsHtml=commentsHtmlForExport();
  const arcsHtml=arcsHtmlForExport();
  const layoutBreakCss=typeof exportLayoutBreakCss==='function'?exportLayoutBreakCss():'';
  const docHtml='<!doctype html><html><head><meta charset="utf-8"><title>'+title+'</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#222}.export-title{font-weight:bold;margin-bottom:14px;direction:ltr;text-align:left}#printEditor{direction:'+textDir+';text-align:'+textAlign+';unicode-bidi:isolate;font-size:26px;line-height:2.1;font-family:'+textFont+'}.clause{display:block;direction:'+textDir+';text-align:'+textAlign+';unicode-bidi:isolate;border-radius:6px;padding:2px 8px;margin:2px 0;font-family:'+textFont+'}'+layoutBreakCss+'.word{display:inline-block;direction:'+textDir+';text-align:'+textAlign+';padding:0 3px;border-radius:4px;font-family:'+textFont+'}.maqaf-connector{display:inline;padding:0;margin:0 -1px;font-family:inherit;line-height:inherit;vertical-align:baseline}.word.selected{background:#ff9900;color:#000;border:2px solid #cc6600;font-weight:normal;}.word.sameword{background:#ffff00;color:#000;border:2px solid #d4aa00;font-weight:normal;}.comment-marker{display:inline-block;direction:ltr;font-family:Arial,Helvetica,sans-serif;font-size:.58em;color:#b02a2a;background:transparent;border:0;padding:0;margin:0 1px;vertical-align:super;line-height:1;font-weight:bold}.word.deleted{text-decoration:line-through;opacity:.35}.word.pred{color:#0b61a4;font-weight:bold}.word.subj{color:#b02a2a;font-weight:bold}.word.fmt-bold{font-weight:bold}.word.fmt-italic{font-style:italic}.word.fmt-underline{text-decoration:underline}.word.fmt-double-underline{border-bottom:3px double currentColor}.word.bracket-start::before{content:\'[\';font-family:Arial,Helvetica,sans-serif;margin-left:2px;margin-right:1px;color:var(--bracket-color,#000);font-weight:bold}.word.bracket-end::after{content:\']\';font-family:Arial,Helvetica,sans-serif;margin-left:1px;margin-right:2px;color:var(--bracket-color,#000);font-weight:bold}.muted{color:#666;font-size:13px;direction:ltr;text-align:left;font-family:Arial,Helvetica,sans-serif}.export-legend{border:1px solid #999;border-collapse:collapse;margin:12px 0 20px 0;width:100%;font-family:Arial,Helvetica,sans-serif}.export-legend th,.export-legend td{border:1px solid #999;padding:6px}.export-legend th{background:#eee;text-align:left}.legend-swatch{display:inline-block;min-width:56px;padding:2px 8px;border:1px solid #999;border-radius:4px;background:#fff;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}.legend-preview-word{font-family:\'SBL BibLit\',\'SBL Hebrew\',\'Ezra SIL\',\'Times New Roman\',serif;font-size:20px}.legend-preview-greek{font-family:\'SBL Greek\',\'Gentium Plus\',\'Times New Roman\',serif;font-size:20px}@page{margin:0.6in}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}button{display:none}#printEditor{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><button onclick="window.print()" style="margin-bottom:16px;padding:8px 12px">Print / Save as PDF</button><div class="export-title">'+refTitle+'</div>'+legendHtml+inclusiosHtml+'<div id="printEditor" dir="'+textDir+'">'+editorHtml+'</div>'+commentsHtml+arcsHtml+'<script>document.title='+JSON.stringify(printMeta.title)+';setTimeout(()=>{try{if(window.opener)window.opener.document.title='+JSON.stringify(printMeta.title)+';}catch(e){} window.print();},300); window.onafterprint=()=>{try{if(window.opener)window.opener.document.title='+JSON.stringify(printMeta.oldTitle)+';}catch(e){}}<\/script></body></html>';
  win.document.write(docHtml);
  win.document.close();
}

const crcTable=(()=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xffffffff;for(let i=0;i<u8.length;i++)c=crcTable[(c^u8[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(n){return [n&255,(n>>>8)&255]}function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function makeZip(files){let enc=new TextEncoder(),parts=[],central=[],offset=0;files.forEach(f=>{let name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);let local=new Uint8Array([0x50,0x4b,3,4,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),0,0,...name]);parts.push(local,data);central.push({name,crc,size:data.length,offset});offset+=local.length+data.length;});let cd=[];central.forEach(f=>{cd.push(new Uint8Array([0x50,0x4b,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(f.crc),...u32(f.size),...u32(f.size),...u16(f.name.length),0,0,0,0,0,0,0,0,0,0,...u32(f.offset),...f.name]));});let cdSize=cd.reduce((a,b)=>a+b.length,0);let end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),0,0]);return new Blob([...parts,...cd,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}

function openTablePdfPrintWindow(tableHtml,exportTitle){
  const fname=askExportFilename(suggestedExportBase('contour-table'),'pdf');if(!fname)return;
  const printMeta=preparePrintFilename(fname);
  const win=window.open('', '_blank');
  if(!win){alert('Popup blocked. Allow popups for this page, then try again.');return;}
  const isGreek=state.language==='greek';
  const textDir=isGreek?'ltr':'rtl';
  const textAlign=isGreek?'left':'right';
  const textFont=isGreek?"'SBL Greek','Gentium Plus','Times New Roman',serif":"'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xmlEscape(printMeta.title)}</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#222}.export-title{font-weight:bold;margin-bottom:14px}table{border-collapse:collapse;width:100%;background:white;direction:ltr;text-align:left}th,td{border:1px solid #999;padding:7px;vertical-align:top}th{background:#eee}.ann-ltr{direction:ltr;text-align:left}.heb{direction:${textDir};text-align:${textAlign};font-size:20px;font-family:${textFont}}.greek{direction:ltr;text-align:left;font-size:20px;font-family:${textFont}}.parallel-table-title{margin:18px 0 8px 0;font-size:18px}@page{margin:0.6in}@media print{button{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><button onclick="window.print()" style="margin-bottom:16px;padding:8px 12px">Print / Save as PDF</button><div class="export-title">${xmlEscape(exportTitle||state.ref||'Contour Table')}</div>${tableHtml}<script>document.title=${JSON.stringify(printMeta.title)};setTimeout(()=>{try{if(window.opener)window.opener.document.title=${JSON.stringify(printMeta.title)};}catch(e){} window.print();},300); window.onafterprint=()=>{try{if(window.opener)window.opener.document.title=${JSON.stringify(printMeta.oldTitle)};}catch(e){}}<\/script></body></html>`);
  win.document.close();
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
document.getElementById('contourPdfExport').onclick=exportContourPdf;
