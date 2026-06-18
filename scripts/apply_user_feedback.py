#!/usr/bin/env python3
"""User feedback fixes: menus, shortcuts, comments, inspector, BDB."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

FEEDBACK_CSS = """
/* User feedback: click-menu panels, keycap shortcuts */
.top-stack .card.compact-card.menu-open{
  position:relative;
  z-index:3001;
  align-self:flex-start;
  background:var(--ui-surface,#fff)!important;
  border:1px solid var(--ui-line,#d8e1ea)!important;
  border-radius:14px!important;
  box-shadow:0 18px 42px rgba(20,37,56,.18)!important;
  padding:12px 16px 16px!important;
  min-width:min(720px, calc(100vw - 40px));
}
.top-stack .card.compact-card.menu-open::before,
.top-stack .card.compact-card.menu-open::after,
.top-stack .card.compact-card.menu-open:hover::before,
.top-stack .card.compact-card.menu-open:hover::after,
.top-stack .card.compact-card.menu-open:focus-within::before,
.top-stack .card.compact-card.menu-open:focus-within::after{
  display:none!important;
  content:none!important;
}
.top-stack .card.compact-card.menu-open > p,
.top-stack .card.compact-card.menu-open > p.muted,
.top-stack .card.compact-card.menu-open > p.muted.small,
.top-stack .card.compact-card.menu-open > div,
.top-stack .card.compact-card.menu-open > .generator-source-row,
.top-stack .card.compact-card.menu-open > .generator-passage-row,
.top-stack .card.compact-card.menu-open > .generator-reference-row,
.top-stack .card.compact-card.menu-open > #wlcStatus,
.top-stack .card.compact-card.menu-open > #pasteBox,
.top-stack .card.compact-card.menu-open > .row,
.top-stack .card.compact-card.menu-open > .save-tools{
  position:static!important;
  left:auto!important;
  top:auto!important;
  width:100%!important;
  max-width:100%!important;
  display:block!important;
  margin:8px 0 0!important;
  z-index:auto!important;
  color:var(--ui-muted,#64748b)!important;
  line-height:1.45!important;
}
.top-stack .card.compact-card.menu-open > .generator-source-row,
.top-stack .card.compact-card.menu-open > .generator-passage-row,
.top-stack .card.compact-card.menu-open > .generator-reference-row,
.top-stack .card.compact-card.menu-open > .row,
.top-stack .card.compact-card.menu-open > .save-tools{
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  gap:8px!important;
}
.top-stack .card.compact-card.menu-open > p.muted.small{
  font-size:12px!important;
  margin-top:10px!important;
  padding-top:8px!important;
  border-top:1px solid var(--ui-line,#d8e1ea)!important;
}
#annotationShortcutHint{
  display:flex!important;
  align-items:center;
  gap:5px;
  flex-wrap:wrap;
  margin-left:auto;
}
#annotationShortcutHint .shortcut-label{
  font-weight:700;
  color:var(--ui-muted,#64748b);
  font-size:12px;
  margin-right:4px;
}
.keycap{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:26px;
  height:24px;
  padding:0 7px;
  border-radius:5px;
  background:linear-gradient(180deg,#4a5d73 0%,#2f3d4d 100%);
  color:#fff;
  font-size:11px;
  font-weight:700;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  border:1px solid #1e2833;
  box-shadow:0 1px 0 #1e2833,0 2px 4px rgba(0,0,0,.18);
  line-height:1;
}
body.dark-mode .keycap{
  background:linear-gradient(180deg,#5a6f87 0%,#3d4f63 100%);
  border-color:#2a3544;
}
#wiBdbGloss{font-size:13px;line-height:1.35;}
#wiBdbLink{
  display:inline-block;
  margin-top:4px;
  font-size:12px;
  font-weight:800;
  color:var(--ui-blue,#1f5f99);
  text-decoration:none;
}
#wiBdbLink:hover{text-decoration:underline;}
body.dark-mode #wiBdbLink{color:#6db5ff;}
@media(min-width:901px){
  .contour-with-comments{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) 340px!important;
  }
  .comments-panel.collapsed{display:none!important;}
}
"""

SEFARIA_BDB_JS = """
/* Sefaria BDB lookup for hover inspector */
(function(){
  const CACHE={};
  function stripHtml(html){
    const d=document.createElement('div');
    d.innerHTML=String(html||'');
    return (d.textContent||'').replace(/\\s+/g,' ').trim();
  }
  function firstDefinition(content){
    function walk(senses){
      for(const s of (senses||[])){
        if(s.definition){
          const t=stripHtml(s.definition);
          if(t) return t.length>140?t.slice(0,137)+'…':t;
        }
        const inner=walk(s.senses);
        if(inner) return inner;
      }
      return '';
    }
    return walk((content&&content.senses)||[]);
  }
  function grammarText(content){
    for(const s of ((content&&content.senses)||[])){
      const g=s.grammar;
      if(!g) continue;
      const parts=[g.verbal_stem,g.morphology].concat(g.binyan_form||[]).filter(Boolean);
      if(parts.length) return parts.map(stripHtml).join(' · ');
    }
    return '';
  }
  function normKey(word){
    return String(word||'').normalize('NFD').replace(/[\\u0300-\\u036f\\u0591-\\u05C7]/g,'').replace(/[־־]/g,'').trim().toLowerCase();
  }
  function bdbUrl(headword){
    return 'https://www.sefaria.org/BDB,'+encodeURIComponent(headword||'')+'?lang=bi';
  }
  window.lookupSefariaBDB=async function(word){
    const w=String(word||'').trim();
    if(!w||!/[\u0590-\u05FF]/.test(w)) return null;
    const key=normKey(w);
    if(CACHE[key]) return CACHE[key];
    try{
      const resp=await fetch('https://www.sefaria.org/api/words/'+encodeURIComponent(w)+'?never_split=1');
      if(!resp.ok) return null;
      const entries=await resp.json();
      const bdb=(entries||[]).find(e=>e.parent_lexicon==='BDB Dictionary');
      if(!bdb) return null;
      const result={
        headword:bdb.headword||w,
        lemma:bdb.headword||w,
        gloss:firstDefinition(bdb.content),
        parsing:grammarText(bdb.content),
        url:bdbUrl(bdb.headword||w)
      };
      CACHE[key]=result;
      return result;
    }catch(err){
      console.warn('Sefaria BDB lookup failed',err);
      return null;
    }
  };
})();
"""

SHORTCUT_HINT_HTML = (
    '<span id="annotationShortcutHint">'
    '<span class="shortcut-label">Shortcuts</span>'
    '<kbd class="keycap">b</kbd><kbd class="keycap">i</kbd><kbd class="keycap">u</kbd>'
    '<kbd class="keycap">Shift+U</kbd><kbd class="keycap">c</kbd><kbd class="keycap">h</kbd>'
    '</span>'
)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")

    if "/* User feedback: click-menu panels" not in text:
        text = replace_once(
            text,
            "#helpBtn[title]{cursor:help;}\n\n</style>",
            "#helpBtn[title]{cursor:help;}\n" + FEEDBACK_CSS + "\n</style>",
            "feedback CSS",
        )

    text = text.replace("let commentsPanelCollapsed=true;", "let commentsPanelCollapsed=false;", 1)

    old_empty = re.search(
        r"if\(!state\.verses\.length\)\{ed\.innerHTML='[^']+';bindEmptyStateActions\(\);hideCommentPopover\(\);return;\}",
        text,
    )
    if old_empty and "emptyGenerateBtn" in old_empty.group(0):
        text = text.replace(
            old_empty.group(0),
            "if(!state.verses.length){ed.innerHTML="
            + repr(
                '<div class="editor-empty-state" dir="ltr">'
                '<p class="editor-empty-title">No text loaded yet</p>'
                '<p class="muted">Use <strong>Generate text</strong>, <strong>Paste text</strong>, or <strong>Load Sample</strong> from the top bar.</p>'
                "</div>"
            )
            + ";hideCommentPopover();return;}",
            1,
        )

    if SHORTCUT_HINT_HTML not in text:
        text = replace_once(
            text,
            '<span id="annotationShortcutHint">Shortcuts: b, i, u, Shift+U, c, h</span>',
            SHORTCUT_HINT_HTML,
            "shortcut hint",
        )

    if "window.lookupSefariaBDB" not in text:
        text = replace_once(
            text,
            "})();\n\n\n/* 4.0 Hover Inspector Shell */\n(function(){\n  let inspectorTimer=null;",
            "})();\n\n\n" + SEFARIA_BDB_JS + "\n\n/* 4.0 Hover Inspector Shell */\n(function(){\n  let inspectorTimer=null;",
            "sefaria bdb js",
        )

    # Inspector DOM: add BDB row
    old_inspector_html = """      <div class="wi-row"><div class="wi-label">Parsing</div><div class="wi-value" id="wiParsing">—</div></div>
    `;"""
    new_inspector_html = """      <div class="wi-row"><div class="wi-label">Parsing</div><div class="wi-value" id="wiParsing">—</div></div>
      <div class="wi-row" id="wiBdbRow"><div class="wi-label">BDB</div><div class="wi-value"><div id="wiBdbGloss">—</div><a id="wiBdbLink" href="#" target="_blank" rel="noopener" style="display:none">Open in Sefaria BDB ↗</a></div></div>
    `;"""
    if 'id="wiBdbGloss"' not in text:
        text = replace_once(text, old_inspector_html, new_inspector_html, "inspector bdb row")

    # Early inspector enabled flag (after BDB block inserted)
    if "if(window.CONTOUR_INSPECTOR_ENABLED===undefined)window.CONTOUR_INSPECTOR_ENABLED=true;" not in text:
        text = replace_once(
            text,
            "/* 4.0 Hover Inspector Shell */\n(function(){\n  let inspectorTimer=null;\n  const morphLookup",
            "/* 4.0 Hover Inspector Shell */\n(function(){\n  if(window.CONTOUR_INSPECTOR_ENABLED===undefined)window.CONTOUR_INSPECTOR_ENABLED=true;\n  let inspectorTimer=null;\n  const morphLookup",
            "inspector default flag",
        )

    # Respect inspector toggle in first hover block
    text = replace_once(
        text,
        "  function showInspector(el){\n    const box=document.getElementById('wordInspector');\n    if(!box||!el) return;",
        "  function showInspector(el){\n    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;\n    const box=document.getElementById('wordInspector');\n    if(!box||!el) return;",
        "showInspector guard",
    )
    text = replace_once(
        text,
        "  document.addEventListener('mouseover', function(e){\n    const wordEl=e.target.closest && e.target.closest('.word');\n    if(!wordEl) return;\n    clearTimeout(inspectorTimer);\n    inspectorTimer=setTimeout(()=>showInspector(wordEl), 250);\n  }, true);",
        "  document.addEventListener('mouseover', function(e){\n    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;\n    const wordEl=e.target.closest && e.target.closest('.word');\n    if(!wordEl) return;\n    clearTimeout(inspectorTimer);\n    inspectorTimer=setTimeout(()=>showInspector(wordEl), 250);\n  }, true);",
        "mouseover guard shell",
    )

    # Morph patch inspector guard
    text = replace_once(
        text,
        "    document.addEventListener('mouseover', function(e){\n      const wordEl = e.target.closest && e.target.closest('.word');\n      if(!wordEl) return;\n      setTimeout(function(){\n        const wiWord = document.getElementById('wiWord');",
        "    document.addEventListener('mouseover', function(e){\n      if(window.CONTOUR_INSPECTOR_ENABLED===false) return;\n      const wordEl = e.target.closest && e.target.closest('.word');\n      if(!wordEl) return;\n      setTimeout(function(){\n        const wiWord = document.getElementById('wiWord');",
        "morph patch guard",
    )

    # BDB fill helper + enhance integration
    bdb_helper = """
  function fillBdbFields(bdb){
    const gloss=document.getElementById('wiBdbGloss');
    const link=document.getElementById('wiBdbLink');
    const row=document.getElementById('wiBdbRow');
    if(!gloss||!link) return;
    if(!bdb){
      gloss.textContent='—';
      link.style.display='none';
      if(row) row.style.display='';
      return;
    }
    gloss.textContent=bdb.gloss||'—';
    link.href=bdb.url||'#';
    link.style.display=bdb.url?'inline-block':'none';
    if(row) row.style.display='';
  }
  async function applyBdbToInspector(word, wiRoot, wiParsing){
    if(typeof window.lookupSefariaBDB!=='function') return;
    if(window.state&&state.language==='greek'){fillBdbFields(null);return;}
    const bdb=await window.lookupSefariaBDB(word);
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(!bdb) return;
    if(wiRoot && (!wiRoot.textContent || wiRoot.textContent==='—') && bdb.lemma) wiRoot.textContent=bdb.lemma;
    if(wiParsing && (!wiParsing.textContent || wiParsing.textContent==='—') && bdb.parsing) wiParsing.textContent=bdb.parsing;
    fillBdbFields(bdb);
  }
"""

    if "function fillBdbFields" not in text:
        text = replace_once(
            text,
            "  function enhance(wordEl){\n    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;",
            bdb_helper
            + "  function enhance(wordEl){\n    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;",
            "bdb helper",
        )

    old_enhance_tail = """    }else if(looksLikeStrong(wiRoot.textContent)){
      wiRoot.textContent='—';
    }
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false){"""

    new_enhance_tail = """    }else if(looksLikeStrong(wiRoot.textContent)){
      wiRoot.textContent='—';
    }
    applyBdbToInspector(word, wiRoot, wiParsing);
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false){"""

    if "applyBdbToInspector(word, wiRoot, wiParsing)" not in text:
        text = replace_once(text, old_enhance_tail, new_enhance_tail, "enhance bdb call")

    # Hide inspector + clear BDB when toggled off
    text = replace_once(
        text,
        "    if(!enabled){\n      const box=document.getElementById('wordInspector');\n      if(box){box.style.display='none';box.setAttribute('aria-hidden','true');}\n    }",
        "    if(!enabled){\n      const box=document.getElementById('wordInspector');\n      if(box){box.style.display='none';box.setAttribute('aria-hidden','true');}\n      clearTimeout(window.__inspectorHoverTimer);\n    }",
        "toggle hide",
    )

    if text.count("</script>") != 1 or "function startApp" not in text:
        raise SystemExit("integrity check failed")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({len(text)} chars)")


if __name__ == "__main__":
    main()
