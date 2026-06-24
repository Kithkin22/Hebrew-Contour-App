#!/usr/bin/env python3
"""Cmd/Ctrl+Z undo for text structure, annotations, alignment, and trim edits."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* undo-stack-v1 */"

UNDO_BLOCK = r"""
/* undo-stack-v1 */
const UNDO_MAX=40;
let undoStack=[];
let undoRestoring=false;
function captureUndoSnapshot(){syncStateBundle();return JSON.parse(JSON.stringify({state:state,generatedRefs:generatedRefs,parallelEnabled:stateBundle.parallelEnabled,activePane:stateBundle.activePane,panes:stateBundle.panes,generatedRefsByPane:stateBundle.generatedRefsByPane,verseAlignPairs:stateBundle.verseAlignPairs,crossArcs:stateBundle.crossArcs,versePairPick:versePairPick}));}
function restoreUndoSnapshot(snap){state=snap.state;generatedRefs=snap.generatedRefs;stateBundle.parallelEnabled=snap.parallelEnabled;stateBundle.activePane=snap.activePane;stateBundle.panes=snap.panes;stateBundle.generatedRefsByPane=snap.generatedRefsByPane;stateBundle.verseAlignPairs=snap.verseAlignPairs;stateBundle.crossArcs=snap.crossArcs;versePairPick=snap.versePairPick;if(stateBundle.parallelEnabled&&stateBundle.panes[stateBundle.activePane]){state=stateBundle.panes[stateBundle.activePane];generatedRefs=stateBundle.generatedRefsByPane[stateBundle.activePane]||[];}render();}
function clearUndoStack(){undoStack=[];}
function markUndo(){if(undoRestoring)return;undoStack.push(captureUndoSnapshot());if(undoStack.length>UNDO_MAX)undoStack.shift();}
function undoLastChange(){if(!undoStack.length){updateSaveStatus('Nothing to undo.');return;}undoRestoring=true;const snap=undoStack.pop();restoreUndoSnapshot(snap);undoRestoring=false;if(autosaveReady)autoSaveProject();updateSaveStatus('Undid last change.');}
"""

ANCHOR = "let autosaveReady=false;"

KEYDOWN_OLD = (
    "document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable]'))return;"
    "if(e.key==='ArrowLeft'){"
)

KEYDOWN_NEW = (
    "document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable]'))return;"
    "if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undoLastChange();return;}"
    "if(e.key==='ArrowLeft'){"
)

ANNOTATION_KEYDOWN_OLD = (
    "document.addEventListener('keydown',function(e){\n"
    "   const allMod=(e.ctrlKey||e.metaKey)&&e.shiftKey&&!e.altKey;\n"
    "   if((e.ctrlKey||e.metaKey||e.altKey)&&!allMod)return;\n"
    "   const t=(document.activeElement&&document.activeElement.tagName)||'';\n"
    "   if(/INPUT|TEXTAREA|SELECT/.test(t)||document.activeElement.isContentEditable)return;\n"
    "   if(e.key==='Escape'){closeP();return;}"
)

ANNOTATION_KEYDOWN_NEW = (
    "document.addEventListener('keydown',function(e){\n"
    "   const t=(document.activeElement&&document.activeElement.tagName)||'';\n"
    "   if(/INPUT|TEXTAREA|SELECT/.test(t)||(document.activeElement&&document.activeElement.isContentEditable))return;\n"
    "   if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undoLastChange();return;}\n"
    "   const allMod=(e.ctrlKey||e.metaKey)&&e.shiftKey&&!e.altKey;\n"
    "   if((e.ctrlKey||e.metaKey||e.altKey)&&!allMod)return;\n"
    "   if(e.key==='Escape'){closeP();return;}"
)

TABLE_INPUT_OLD = (
    "td.oninput=()=>{let tr=td.closest('tr'),c=state.verses[+tr.dataset.v].clauses[+tr.dataset.c];"
)

TABLE_INPUT_NEW = (
    "td.oninput=()=>{if(!td._undoSnap){markUndo();td._undoSnap=1;}"
    "let tr=td.closest('tr'),c=state.verses[+tr.dataset.v].clauses[+tr.dataset.c];"
)

PARALLEL_TABLE_INPUT_OLD = (
    "td.oninput=()=>{const tr=td.closest('tr');const pane=+tr.dataset.pane;"
)

PARALLEL_TABLE_INPUT_NEW = (
    "td.oninput=()=>{if(!td._undoSnap){markUndo();td._undoSnap=1;}"
    "const tr=td.closest('tr');const pane=+tr.dataset.pane;"
)

NOTE_CALLBACK_OLD = "promptModal('Word Note','Add parsing or note for selected word:',w.note,v=>{w.note=v;render();});"
NOTE_CALLBACK_NEW = "promptModal('Word Note','Add parsing or note for selected word:',w.note,v=>{markUndo();w.note=v;render();});"

GLOSS_CALLBACK_OLD = "promptModal('Word Gloss','Add gloss for selected word:',w.translation,v=>{w.translation=v;render();});"
GLOSS_CALLBACK_NEW = "promptModal('Word Gloss','Add gloss for selected word:',w.translation,v=>{markUndo();w.translation=v;render();});"

EDIT_COMMENT_OLD = "promptModal('Edit Comment','Comment on: '+commentAnchorText(cm.start,cm.end),cm.text,txt=>{cm.text=txt;state.activeCommentId=id;render();});"
EDIT_COMMENT_NEW = "promptModal('Edit Comment','Comment on: '+commentAnchorText(cm.start,cm.end),cm.text,txt=>{markUndo();cm.text=txt;state.activeCommentId=id;render();});"

REMOVE_VERSE_OLD = (
    "if(!skipConfirm&&!confirm('Remove '+ref+' from '+paneLabel(pane)+'? Annotations on this verse will be removed.'))return;"
    "const remap=l=>remapPaneLocAfterVerseRemoval(l,vi);"
)

REMOVE_VERSE_NEW = (
    "if(!skipConfirm&&!confirm('Remove '+ref+' from '+paneLabel(pane)+'? Annotations on this verse will be removed.'))return;"
    "markUndo();const remap=l=>remapPaneLocAfterVerseRemoval(l,vi);"
)

REMOVE_CLAUSE_OLD = (
    "if(verse.clauses.length===1){removeVerseFromPane(pane,v,true);return;}"
    "const remap=l=>remapPaneLocAfterClauseRemoval(l,v,ci);"
)

REMOVE_CLAUSE_NEW = (
    "if(verse.clauses.length===1){removeVerseFromPane(pane,v,true);return;}"
    "markUndo();const remap=l=>remapPaneLocAfterClauseRemoval(l,v,ci);"
)

RESTORE_PROJECT_OLD = "applyProjectPayloadParallel(payload);}render();return true;"
RESTORE_PROJECT_NEW = "applyProjectPayloadParallel(payload);}clearUndoStack();render();return true;"

LOAD_PANE_OLD = "if(autosaveReady)autoSaveProject();render();updateSaveStatus('Loaded \"'+rec.name+'\" into '+paneLabel(pi));return true;"
LOAD_PANE_NEW = "clearUndoStack();if(autosaveReady)autoSaveProject();render();updateSaveStatus('Loaded \"'+rec.name+'\" into '+paneLabel(pi));return true;"

# Functions that get markUndo(); immediately after opening brace.
MARK_UNDO_FUNCTIONS = [
    "insertBreak",
    "indent",
    "toggleDeletedSelected",
    "toggleSpecial",
    "toggleSelectedFormat",
    "setSelectedColor",
    "setSelectedHighlight",
    "clearSelectedFormatting",
    "setBracketAnchor",
    "bracketToSelected",
    "clearSelectedBrackets",
    "clearAllBrackets",
    "addInclusio",
    "setInclusioPoint",
    "applyInclusioBrackets",
    "clearInclusioMarkers",
    "addCommentFromSelection",
    "deleteComment",
    "shiftRightColumnDown",
    "shiftRightColumnUp",
    "pairVersesOnRow",
    "resetVersePairsToIndex",
    "autoAlignVersePairsByRef",
    "skipVerseToNextRow",
    "nudgeVerseUp",
    "addCrossArcFromLocs",
]

ARC_UNDO_OLD = "}ensureArcs();if(!locOK(start)||!locOK(end))return null;"
ARC_UNDO_NEW = "}markUndo();ensureArcs();if(!locOK(start)||!locOK(end))return null;"


def inject_mark_undo(html: str, fn: str) -> str:
    needle = f"function {fn}("
    idx = html.find(needle)
    if idx < 0:
        return html
    brace = html.find("{", idx)
    if brace < 0:
        return html
    after = html[brace + 1 : brace + 12]
    if after.startswith("markUndo();"):
        return html
    return html[: brace + 1] + "markUndo();" + html[brace + 1 :]


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "undoLastChange",
        "markUndo",
        "clearUndoStack",
        "undoLastChange();return;",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Undo stack v1 already applied.")
        return

    if ANCHOR not in html:
        raise SystemExit("Could not find autosaveReady anchor")
    html = html.replace(ANCHOR, ANCHOR + UNDO_BLOCK, 1)

    if KEYDOWN_OLD not in html:
        raise SystemExit("Could not find main keydown handler anchor")
    html = html.replace(KEYDOWN_OLD, KEYDOWN_NEW, 1)

    if ANNOTATION_KEYDOWN_OLD not in html:
        raise SystemExit("Could not find annotation keydown handler anchor")
    html = html.replace(ANNOTATION_KEYDOWN_OLD, ANNOTATION_KEYDOWN_NEW, 1)

    for old, new, label in (
        (TABLE_INPUT_OLD, TABLE_INPUT_NEW, "table oninput"),
        (PARALLEL_TABLE_INPUT_OLD, PARALLEL_TABLE_INPUT_NEW, "parallel table oninput"),
        (NOTE_CALLBACK_OLD, NOTE_CALLBACK_NEW, "note callback"),
        (GLOSS_CALLBACK_OLD, GLOSS_CALLBACK_NEW, "gloss callback"),
        (EDIT_COMMENT_OLD, EDIT_COMMENT_NEW, "edit comment"),
        (REMOVE_VERSE_OLD, REMOVE_VERSE_NEW, "remove verse"),
        (REMOVE_CLAUSE_OLD, REMOVE_CLAUSE_NEW, "remove clause"),
        (RESTORE_PROJECT_OLD, RESTORE_PROJECT_NEW, "restore project"),
        (LOAD_PANE_OLD, LOAD_PANE_NEW, "load pane"),
    ):
        if old not in html:
            raise SystemExit(f"Could not find anchor: {label}")
        html = html.replace(old, new, 1)

    for fn in MARK_UNDO_FUNCTIONS:
        html = inject_mark_undo(html, fn)

    if ARC_UNDO_OLD not in html:
        raise SystemExit("Could not find addArcFromLocs non-parallel anchor")
    html = html.replace(ARC_UNDO_OLD, ARC_UNDO_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied undo stack v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
