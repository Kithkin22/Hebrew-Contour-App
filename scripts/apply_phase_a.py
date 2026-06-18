#!/usr/bin/env python3
"""Apply Phase A UX changes to index.html without corrupting embedded WLC data."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

PHASE_A_CSS = """
/* Phase A — click-to-open top menus, empty state, help modal */
#topMenuBackdrop{
  position:fixed;inset:0;background:rgba(10,20,32,.38);z-index:2500;display:none;pointer-events:none;
}
#topMenuBackdrop.show{display:block;}
.top-stack .card.compact-card:hover > p,
.top-stack .card.compact-card:hover > div,
.top-stack .card.compact-card:hover > textarea,
.top-stack .card.compact-card:hover > input,
.top-stack .card.compact-card:focus-within > p,
.top-stack .card.compact-card:focus-within > div,
.top-stack .card.compact-card:focus-within > textarea,
.top-stack .card.compact-card:focus-within > input{
  display:none!important;
}
.top-stack .card.compact-card:hover::after,
.top-stack .card.compact-card:hover::before,
.top-stack .card.compact-card:focus-within::after,
.top-stack .card.compact-card:focus-within::before{
  content:none!important;display:none!important;
}
.top-stack .card.compact-card.menu-open > p,
.top-stack .card.compact-card.menu-open > div,
.top-stack .card.compact-card.menu-open > textarea,
.top-stack .card.compact-card.menu-open > input{
  display:flex!important;
}
.top-stack .card.compact-card.menu-open::before{
  content:""!important;display:block!important;
  position:absolute;top:44px;left:0;width:660px;min-height:220px;
  background:var(--ui-surface,#fff);border:1px solid var(--ui-line,#d8e1ea);
  border-radius:14px;box-shadow:0 18px 42px rgba(20,37,56,.20);z-index:-1;
}
.top-stack .card.compact-card[data-menu="paste"].menu-open::before{width:520px;min-height:220px;}
.top-stack .card.compact-card[data-menu="project"].menu-open::before{width:720px;min-height:190px;}
.top-stack .card.compact-card.menu-open > p{
  position:absolute!important;left:18px!important;top:58px!important;width:600px!important;margin:0!important;z-index:5!important;
}
.top-stack .card.compact-card.menu-open > .generator-source-row{
  position:absolute!important;left:18px!important;top:94px!important;width:610px!important;z-index:5!important;
}
.top-stack .card.compact-card.menu-open > .generator-passage-row{
  position:absolute!important;left:18px!important;top:138px!important;width:640px!important;z-index:5!important;
}
.top-stack .card.compact-card.menu-open > .generator-reference-row{
  position:absolute!important;left:18px!important;top:186px!important;width:640px!important;z-index:5!important;
}
.top-stack .card.compact-card.menu-open > #wlcStatus{
  position:absolute!important;left:18px!important;top:236px!important;width:610px!important;z-index:5!important;display:block!important;
}
.top-stack .card.compact-card[data-menu="paste"].menu-open > p{
  left:18px!important;top:58px!important;width:460px!important;
}
.top-stack .card.compact-card.menu-open > #pasteBox{
  display:block!important;position:absolute!important;left:18px!important;top:94px!important;
  width:480px!important;min-height:88px!important;z-index:5!important;
}
.top-stack .card.compact-card[data-menu="paste"].menu-open > .row{
  position:absolute!important;left:18px!important;top:190px!important;width:480px!important;z-index:5!important;
}
.top-stack .card.compact-card[data-menu="project"].menu-open > .row{
  position:absolute!important;left:18px!important;top:58px!important;width:680px!important;z-index:5!important;
}
.top-stack .card.compact-card[data-menu="project"].menu-open > .save-tools{
  position:absolute!important;left:18px!important;top:122px!important;width:680px!important;z-index:5!important;
}
.top-stack .card.compact-card[data-menu="project"].menu-open > p{
  left:18px!important;top:186px!important;width:640px!important;display:block!important;
}
.top-stack .card.compact-card.menu-open > strong:first-child,
.top-stack .card.compact-card.menu-open > .save-tools-title{
  background:#f8fbff!important;border-color:#9fc8ee!important;
}
body.dark-mode .top-stack .card.compact-card.menu-open > strong:first-child,
body.dark-mode .top-stack .card.compact-card.menu-open > .save-tools-title{
  background:#233241!important;border-color:#6db5ff!important;
}
.menu-trigger:focus-visible{outline:2px solid var(--ui-blue,#1f5f99);outline-offset:2px;}
.workspace-help-row{display:flex;justify-content:flex-end;align-items:center;margin:0 0 10px;gap:8px;}
#helpBtn{min-width:34px;padding:7px 12px;font-weight:800;}
.help-panel{max-width:560px;}
.help-panel h3{margin-top:0;}
.help-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;}
.help-table th,.help-table td{border:1px solid var(--ui-line,#d8e1ea);padding:6px 8px;text-align:left;vertical-align:top;}
.help-table th{background:var(--ui-surface-2,#f8fafc);}
.editor-empty-state{text-align:center;padding:48px 24px;direction:ltr;}
.editor-empty-title{font-size:20px;font-weight:800;margin:0 0 8px;color:var(--ui-text,#1f2d3d);}
.editor-empty-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;}
@media(max-width:900px){
  .top-stack .card.compact-card.menu-open::before{width:calc(100vw - 48px)!important;max-width:660px;}
  .top-stack .card.compact-card.menu-open > p,
  .top-stack .card.compact-card.menu-open > .generator-source-row,
  .top-stack .card.compact-card.menu-open > .generator-passage-row,
  .top-stack .card.compact-card.menu-open > .generator-reference-row,
  .top-stack .card.compact-card.menu-open > #pasteBox,
  .top-stack .card.compact-card.menu-open > .row{width:calc(100vw - 72px)!important;max-width:600px;}
}
"""

HELP_MODAL = """
<div class="modal" id="helpModal" aria-hidden="true" role="dialog" aria-labelledby="helpModalTitle">
  <div class="panel help-panel">
    <h3 id="helpModalTitle">Keyboard shortcuts &amp; tips</h3>
    <p class="muted">Select a word in the Contour Editor, then use these shortcuts (when not typing in a text field).</p>
    <table class="help-table">
      <thead><tr><th>Key</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td><span class="kbd">Enter</span></td><td>Break clause at selected word</td></tr>
        <tr><td><span class="kbd">Tab</span> / <span class="kbd">Backspace</span></td><td>Indent / outdent clause</td></tr>
        <tr><td><span class="kbd">n</span></td><td>Add or edit a word note</td></tr>
        <tr><td><span class="kbd">t</span></td><td>Add or edit a gloss (translation)</td></tr>
        <tr><td><span class="kbd">p</span> / <span class="kbd">s</span></td><td>Toggle predicate / subject marking</td></tr>
        <tr><td><span class="kbd">Delete</span> / <span class="kbd">Shift+Backspace</span></td><td>Hide or restore selected word</td></tr>
        <tr><td>Arrow keys</td><td>Navigate words and clauses (RTL-aware)</td></tr>
        <tr><td><span class="kbd">b</span> / <span class="kbd">i</span> / <span class="kbd">u</span></td><td>Bold / italic / underline</td></tr>
        <tr><td><span class="kbd">Shift+U</span></td><td>Double underline</td></tr>
        <tr><td><span class="kbd">c</span> / <span class="kbd">h</span></td><td>Open color / highlight picker</td></tr>
      </tbody>
    </table>
    <p class="muted small">Use Generate text, Paste text, or Load sample from the top bar to load a passage. Your work autosaves in this browser.</p>
    <div class="row"><button type="button" class="btn primary" id="helpModalClose">Close</button></div>
  </div>
</div>
"""

PHASE_A_JS = """
/* Phase A UX: click menus, help modal, empty state actions */
(function(){
  let openCard=null;
  const backdrop=document.getElementById('topMenuBackdrop');

  function closeTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card.menu-open').forEach(function(card){
      card.classList.remove('menu-open');
      var t=card.querySelector('.menu-trigger');
      if(t)t.setAttribute('aria-expanded','false');
    });
    if(backdrop){backdrop.classList.remove('show');backdrop.setAttribute('aria-hidden','true');}
    openCard=null;
  }

  window.openTopMenu=function(name){
    closeTopMenus();
    var card=document.querySelector('.top-stack .card.compact-card[data-menu="'+name+'"]');
    if(!card)return;
    card.classList.add('menu-open');
    var t=card.querySelector('.menu-trigger');
    if(t)t.setAttribute('aria-expanded','true');
    if(backdrop){backdrop.classList.add('show');backdrop.setAttribute('aria-hidden','false');}
    openCard=card;
  };
  window.closeTopMenus=closeTopMenus;

  function initTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card .menu-trigger').forEach(function(trigger){
      trigger.setAttribute('role','button');
      trigger.setAttribute('tabindex','0');
      trigger.setAttribute('aria-haspopup','true');
      trigger.setAttribute('aria-expanded','false');
      trigger.addEventListener('click',function(e){
        e.stopPropagation();
        var card=trigger.closest('.card.compact-card');
        if(!card)return;
        if(card.classList.contains('menu-open'))closeTopMenus();
        else openTopMenu(card.dataset.menu||'');
      });
      trigger.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();trigger.click();}
      });
    });
    if(backdrop)backdrop.addEventListener('click',closeTopMenus);
    document.addEventListener('click',function(e){
      if(!openCard)return;
      if(openCard.contains(e.target))return;
      closeTopMenus();
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape')closeTopMenus();
    });
  }

  function initHelpModal(){
    var modal=document.getElementById('helpModal');
    var btn=document.getElementById('helpBtn');
    var close=document.getElementById('helpModalClose');
    if(!modal||!btn)return;
    function open(){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
    function shut(){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
    btn.onclick=open;
    if(close)close.onclick=shut;
    modal.addEventListener('click',function(e){if(e.target===modal)shut();});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&modal.classList.contains('show'))shut();
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){initTopMenus();initHelpModal();});
  }else{initTopMenus();initHelpModal();}
})();
"""

EMPTY_STATE_HTML = (
    '<div class="editor-empty-state" dir="ltr">'
    '<p class="editor-empty-title">No text loaded yet</p>'
    '<p class="muted">Generate a passage from WLC, paste Hebrew/Greek text, or load the Ruth sample.</p>'
    '<div class="editor-empty-actions">'
    '<button type="button" class="btn primary" id="emptyGenerateBtn">Generate Ruth 3:4</button>'
    '<button type="button" class="btn" id="emptyPasteBtn">Paste text</button>'
    '<button type="button" class="btn good" id="emptySampleBtn">Load sample</button>'
    '</div></div>'
)

LOAD_SAMPLE_FN = """
function loadSampleText(){
  document.getElementById('textSource').value='hebrew';
  setupBooks();
  state.language='hebrew';
  document.getElementById('refBox').value='Ruth 3:4';
  document.getElementById('pasteBox').value='וִיהִי בְשָׁכְבוֹ וְיָדַעַתְּ אֶת־הַמָּקוֹם אֲשֶׁר יִשְׁכַּב־שָׁם וּבָאת וְגִלִּית מַרְגְּלֹתָיו וְשָׁכָבְתְּי';
  parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value);
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
  closeTopMenus();
}
function bindEmptyStateActions(){
  var g=document.getElementById('emptyGenerateBtn');
  var p=document.getElementById('emptyPasteBtn');
  var s=document.getElementById('emptySampleBtn');
  if(g)g.onclick=function(){closeTopMenus();loadSampleWlcPassage();};
  if(p)p.onclick=function(){openTopMenu('paste');setTimeout(function(){var b=document.getElementById('pasteBox');if(b)b.focus();},120);};
  if(s)s.onclick=function(){loadSampleText();};
}
"""

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    original_len = len(text)

    if "Phase A — click-to-open top menus" not in text:
        text = replace_once(
            text,
            "#appRoot.hidden{display:none!important;}\n\n</style>",
            "#appRoot.hidden{display:none!important;}\n" + PHASE_A_CSS + "\n</style>",
            "CSS",
        )
    elif "pointer-events:none" not in text:
        text = replace_once(
            text,
            "z-index:2500;display:none;\n}\n#topMenuBackdrop.show",
            "z-index:2500;display:none;pointer-events:none;\n}\n#topMenuBackdrop.show",
            "backdrop pointer-events",
        )

    if 'data-menu="generate"' not in text:
        text = replace_once(
            text,
            '<div class="wrap">\n  <div class="top-stack">\n  <div class="card compact-card">\n    <strong>Generate text</strong>',
            '<div class="wrap">\n  <div id="topMenuBackdrop" aria-hidden="true"></div>\n  <div class="top-stack">\n  <div class="card compact-card" data-menu="generate">\n    <strong class="menu-trigger">Generate text</strong>',
            "generate menu",
        )
        text = replace_once(
            text,
            '  <div class="card compact-card">\n    <strong>Paste text</strong>',
            '  <div class="card compact-card" data-menu="paste">\n    <strong class="menu-trigger">Paste text</strong>',
            "paste menu",
        )
        text = replace_once(
            text,
            '  <div class="card compact-card">\n    <strong class="save-tools-title">Project save / restore</strong>',
            '  <div class="card compact-card" data-menu="project">\n    <strong class="save-tools-title menu-trigger">Project save / restore</strong>',
            "project menu",
        )

    old_help = (
        '    <p class="muted">Click a word, then use <span class="kbd">Enter</span> break clause, '
        '<span class="kbd">Tab</span> indent, <span class="kbd">Backspace</span> unindent/remove break, '
        '<span class="kbd">n</span> note, <span class="kbd">t</span> gloss, <span class="kbd">p</span> predicate, '
        '<span class="kbd">s</span> subject, <span class="kbd">Delete</span> or <span class="kbd">Shift+Backspace</span> '
        'hide/restore word, arrow keys navigate words/clauses.</p>'
    )
    new_help = (
        '    <div class="workspace-help-row">\n'
        '      <button type="button" class="btn" id="helpBtn" aria-haspopup="dialog" aria-controls="helpModal">? Help</button>\n'
        '    </div>'
    )
    if old_help in text:
        text = replace_once(text, old_help, new_help, "help row")

    anchor = '<div id="commentPopover" class="comment-popover">'
    if 'id="helpModal"' not in text:
        text = replace_once(text, anchor, HELP_MODAL + "\n\n" + anchor, "help modal")

    if "let commentsPanelCollapsed=false;" in text:
        text = replace_once(text, "let commentsPanelCollapsed=false;", "let commentsPanelCollapsed=true;", "comments default")

    if "editor-empty-state" not in text:
        text = replace_once(
            text,
            "ed.innerHTML='<span class=\"muted\" dir=\"ltr\">Paste text above to begin.</span>';hideCommentPopover();return;",
            "ed.innerHTML=" + repr(EMPTY_STATE_HTML) + ";bindEmptyStateActions();hideCommentPopover();return;",
            "empty state",
        )

    make_text_old = "document.getElementById('makeText').onclick=()=>{generatedRefs=[];const box=document.getElementById('pasteBox');const cleaned=cleanLogosPaste(box.value);box.value=cleaned;parseText(cleaned,document.getElementById('refBox').value);};"
    make_text_new = "document.getElementById('makeText').onclick=()=>{generatedRefs=[];const box=document.getElementById('pasteBox');const cleaned=cleanLogosPaste(box.value);box.value=cleaned;parseText(cleaned,document.getElementById('refBox').value);closeTopMenus();};"
    sample_old = "document.getElementById('sampleText').onclick=()=>{document.getElementById('textSource').value='hebrew';setupBooks();state.language='hebrew';document.getElementById('refBox').value='Ruth 3:4';document.getElementById('pasteBox').value='וִיהִי בְשָׁכְבוֹ וְיָדַעַתְּ אֶת־הַמָּקוֹם אֲשֶׁר יִשְׁכַּב־שָׁם וּבָאת וְגִלִּית מַרְגְּלֹתָיו וְשָׁכָבְתְּי';parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value);};"

    if "function loadSampleText()" not in text:
        text = replace_once(
            text,
            make_text_old + "\n" + sample_old,
            LOAD_SAMPLE_FN.strip() + "\n" + make_text_new + "\ndocument.getElementById('sampleText').onclick=loadSampleText;",
            "load sample fn",
        )
    elif make_text_new not in text and make_text_old in text:
        text = replace_once(text, make_text_old, make_text_new, "makeText close menu")

    if "Phase A UX: click menus" not in text:
        text = replace_once(text, "\n</script>\n</body>", PHASE_A_JS + "\n</script>\n</body>", "phase a js")
    elif "document.addEventListener('click',function(e){" not in text:
        text = replace_once(
            text,
            "    if(backdrop)backdrop.addEventListener('click',closeTopMenus);\n    document.addEventListener('keydown',function(e){",
            "    if(backdrop)backdrop.addEventListener('click',closeTopMenus);\n    document.addEventListener('click',function(e){\n      if(!openCard)return;\n      if(openCard.contains(e.target))return;\n      closeTopMenus();\n    });\n    document.addEventListener('keydown',function(e){",
            "outside click close",
        )

    if "1.3.8a</title>" in text:
        text = replace_once(
            text,
            "<title>Hebrew/Greek Contour Table App 1.3.8a</title>",
            "<title>Hebrew/Greek Contour Table App 1.3.9a</title>",
            "title",
        )

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({original_len} -> {len(text)} chars, {text.count(chr(10))+1} lines)")


if __name__ == "__main__":
    main()
