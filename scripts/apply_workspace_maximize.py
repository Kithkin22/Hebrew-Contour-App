#!/usr/bin/env python3
"""Maximize editor/parallel workspace: less margin, compact chrome, flex height."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* workspace-maximize-v1 */"

CSS_BLOCK = """
/* workspace-maximize-v1 */
html,body{height:100%;}
body{display:flex;flex-direction:column;}
#appRoot{
  flex:1;display:flex;flex-direction:column;
  min-height:100vh;min-height:100dvh;
}
#appRoot:not(.hidden){
  display:flex!important;
  flex-direction:column!important;
}
#appRoot>header{
  flex-shrink:0;
  padding:6px 12px!important;
}
#appRoot>header h1{
  font-size:17px!important;
}
#appRoot>.wrap{
  flex:1;display:flex;flex-direction:column;min-height:0;
  max-width:none!important;width:100%;margin:0!important;
  padding:6px 8px 8px!important;box-sizing:border-box;
}
.wrap>.top-stack{
  flex-shrink:0;
  margin-bottom:6px!important;
  padding:5px 6px!important;
  gap:6px!important;
}
@media(min-width:901px){
  .top-menu-hint{display:none!important;}
}
.card.main-workspace{
  flex:1;display:flex;flex-direction:column;min-height:min(320px,55vh);
  padding:8px 10px!important;margin-bottom:0!important;
}
.main-workspace>.tabs.row{
  flex-shrink:0;margin-bottom:4px!important;gap:6px!important;
}
.main-workspace>.tabs .btn{
  padding:6px 10px!important;font-size:13px!important;
}
.workspace-help-row{
  flex-shrink:0;margin:0 0 4px!important;gap:6px!important;
}
.workspace-help-row .btn,.workspace-help-row .admin-link{
  padding:4px 8px!important;font-size:12px!important;
}
#annotationTabsShell{
  flex-shrink:0;margin:4px 0 6px!important;border-radius:8px!important;
}
#annotationTabsRow{
  gap:10px!important;padding:0 8px!important;
}
.annotation-tab-btn{
  padding:8px 2px 6px!important;font-size:14px!important;
  border-bottom-width:3px!important;
}
#annotationShortcutsBar{
  padding:3px 8px!important;gap:8px!important;
}
.annotation-tab-panel{padding:8px!important;}
.annotation-tab-panel .btn{padding:6px 9px!important;font-size:12px!important;}
#annotationTabsShell.hidden{display:none!important;}
#contourTab.hidden{display:none!important;}
#contourTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}
#tableTab.hidden{display:none!important;}
#tableTab:not(.hidden){
  flex:1;display:flex;flex-direction:column;min-height:0;
}
#contourTab>.parallel-mode-bar{
  flex-shrink:0;margin:0 0 6px!important;padding:6px 8px!important;
  gap:8px!important;font-size:12px;
}
.parallel-align-heading{font-size:12px!important;}
.parallel-mode-bar .btn{padding:5px 8px!important;font-size:12px!important;}
.parallel-align-status{
  margin:0!important;padding:4px 8px!important;font-size:12px!important;
  flex:1 1 100%;
}
#parallelAlignHint{font-size:11px!important;}
.parallel-compare:not(.hidden){
  flex:1;display:flex!important;flex-direction:column;min-height:0;
  margin-bottom:0!important;
}
.parallel-compare-head{
  flex-shrink:0;gap:8px!important;margin-bottom:4px!important;
}
.parallel-pane-head{
  padding:5px 8px!important;font-size:13px!important;border-radius:6px!important;
}
.parallel-pane-load{padding:3px 6px!important;font-size:11px!important;}
.parallel-scroll-area{
  flex:1;min-height:240px;overflow-y:auto;
}
.parallel-verse-row{gap:8px!important;margin-bottom:6px!important;}
.parallel-verse-cell{padding:6px 8px!important;}
#singleEditorSection:not(.hidden){
  flex:1;display:flex!important;flex-direction:column;min-height:0;
}
#singleEditorSection>.row{
  flex-shrink:0;margin-bottom:4px!important;
}
.contour-with-comments{
  flex:1;display:grid!important;
  grid-template-columns:minmax(0,1fr) 300px!important;
  gap:10px!important;min-height:0;align-items:stretch!important;
}
.contour-with-comments.comments-collapsed{
  grid-template-columns:minmax(0,1fr)!important;
}
#editorWrap{
  flex:1;min-height:240px;height:100%;
  display:flex;flex-direction:column;
}
#editor{
  flex:1;min-height:200px;
  padding:12px 14px!important;
}
.toolbar-section{padding:5px 8px!important;margin:4px 0!important;}
.arc-toolbar{padding:5px 8px!important;margin:4px 0!important;}
.top-stack .card.compact-card>strong:first-child,
.top-stack .card.compact-card>.save-tools-title{
  min-height:30px!important;padding:5px 10px!important;font-size:14px!important;
}
#themeToggleBtn,#inspectorToggleBtn,#manualInspectorBtn{
  min-height:30px!important;padding:5px 10px!important;font-size:13px!important;
}
@media(max-width:900px){
  #appRoot>.wrap{padding:8px!important;}
  .card.main-workspace{padding:10px!important;}
  .top-menu-hint{display:block!important;}
  .parallel-scroll-area{min-height:200px;}
  #editorWrap{min-height:200px;}
}
"""


def main():
    text = INDEX.read_text(encoding="utf-8")
    if MARKER in text:
        print("Workspace maximize already applied.")
        return

    anchor = "</style>"
    if anchor not in text:
        raise SystemExit("Could not find </style>")
    text = text.replace(anchor, CSS_BLOCK + anchor, 1)

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: added workspace-maximize CSS")


if __name__ == "__main__":
    main()
