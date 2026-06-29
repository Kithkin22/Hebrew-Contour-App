#!/usr/bin/env python3
"""Fix workspace tab switching: hide all contour UI when Table View is active."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER_V1 = "/* tab-switch-fix-v1 */"
MARKER_V2 = "/* tab-switch-fix-v2 */"
MARKER_V3 = "/* tab-switch-fix-v3 */"

CSS_OLD = """#contourTab{
  flex:1;display:flex;flex-direction:column;min-height:0;
}"""

CSS_V1 = """/* tab-switch-fix-v1 */
#annotationTabsShell.hidden{display:none!important;}
#contourTab.hidden{display:none!important;}
#contourTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}
#tableTab.hidden{display:none!important;}
#tableTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}"""

CSS_V2 = """/* tab-switch-fix-v1 */
/* tab-switch-fix-v2 */
#contourWorkspaceShell.hidden{display:none!important;}
#contourWorkspaceShell:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}
#annotationTabsShell.hidden{display:none!important;}
#contourTab.hidden{display:none!important;}
#contourTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}
#tableTab.hidden{display:none!important;}
#tableTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}"""

CSS_V3_EXTRA = """
body.workspace-table-view #persistentShowComments,
body.workspace-table-view #commentPopover{
  display:none!important;
}"""

JS_OLD = """document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById('contourTab').classList.toggle('hidden',b.dataset.tab!=='contour');
  document.getElementById('tableTab').classList.toggle('hidden',b.dataset.tab!=='table');
  document.getElementById('legendTab').classList.toggle('hidden',b.dataset.tab!=='legend');
  if(b.dataset.tab==='table') renderTable();
  if(b.dataset.tab==='legend'){ renderLegendEditor(); }
  if(b.dataset.tab==='contour'){ renderInclusioManager(); }
});"""

JS_V1 = """function setWorkspaceTab(tab){
  document.querySelectorAll('.tabs button').forEach(x=>{
    x.classList.toggle('active',x.dataset.tab===tab);
  });
  document.getElementById('contourTab').classList.toggle('hidden',tab!=='contour');
  document.getElementById('tableTab').classList.toggle('hidden',tab!=='table');
  document.getElementById('legendTab').classList.toggle('hidden',tab!=='legend');
  const annShell=document.getElementById('annotationTabsShell');
  if(annShell) annShell.classList.toggle('hidden',tab!=='contour');
  const legendBelow=document.getElementById('legendBelowEditor');
  if(legendBelow) legendBelow.style.display=tab==='contour'?'block':'none';
  if(tab==='table') renderTable();
  if(tab==='legend') renderLegendEditor();
  if(tab==='contour') renderInclusioManager();
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setWorkspaceTab(b.dataset.tab));"""

JS_V2 = """function setWorkspaceTab(tab){
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
  if(onTable) renderTable();
  if(tab==='legend') renderLegendEditor();
  if(onContour) renderInclusioManager();
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setWorkspaceTab(b.dataset.tab));"""

JS_V2_LAYOUT = JS_V2.replace(
    "if(onContour) renderInclusioManager();",
    "if(onContour){renderInclusioManager();scheduleEditorLayoutFix();}",
)

JS_V3 = """function isWorkspaceTableView(){
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
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setWorkspaceTab(b.dataset.tab));"""

RENDER_OLD = "renderInclusioManager();renderCommentsPanel();setTimeout(updateCommentPopover,0);"
RENDER_NEW = "renderInclusioManager();if(!isWorkspaceTableView())renderCommentsPanel();setTimeout(updateCommentPopover,0);"

HTML_OPEN_OLD = '    <div id="legendTab" class="hidden">'
HTML_OPEN_NEW = '    <div id="contourWorkspaceShell">\n    <div id="legendTab" class="hidden">'

HTML_CLOSE_OLD = """      </div>
    </div>
    <div id="tableTab" class="hidden">"""

HTML_CLOSE_NEW = """      </div>
    </div>
    </div>
    <div id="tableTab" class="hidden">"""

ANNOT_INSERT_OLD = "    anchor.parentNode.insertBefore(shell, anchor);"
ANNOT_INSERT_NEW = """    const contourShell=document.getElementById('contourWorkspaceShell');
    if(contourShell) contourShell.insertBefore(shell, contourShell.firstChild);
    else anchor.parentNode.insertBefore(shell, anchor);"""

LEGEND_OLD = """   if(tableBtn){
      tableBtn.addEventListener('click',()=>{wrap.style.display='none';});
   }
   if(contourBtn){
      contourBtn.addEventListener('click',()=>{wrap.style.display='block';});
   }"""

LEGEND_NEW = """   function syncLegendVisibility(){
      const onContour=document.querySelector('[data-tab="contour"]')?.classList.contains('active');
      wrap.style.display=onContour?'block':'none';
   }
   if(tableBtn) tableBtn.addEventListener('click',syncLegendVisibility);
   if(contourBtn) contourBtn.addEventListener('click',syncLegendVisibility);"""


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")

    if MARKER_V3 in text and "function isWorkspaceTableView" in text:
        print("Tab switch fix v3 already applied.")
        return

    changed = False

    if MARKER_V3 not in text:
        if "body.workspace-table-view #persistentShowComments" not in text:
            anchor = "#contourTab>.parallel-mode-bar{"
            if anchor not in text:
                raise SystemExit("Could not find table-tab CSS anchor for v3 comments rule")
            text = text.replace(
                "#tableTab:not(.hidden){\n  flex:1;display:flex;flex-direction:column;min-height:0;\n}\n" + anchor,
                "#tableTab:not(.hidden){\n  flex:1;display:flex;flex-direction:column;min-height:0;\n}"
                + CSS_V3_EXTRA
                + "\n" + anchor,
                1,
            )
            changed = True
        if MARKER_V2 in text and MARKER_V3 not in text:
            text = text.replace(MARKER_V2, MARKER_V2 + "\n" + MARKER_V3, 1)
            changed = True

    if JS_V3.split("\n", 1)[0] not in text:
        replaced = False
        for old in (JS_V2_LAYOUT, JS_V2, JS_V1, JS_OLD):
            if old in text:
                text = text.replace(old, JS_V3, 1)
                changed = True
                replaced = True
                break
        if not replaced and "function setWorkspaceTab" not in text:
            raise SystemExit("Could not find tab button handler to patch")

    if RENDER_NEW not in text and RENDER_OLD in text:
        text = text.replace(RENDER_OLD, RENDER_NEW, 1)
        changed = True

    if MARKER_V2 not in text and MARKER_V1 not in text:
        if MARKER_V1 in text and MARKER_V2 not in text:
            text = text.replace(CSS_V1, CSS_V2, 1)
            changed = True
        elif CSS_OLD in text:
            text = text.replace(CSS_OLD, CSS_V2, 1)
            changed = True
        elif "#contourTab.hidden{display:none!important;}" not in text:
            raise SystemExit("Could not find contourTab CSS block to patch")

    if 'id="contourWorkspaceShell"' not in text:
        if HTML_OPEN_OLD not in text:
            raise SystemExit("Could not find legendTab HTML to wrap")
        text = text.replace(HTML_OPEN_OLD, HTML_OPEN_NEW, 1)
        if HTML_CLOSE_OLD not in text:
            raise SystemExit("Could not find contourTab/tableTab HTML boundary")
        text = text.replace(HTML_CLOSE_OLD, HTML_CLOSE_NEW, 1)
        changed = True

    if ANNOT_INSERT_NEW.split("\n")[0] not in text:
        if ANNOT_INSERT_OLD not in text:
            raise SystemExit("Could not find buildAnnotationTabs insertBefore anchor")
        text = text.replace(ANNOT_INSERT_OLD, ANNOT_INSERT_NEW, 1)
        changed = True

    if LEGEND_OLD in text:
        text = text.replace(LEGEND_OLD, LEGEND_NEW, 1)
        changed = True

    if not changed:
        print("Tab switch fix already applied (no changes needed).")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: tab switching fix v3 applied")


if __name__ == "__main__":
    main()
