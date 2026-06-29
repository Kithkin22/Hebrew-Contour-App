#!/usr/bin/env python3
"""Denser contour text defaults + zoom slider (localStorage) for single & parallel editors."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER_CSS = "/* editor-text-zoom-v1 */"
MARKER_JS = "/* editor-text-zoom-v1-js */"

CSS_BLOCK = """
/* editor-text-zoom-v1 */
:root{
  --contour-text-base:19px;
  --contour-line-base:1.6;
  --contour-text-scale:1;
}
#editor,
.parallel-verse-body{
  font-size:calc(var(--contour-text-base) * var(--contour-text-scale))!important;
  line-height:var(--contour-line-base)!important;
}
#editor{
  padding:8px 10px!important;
}
#editor .clause,
.parallel-verse-body .clause{
  margin:1px 0!important;
  padding:1px 6px!important;
}
#editor>.muted,
.parallel-verse-ref{
  margin-bottom:2px!important;
}
.editor-zoom-bar{
  flex-shrink:0;
  margin:0 0 2px!important;
  padding:2px 4px!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
}
.editor-zoom-bar .row{
  margin:0!important;
  gap:8px!important;
  flex-wrap:wrap!important;
  align-items:center!important;
}
.editor-zoom-bar .toolbar-label{
  min-width:auto!important;
}
.editor-zoom-btn{
  min-width:2em!important;
  padding:4px 10px!important;
  font-size:15px!important;
  line-height:1.2!important;
  font-weight:700!important;
}
.editor-zoom-slider{
  width:min(140px,28vw);
  margin:0 2px;
  vertical-align:middle;
}
.editor-zoom-pct{
  min-width:3.2em;
  text-align:center;
}
@media(max-width:900px){
  .editor-zoom-slider{width:min(120px,36vw);}
}
"""

HTML_ANCHOR = """      <div class="parallel-mode-bar desktop-only" id="parallelModeBar">"""

HTML_INJECT = """      <div class="toolbar-section editor-zoom-bar" id="editorZoomBar">
        <div class="row">
          <strong class="small toolbar-label">Text size:</strong>
          <button type="button" class="btn editor-zoom-btn" id="editorZoomOut" aria-label="Decrease text size" title="Smaller text">−</button>
          <input type="range" class="editor-zoom-slider" id="editorZoomSlider" min="55" max="130" step="5" value="100" aria-label="Contour text size">
          <button type="button" class="btn editor-zoom-btn" id="editorZoomIn" aria-label="Increase text size" title="Larger text">+</button>
          <button type="button" class="btn" id="editorZoomFit" title="Scale text to fit the visible area">Fit</button>
          <button type="button" class="btn" id="editorZoomReset" title="Reset to default size">Reset</button>
          <span class="muted small editor-zoom-pct" id="editorZoomPct">100%</span>
        </div>
      </div>
""" + HTML_ANCHOR

JS_BLOCK = """
/* editor-text-zoom-v1-js */
const EDITOR_ZOOM_KEY='contourEditorTextScale';
const EDITOR_ZOOM_MIN=0.55;
const EDITOR_ZOOM_MAX=1.3;
const EDITOR_ZOOM_STEP=0.05;
let _editorZoomUiBound=false;
function clampEditorZoom(v){
  return Math.max(EDITOR_ZOOM_MIN,Math.min(EDITOR_ZOOM_MAX,Math.round(v*100)/100));
}
function getEditorTextScale(){
  try{
    const raw=localStorage.getItem(EDITOR_ZOOM_KEY);
    if(raw!=null&&raw!==''){
      const n=parseFloat(raw);
      if(!isNaN(n))return clampEditorZoom(n);
    }
  }catch(e){}
  return 1;
}
function setEditorTextScale(scale,persist){
  const v=clampEditorZoom(scale);
  document.documentElement.style.setProperty('--contour-text-scale',String(v));
  if(persist!==false){
    try{localStorage.setItem(EDITOR_ZOOM_KEY,String(v));}catch(e){}
  }
  updateEditorZoomUI(v);
  if(typeof scheduleEditorLayoutFix==='function')scheduleEditorLayoutFix();
  else if(typeof renderArcOverlay==='function')renderArcOverlay();
}
function updateEditorZoomUI(scale){
  const v=(typeof scale==='number')?scale:getEditorTextScale();
  const slider=document.getElementById('editorZoomSlider');
  const pct=document.getElementById('editorZoomPct');
  if(slider)slider.value=String(Math.round(v*100));
  if(pct)pct.textContent=Math.round(v*100)+'%';
}
function nudgeEditorZoom(delta){
  setEditorTextScale(getEditorTextScale()+delta);
}
function resetEditorTextScale(){
  try{localStorage.removeItem(EDITOR_ZOOM_KEY);}catch(e){}
  setEditorTextScale(1);
}
function fitEditorTextToView(){
  const parallel=typeof isParallelActive==='function'&&isParallelActive();
  const container=parallel
    ?document.querySelector('.parallel-scroll-area')
    :document.getElementById('editorWrap');
  const content=parallel
    ?document.getElementById('parallelVerseRows')
    :document.getElementById('editor');
  if(!container||!content||!String(content.textContent||'').trim())return;
  const avail=container.clientHeight-8;
  if(avail<=40)return;
  const saved=getEditorTextScale();
  document.documentElement.style.setProperty('--contour-text-scale','1');
  const natural=content.scrollHeight;
  document.documentElement.style.setProperty('--contour-text-scale',String(saved));
  if(natural<=0)return;
  setEditorTextScale((avail/natural)*0.94);
}
function initEditorTextZoom(){
  setEditorTextScale(getEditorTextScale(),false);
  if(_editorZoomUiBound)return;
  _editorZoomUiBound=true;
  const out=document.getElementById('editorZoomOut');
  const inn=document.getElementById('editorZoomIn');
  const slider=document.getElementById('editorZoomSlider');
  const fit=document.getElementById('editorZoomFit');
  const reset=document.getElementById('editorZoomReset');
  if(out)out.onclick=()=>nudgeEditorZoom(-EDITOR_ZOOM_STEP);
  if(inn)inn.onclick=()=>nudgeEditorZoom(EDITOR_ZOOM_STEP);
  if(slider)slider.oninput=()=>setEditorTextScale(parseInt(slider.value,10)/100);
  if(fit)fit.onclick=()=>fitEditorTextToView();
  if(reset)reset.onclick=()=>resetEditorTextScale();
}
(function(){
  function boot(){
    initEditorTextZoom();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
"""

CSS_ANCHOR = """/* editor-overflow-fix-v2 */
#appRoot>.wrap,
#contourWorkspaceShell,
#annotationTabsShell,
#parallelCompareWrap,
.parallel-pane-cell{
  min-width:0;
  overflow-x:hidden;
}
#editorWrap.editor-arc-wrap,
#editorWrap{
  width:100%;
  box-sizing:border-box;
  flex:1 1 0!important;
}
#editor .word,
.parallel-verse-body .word{
  max-width:100%;
  overflow-wrap:break-word;
  word-wrap:break-word;
}
"""

JS_ANCHOR = "/* editor-overflow-fix-v1-js */"

RENDER_OLD = (
    "if(autosaveReady)autoSaveProject();scheduleEditorLayoutFix();}"
)

RENDER_NEW = (
    "if(autosaveReady)autoSaveProject();"
    "if(typeof initEditorTextZoom==='function')initEditorTextZoom();"
    "scheduleEditorLayoutFix();}"
)

CSS_V1_OLD = """/* editor-text-zoom-v1 */
:root{
  --contour-text-base:20px;
  --contour-line-base:1.65;
  --contour-text-scale:1;
}"""

CSS_V1_NEW = """/* editor-text-zoom-v1 */
:root{
  --contour-text-base:19px;
  --contour-line-base:1.6;
  --contour-text-scale:1;
}"""

CSS_BAR_OLD = """.editor-zoom-bar{
  flex-shrink:0;
  margin:0 0 4px!important;
  padding:4px 8px!important;
}"""

CSS_BAR_NEW = """.editor-zoom-bar{
  flex-shrink:0;
  margin:0 0 2px!important;
  padding:2px 4px!important;
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
}"""


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")
    changed = False

    if MARKER_CSS not in text:
        if CSS_ANCHOR not in text:
            raise SystemExit("Could not find CSS anchor for editor-text-zoom-v1")
        text = text.replace(CSS_ANCHOR, CSS_ANCHOR + CSS_BLOCK, 1)
        changed = True

    if 'id="editorZoomBar"' not in text:
        if HTML_ANCHOR not in text:
            raise SystemExit("Could not find HTML anchor for editor zoom bar")
        text = text.replace(HTML_ANCHOR, HTML_INJECT, 1)
        changed = True

    if MARKER_JS not in text:
        if JS_ANCHOR not in text:
            raise SystemExit("Could not find JS anchor for editor-text-zoom-v1-js")
        text = text.replace(JS_ANCHOR, JS_BLOCK + "\n" + JS_ANCHOR, 1)
        changed = True

    if "initEditorTextZoom();" not in text.split("function render(){")[1].split("function wordFormatClasses")[0]:
        if RENDER_OLD not in text:
            raise SystemExit("Could not find render() hook for editor text zoom")
        text = text.replace(RENDER_OLD, RENDER_NEW, 1)
        changed = True

    if not changed:
        # Upgrade older v1 blocks in place.
        if CSS_V1_OLD in text:
            text = text.replace(CSS_V1_OLD, CSS_V1_NEW, 1)
            changed = True
        if CSS_BAR_OLD in text:
            text = text.replace(CSS_BAR_OLD, CSS_BAR_NEW, 1)
            changed = True
        if 'id="editorZoomSlider" min="70"' in text:
            text = text.replace(
                'id="editorZoomSlider" min="70"',
                'id="editorZoomSlider" min="55"',
                1,
            )
            changed = True
        if 'const EDITOR_ZOOM_MIN=0.7;' in text:
            text = text.replace('const EDITOR_ZOOM_MIN=0.7;', 'const EDITOR_ZOOM_MIN=0.55;', 1)
            changed = True
        if 'setEditorTextScale(avail/natural);' in text:
            text = text.replace(
                'setEditorTextScale(avail/natural);',
                'setEditorTextScale((avail/natural)*0.94);',
                1,
            )
            changed = True

    if not changed:
        print("Editor text zoom already applied.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: editor text zoom + denser defaults")


if __name__ == "__main__":
    main()
