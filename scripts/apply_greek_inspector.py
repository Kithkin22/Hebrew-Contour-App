#!/usr/bin/env python3
"""Wire greek-lexicon.js into index.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

CSS = """
/* Greek inspector parity with Hebrew */
#wiLemmaRow,#wiGlossRow,#wiStrongsRow{display:none;}
#wiBdagRow{display:none;}
#wiStrongs a{color:var(--ui-blue,#1f5f99);font-weight:800;text-decoration:none;}
#wiStrongs a:hover{text-decoration:underline;}
body.dark-mode #wiStrongs a{color:#6db5ff;}
.wi-bdag-note{font-size:12px;line-height:1.4;}
#wiLexiconGloss,#wiBdbGloss{font-size:13px;line-height:1.35;}
"""


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1, found {n}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if "/* Greek inspector parity" in text and "applyGreekLexiconToInspector" in text:
        print("Greek inspector already applied.")
        return

    if "/* Greek inspector parity" not in text:
        css_anchor = "/* User feedback: click-menu panels, keycap shortcuts */"
        if css_anchor not in text:
            raise SystemExit("greek inspector css: anchor not found")
        text = replace_once(
            text,
            css_anchor,
            CSS.strip() + "\n" + css_anchor,
            "greek inspector css",
        )

    if 'src="greek-lexicon.js"' not in text:
        text = replace_once(
            text,
            "\n</body>\n</html>",
            '\n<script src="greek-lexicon.js"></script>\n</body>\n</html>',
            "greek lexicon script tag",
        )

    if "applyGreekLexiconToInspector" not in text:
        old_enhance_tail = """    }else if(looksLikeStrong(wiRoot.textContent)){
      wiRoot.textContent='—';
    }
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false){
      const wordEl=e.target.closest&&e.target.closest('.word');
      if(wordEl){
        const box=document.getElementById('wordInspector');
        if(box){box.style.display='none';box.setAttribute('aria-hidden','true');}
        e.stopImmediatePropagation();
      }
      return;
    }
    const wordEl=e.target.closest&&e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{installInspectorToggle();installManualModal();installManualButton();relabel();});"""

        new_enhance_tail = """    }else if(looksLikeStrong(wiRoot.textContent)){
      wiRoot.textContent='—';
    }
    if(window.state&&state.language==='greek'&&typeof window.applyGreekLexiconToInspector==='function'){
      applyGreekLexiconToInspector(wordEl, wiWord, wiRoot, wiParsing);
    }else if(typeof applyBdbToInspector==='function'){
      applyBdbToInspector(word, wiRoot, wiParsing);
    }
  }

  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false){
      const wordEl=e.target.closest&&e.target.closest('.word');
      if(wordEl){
        const box=document.getElementById('wordInspector');
        if(box){box.style.display='none';box.setAttribute('aria-hidden','true');}
        e.stopImmediatePropagation();
      }
      return;
    }
    const wordEl=e.target.closest&&e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{installInspectorToggle();installManualModal();installManualButton();relabel();});"""

        text = replace_once(text, old_enhance_tail, new_enhance_tail, "enhance greek hook")

    gen_hook = "      verses=await getSblgntText(book,sc,sv,ec,ev);\n      state.language='greek';"
    gen_new = (
        "      verses=await getSblgntText(book,sc,sv,ec,ev);\n"
        "      state.language='greek';\n"
        "      if(typeof window.loadGreekMorphgnt==='function'){try{await loadGreekMorphgnt(book);}catch(err){console.warn('MorphGNT load failed',err);}}"
    )
    if "loadGreekMorphgnt(book)" not in text:
        text = replace_once(text, gen_hook, gen_new, "morphgnt hook")

    morph_guard = """  function removeGlossRow(){
    const gloss = document.getElementById('wiGloss');
    if(gloss && gloss.closest('.wi-row')) gloss.closest('.wi-row').remove();
  }"""
    morph_guard_new = """  function removeGlossRow(){
    if(window.state&&state.language==='greek') return;
    const gloss = document.getElementById('wiGloss');
    if(gloss && gloss.closest('.wi-row')) gloss.closest('.wi-row').remove();
  }"""
    if "state.language==='greek') return;\n    const gloss = document.getElementById('wiGloss')" not in text:
        text = replace_once(text, morph_guard, morph_guard_new, "morph gloss guard")

    morph_mouse = """  document.addEventListener('mouseover', function(e){
    const wordEl=e.target.closest && e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{relabel();removeGlossRow();});
  }else{
    relabel();removeGlossRow();
  }
})();"""
    morph_mouse_new = """  document.addEventListener('mouseover', function(e){
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(window.state&&state.language==='greek') return;
    const wordEl=e.target.closest && e.target.closest('.word');
    if(!wordEl) return;
    setTimeout(()=>enhance(wordEl), 430);
  }, true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{relabel();removeGlossRow();});
  }else{
    relabel();removeGlossRow();
  }
})();"""
    if "state.language==='greek') return;\n    const wordEl=e.target.closest && e.target.closest('.word');" not in text:
        text = replace_once(text, morph_mouse, morph_mouse_new, "morph mouse guard")

    bdb_fill = """  function fillBdbFields(bdb){
    const gloss=document.getElementById('wiBdbGloss');
    const link=document.getElementById('wiBdbLink');
    const row=document.getElementById('wiBdbRow');"""
    bdb_fill_new = """  function fillBdbFields(bdb){
    const gloss=document.getElementById('wiLexiconGloss')||document.getElementById('wiBdbGloss');
    const link=document.getElementById('wiLexiconLink')||document.getElementById('wiBdbLink');
    const row=document.getElementById('wiLexiconRow')||document.getElementById('wiBdbRow');"""
    if "wiLexiconGloss')||document.getElementById('wiBdbGloss')" not in text:
        text = replace_once(text, bdb_fill, bdb_fill_new, "bdb fill ids")

    if len(text) < 10_000_000 or "function startApp" not in text or not text.rstrip().endswith("</html>"):
        raise SystemExit("integrity check failed")

    if len(text) == orig_len:
        print("Greek inspector already applied.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX}")


if __name__ == "__main__":
    main()
