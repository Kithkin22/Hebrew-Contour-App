#!/usr/bin/env python3
"""Keep Hebrew editor text inside the viewport: scroll + flex/grid min-width fixes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER_V1 = "/* editor-overflow-fix-v1 */"
MARKER_V2 = "/* editor-overflow-fix-v2 */"
MARKER_JS = "/* editor-overflow-fix-v1-js */"

CSS_V1 = """
/* editor-overflow-fix-v1 */
.card.main-workspace,
#contourTab,
#singleEditorSection,
.contour-with-comments,
.parallel-compare,
.parallel-scroll-area{
  min-width:0;
  overflow-x:hidden;
}
#parallelVerseRows{
  min-width:0;
}
.parallel-verse-row{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
}
.parallel-compare-head{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
}
.parallel-verse-cell,
.parallel-verse-body,
.parallel-pane-arc-wrap{
  min-width:0;
  max-width:100%;
  overflow-wrap:break-word;
  word-wrap:break-word;
}
.contour-with-comments>#editorWrap{
  min-height:0;
  max-height:100%;
  align-self:stretch;
}
#editorWrap.editor-arc-wrap,
#editorWrap{
  min-width:0;
  min-height:0;
  height:auto!important;
  overflow-x:hidden;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
}
#editor{
  flex:none!important;
  min-width:0;
  max-width:100%;
  box-sizing:border-box;
  overflow-wrap:break-word;
  word-wrap:break-word;
}
#editor .clause,
#editor .verse,
.parallel-verse-body .clause,
.parallel-verse-body .verse{
  max-width:100%;
  overflow-wrap:break-word;
  word-wrap:break-word;
}
"""

CSS_V2 = """
/* editor-overflow-fix-v2 */
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

JS_BLOCK = """
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
}
(function(){
  if(window._editorLayoutObserver)return;
  function bind(){
    const el=document.querySelector('.card.main-workspace');
    if(!el||typeof ResizeObserver==='undefined')return;
    window._editorLayoutObserver=new ResizeObserver(()=>scheduleEditorLayoutFix());
    window._editorLayoutObserver.observe(el);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
"""

RENDER_OLD = (
    "function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive())"
    "{renderParallelEditors();renderDualTables();}else{renderEditor();renderTable();}"
    "renderLegendEditor();renderInclusioManager();renderCommentsPanel();"
    "setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();"
    "else if(typeof renderArcManager==='function')renderArcManager();"
    "if(stateBundle.parallelEnabled)updateParallelAlignStatus();"
    "if(autosaveReady)autoSaveProject();}"
)

RENDER_NEW = (
    "function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive())"
    "{renderParallelEditors();renderDualTables();}else{renderEditor();renderTable();}"
    "renderLegendEditor();renderInclusioManager();renderCommentsPanel();"
    "setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();"
    "else if(typeof renderArcManager==='function')renderArcManager();"
    "if(stateBundle.parallelEnabled)updateParallelAlignStatus();"
    "if(autosaveReady)autoSaveProject();scheduleEditorLayoutFix();}"
)

SET_TAB_OLD = (
    "  if(onTable) renderTable();\n"
    "  if(tab==='legend') renderLegendEditor();\n"
    "  if(onContour) renderInclusioManager();\n"
    "}"
)

SET_TAB_NEW = (
    "  if(onTable) renderTable();\n"
    "  if(tab==='legend') renderLegendEditor();\n"
    "  if(onContour){renderInclusioManager();scheduleEditorLayoutFix();}\n"
    "}"
)

BUILD_ANNOT_OLD = (
    "        if(typeof renderArcOverlay === 'function') setTimeout(renderArcOverlay,80);\n"
    "      };\n"
    "    });\n"
    "  }\n"
    "\n"
    "  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildAnnotationTabs);"
)

BUILD_ANNOT_NEW = (
    "        if(typeof renderArcOverlay === 'function') setTimeout(renderArcOverlay,80);\n"
    "        scheduleEditorLayoutFix();\n"
    "      };\n"
    "    });\n"
    "    scheduleEditorLayoutFix();\n"
    "  }\n"
    "\n"
    "  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildAnnotationTabs);"
)


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")
    changed = False

    if MARKER_V1 not in text:
        anchor = "/* tab-switch-fix-v2 */"
        if anchor not in text:
            anchor = "</style>"
        if anchor not in text:
            raise SystemExit("Could not find CSS anchor for editor-overflow-fix-v1")
        if anchor == "</style>":
            text = text.replace(anchor, CSS_V1 + anchor, 1)
        else:
            # Insert after tab-switch block's closing rules, before editor-overflow if any
            text = text.replace(anchor, anchor + CSS_V1, 1)
        changed = True

    if MARKER_V2 not in text:
        insert_after = ".parallel-verse-body .verse{\n  max-width:100%;\n  overflow-wrap:break-word;\n  word-wrap:break-word;\n}"
        if insert_after not in text:
            raise SystemExit("Could not find v1 CSS block end for editor-overflow-fix-v2")
        text = text.replace(insert_after, insert_after + CSS_V2, 1)
        changed = True

    if MARKER_JS not in text:
        if RENDER_OLD not in text:
            raise SystemExit("Could not find render() for editor-overflow JS hook")
        text = text.replace(RENDER_OLD, JS_BLOCK + "\n" + RENDER_NEW, 1)
        changed = True

    if SET_TAB_OLD in text and "scheduleEditorLayoutFix();" not in text.split("function setWorkspaceTab")[1].split("}")[0]:
        text = text.replace(SET_TAB_OLD, SET_TAB_NEW, 1)
        changed = True

    if BUILD_ANNOT_OLD in text and "scheduleEditorLayoutFix();" not in text.split("function buildAnnotationTabs")[1].split("if(document.readyState")[0]:
        text = text.replace(BUILD_ANNOT_OLD, BUILD_ANNOT_NEW, 1)
        changed = True

    if not changed:
        print("Editor overflow fix (v1+v2+JS) already applied.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: editor overflow fix v2 + layout recalc hooks")


if __name__ == "__main__":
    main()
