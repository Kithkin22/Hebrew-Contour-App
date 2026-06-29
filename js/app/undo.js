/* undo-stack-v1 */
const UNDO_MAX=40;
let undoStack=[];
let undoRestoring=false;
function captureUndoSnapshot(){syncStateBundle();return JSON.parse(JSON.stringify({state:state,generatedRefs:generatedRefs,parallelEnabled:stateBundle.parallelEnabled,activePane:stateBundle.activePane,panes:stateBundle.panes,generatedRefsByPane:stateBundle.generatedRefsByPane,verseAlignPairs:stateBundle.verseAlignPairs,crossArcs:stateBundle.crossArcs,versePairPick:versePairPick}));}
function restoreUndoSnapshot(snap){state=snap.state;generatedRefs=snap.generatedRefs;stateBundle.parallelEnabled=snap.parallelEnabled;stateBundle.activePane=snap.activePane;stateBundle.panes=snap.panes;stateBundle.generatedRefsByPane=snap.generatedRefsByPane;stateBundle.verseAlignPairs=snap.verseAlignPairs;stateBundle.crossArcs=snap.crossArcs;versePairPick=snap.versePairPick;if(stateBundle.parallelEnabled&&stateBundle.panes[stateBundle.activePane]){state=stateBundle.panes[stateBundle.activePane];generatedRefs=stateBundle.generatedRefsByPane[stateBundle.activePane]||[];}render();}
function clearUndoStack(){undoStack=[];}
function markUndo(){if(undoRestoring)return;undoStack.push(captureUndoSnapshot());if(undoStack.length>UNDO_MAX)undoStack.shift();}
function undoLastChange(){if(!undoStack.length){updateSaveStatus('Nothing to undo.');return;}undoRestoring=true;const snap=undoStack.pop();restoreUndoSnapshot(snap);undoRestoring=false;if(autosaveReady)autoSaveProject();updateSaveStatus('Undid last change.');}
