/* 1.3.8d3 full tabbed annotation pane — HCDS v1 collapsed by default */
(function(){
  function setToolbarPanel(panelId){
    const shell=document.getElementById('annotationTabsShell');
    if(!shell) return;
    const panel=document.getElementById(panelId);
    const btn=document.querySelector('.annotation-tab-btn[data-panel="'+panelId+'"]');
    const shortcuts=document.getElementById('annotationShortcutsBar');
    const wasOpen=!shell.classList.contains('toolbar-collapsed')&&panel&&panel.classList.contains('active');

    document.querySelectorAll('.annotation-tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.annotation-tab-panel').forEach(p=>p.classList.remove('active'));
    shell.classList.add('toolbar-collapsed');
    if(shortcuts) shortcuts.classList.add('hidden');

    if(wasOpen){
      if(typeof scheduleEditorLayoutFix==='function') scheduleEditorLayoutFix();
      return;
    }

    if(panel&&btn){
      shell.classList.remove('toolbar-collapsed');
      btn.classList.add('active');
      panel.classList.add('active');
      if(shortcuts) shortcuts.classList.remove('hidden');
    }
    if(typeof scheduleEditorLayoutFix==='function') scheduleEditorLayoutFix();
    if(typeof renderArcOverlay==='function') setTimeout(renderArcOverlay,80);
  }

  function buildAnnotationTabs(){
    if(document.getElementById('annotationTabsShell')) return;

    const color=document.getElementById('colorToolbar')?.closest('.toolbar-section');
    const format=document.getElementById('formatToolbar')?.closest('.toolbar-section');
    const highlight=document.getElementById('highlightToolbar')?.closest('.toolbar-section');
    const brackets=document.getElementById('bracketToolbar');
    const arcs=document.getElementById('arcToolbar');
    const inclusio=document.getElementById('inclusioPanel');
    const contourExportBtn=document.getElementById('contourDocxExport');
    const exportRow=contourExportBtn?contourExportBtn.closest('.row'):null;

    const anchor=color||format||highlight||brackets||arcs||inclusio||exportRow;
    if(!anchor) return;

    const shell=document.createElement('div');
    shell.id='annotationTabsShell';
    shell.className='toolbar-collapsed';
    shell.innerHTML=`
      <div id="annotationToolbarHead">
        <div id="annotationTabsRow">
          <button type="button" class="annotation-tab-btn" data-panel="ann-color">Color</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-format">Format</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-highlight">Highlight</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-brackets">Brackets</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-arcs">Arcs</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-inclusio">Inclusio</button>
          <button type="button" class="annotation-tab-btn" data-panel="ann-export">Export</button>
        </div>
        <div id="parallelModeDock" aria-label="Parallel passages controls"></div>
      </div>
      <div id="annotationShortcutsBar" class="hidden" aria-label="Keyboard shortcuts for selected word">
        <span class="shortcut-bar-label">Keys</span>
        <span class="shortcut-inline-text">
          <abbr title="Bold"><kbd class="keycap keycap-sm">b</kbd> bold</abbr><span class="dot" aria-hidden="true">·</span>
          <abbr title="Italic"><kbd class="keycap keycap-sm">i</kbd> italic</abbr><span class="dot" aria-hidden="true">·</span>
          <abbr title="Underline"><kbd class="keycap keycap-sm">u</kbd> underline</abbr><span class="dot" aria-hidden="true">·</span>
          <abbr title="Double underline"><kbd class="keycap keycap-sm">⇧U</kbd> double</abbr><span class="dot" aria-hidden="true">·</span>
          <abbr title="Text color picker"><kbd class="keycap keycap-sm">c</kbd> color</abbr><span class="dot" aria-hidden="true">·</span>
          <abbr title="Highlight picker"><kbd class="keycap keycap-sm">h</kbd> highlight</abbr>
        </span>
      </div>
      <div id="ann-color" class="annotation-tab-panel"></div>
      <div id="ann-format" class="annotation-tab-panel"></div>
      <div id="ann-highlight" class="annotation-tab-panel"></div>
      <div id="ann-brackets" class="annotation-tab-panel"></div>
      <div id="ann-arcs" class="annotation-tab-panel"></div>
      <div id="ann-inclusio" class="annotation-tab-panel"></div>
      <div id="ann-export" class="annotation-tab-panel"></div>
    `;

    const contourShell=document.getElementById('contourWorkspaceShell');
    if(contourShell) contourShell.insertBefore(shell, contourShell.firstChild);
    else anchor.parentNode.insertBefore(shell, anchor);

    if(color) document.getElementById('ann-color').appendChild(color);
    if(format) document.getElementById('ann-format').appendChild(format);
    if(highlight) document.getElementById('ann-highlight').appendChild(highlight);
    if(brackets) document.getElementById('ann-brackets').appendChild(brackets);
    if(arcs) document.getElementById('ann-arcs').appendChild(arcs);
    if(inclusio) document.getElementById('ann-inclusio').appendChild(inclusio);
    if(exportRow) document.getElementById('ann-export').appendChild(exportRow);

    dockParallelControls();

    document.querySelectorAll('.annotation-tab-btn').forEach(btn=>{
      btn.onclick=()=>setToolbarPanel(btn.dataset.panel);
    });
    if(typeof scheduleEditorLayoutFix==='function') scheduleEditorLayoutFix();
  }

  function dockParallelControls(){
    const parallelBar=document.getElementById('parallelModeBar');
    const dock=document.getElementById('parallelModeDock');
    if(!parallelBar||!dock||parallelBar.dataset.docked) return;
    parallelBar.classList.add('parallel-mode-docked');
    dock.appendChild(parallelBar);
    parallelBar.dataset.docked='1';
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildAnnotationTabs);
  else buildAnnotationTabs();
})();


(function(){
 function installShowComments(){
   if(document.getElementById('persistentShowComments')) return;
   const btn=document.createElement('button');
   btn.id='persistentShowComments';
   btn.textContent='💬 Show Comments';
   document.body.appendChild(btn);

   function sync(){
     let collapsed=false;
     try{ collapsed=!!commentsPanelCollapsed; }catch(e){}
     const shellReady=document.body.classList.contains('hc-shell-ready');
     btn.classList.toggle('show', collapsed&&!shellReady);
   }

   btn.onclick=function(){
     try{ commentsPanelCollapsed=false; }catch(e){}
     if(typeof window.expandHcCommentsPanel==='function') window.expandHcCommentsPanel();
     else if(typeof renderCommentsPanel==='function') renderCommentsPanel();
     const tab=document.querySelector('.hc-panel-tab[data-panel="comments"]');
     if(tab) tab.click();
     sync();
   };

   setInterval(sync,500);
   sync();
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', installShowComments);
 else installShowComments();
})();


(function(){
 function moveLegend(){
   if(document.getElementById('legendBelowEditor')) return;

   const legendTab=document.getElementById('legendTab');
   const legendPanel=document.getElementById('legendPanel');
   const contourTab=document.getElementById('contourTab');
   const tableBtn=document.querySelector('[data-tab="table"]');
   const contourBtn=document.querySelector('[data-tab="contour"]');

   if(!legendPanel || !contourTab) return;

   if(legendTab) legendTab.style.display='none';

   const wrap=document.createElement('div');
   wrap.id='legendBelowEditor';
   wrap.className='collapsed';

   const head=document.createElement('div');
   head.id='legendBelowHeader';
   head.textContent='▶ Legend / Key';

   head.onclick=function(){
      wrap.classList.toggle('collapsed');
      head.textContent=wrap.classList.contains('collapsed')
        ? '▶ Legend / Key'
        : '▼ Legend / Key';
   };

   wrap.appendChild(head);
   wrap.appendChild(legendPanel);
   contourTab.appendChild(wrap);

   function syncLegendVisibility(){
      const onContour=document.querySelector('[data-tab="contour"]')?.classList.contains('active');
      wrap.style.display=onContour?'block':'none';
   }
   if(tableBtn) tableBtn.addEventListener('click',syncLegendVisibility);
   if(contourBtn) contourBtn.addEventListener('click',syncLegendVisibility);
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(moveLegend,500));
 else setTimeout(moveLegend,500);
})();
