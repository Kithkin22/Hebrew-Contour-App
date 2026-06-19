#!/usr/bin/env python3
"""Restore inspector JS if needed; improve parsing merge + BDB link clicks."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 match, found {n}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    if "function showInspector(el)" not in text:
        text = subprocess.check_output(
            ["git", "-C", str(ROOT), "show", "HEAD:index.html"],
            text=True,
        )
        print("Restored index.html from HEAD (inspector JS was missing)")

    link_css = "#wordInspector a{\n  pointer-events:auto;\n  cursor:pointer;\n}\n"
    if link_css not in text:
        if "  pointer-events:none;\n}\n#wordInspector .wi-title{" in text:
            text = replace_once(
                text,
                "  pointer-events:none;\n}\n#wordInspector .wi-title{",
                "  pointer-events:none;\n}\n" + link_css + "#wordInspector .wi-title{",
                "inspector link pointer-events",
            )
        elif "  pointer-events:auto;\n}\n#wordInspector .wi-title{" in text:
            text = replace_once(
                text,
                "  pointer-events:auto;\n}\n#wordInspector .wi-title{",
                "  pointer-events:auto;\n}\n" + link_css + "#wordInspector .wi-title{",
                "inspector link css (auto parent)",
            )

    show_old = """    document.getElementById('wiWord').textContent = word || '—';
    document.getElementById('wiRoot').textContent = data.root || '—';
    document.getElementById('wiParsing').textContent = data.parsing || data.morph || '—';
    const wiBdbGloss=document.getElementById('wiBdbGloss');
    const wiBdbLink=document.getElementById('wiBdbLink');
    if(wiBdbGloss) wiBdbGloss.textContent='Loading…';
    if(wiBdbLink) wiBdbLink.style.display='none';
    if(typeof applyLanguageLayout==='function') applyLanguageLayout();

    positionInspector(el);
    box.setAttribute('aria-hidden','false');

    if((!window.state||state.language!=='greek')&&typeof window.applyBdbToInspector==='function'){
      window.applyBdbToInspector(word, document.getElementById('wiRoot'), document.getElementById('wiParsing'), el);
    }else if(wiBdbGloss && window.state&&state.language==='greek'){
      wiBdbGloss.textContent='—';
    }"""

    show_new = """    let morphEntry=null;
    try{
      if(typeof window.CONTOUR_LOOKUP_MORPH==='function') morphEntry=window.CONTOUR_LOOKUP_MORPH(word, el);
    }catch(e){}
    const morphParsing=(morphEntry&&(morphEntry.parsing||morphEntry.morph||morphEntry.morphology))||'';
    const localParsing=typeof window.mergeInspectorParsing==='function'
      ? window.mergeInspectorParsing(morphEntry, morphParsing||data.parsing||data.morph)
      : (morphParsing||data.parsing||data.morph||'—');

    document.getElementById('wiWord').textContent = word || '—';
    document.getElementById('wiRoot').textContent = (morphEntry&&(morphEntry.root||morphEntry.lemma)) || data.root || '—';
    document.getElementById('wiParsing').textContent = localParsing || '—';
    const wiBdbGloss=document.getElementById('wiBdbGloss');
    const wiBdbLink=document.getElementById('wiBdbLink');
    if(wiBdbGloss) wiBdbGloss.textContent='Loading…';
    if(wiBdbLink) wiBdbLink.style.display='none';
    if(typeof applyLanguageLayout==='function') applyLanguageLayout();

    positionInspector(el);
    box.setAttribute('aria-hidden','false');

    if(window.state&&state.language==='greek'&&typeof window.applyGreekLexiconToInspector==='function'){
      window.applyGreekLexiconToInspector(el, document.getElementById('wiWord'), document.getElementById('wiRoot'), document.getElementById('wiParsing'));
    }else if((!window.state||state.language!=='greek')&&typeof window.applyBdbToInspector==='function'){
      window.applyBdbToInspector(word, document.getElementById('wiRoot'), document.getElementById('wiParsing'), el);
    }else if(wiBdbGloss && window.state&&state.language==='greek'){
      wiBdbGloss.textContent='—';
    }"""

    if show_old in text:
        text = replace_once(text, show_old, show_new, "showInspector parsing merge")

    apply_old = """    if(wiParsing && bdb.parsing && bdb.parsing!=='—'){
      if(wiParsing.textContent==='—' || !wiParsing.textContent.trim()) wiParsing.textContent=bdb.parsing;
    }
    fillBdbFields(bdb);
  }
  window.applyBdbToInspector=applyBdbToInspector;"""

    apply_new = """    let morphEntry=null;
    try{
      if(typeof window.CONTOUR_LOOKUP_MORPH==='function') morphEntry=window.CONTOUR_LOOKUP_MORPH(word, wordEl);
    }catch(e){}
    const mergedParsing=typeof window.mergeInspectorParsing==='function'
      ? window.mergeInspectorParsing(morphEntry, bdb.parsing)
      : (bdb.parsing||'—');
    if(wiParsing && mergedParsing && mergedParsing!=='—') wiParsing.textContent=mergedParsing;
    fillBdbFields(bdb);
  }
  window.applyBdbToInspector=applyBdbToInspector;"""

    if apply_old in text:
        text = replace_once(text, apply_old, apply_new, "applyBdbToInspector parsing merge")

    morph_patch_old = """        if(m){
          wiRoot.textContent = m.root || m.lemma || '—';
          wiParsing.textContent = m.parsing || m.morph || '—';
        }"""

    morph_patch_new = """        if(m){
          wiRoot.textContent = m.root || m.lemma || '—';
          wiParsing.textContent = typeof window.compactMorphHBParsing==='function'
            ? (window.compactMorphHBParsing(m) || m.parsing || m.morph || '—')
            : (m.parsing || m.morph || '—');
        }"""

    if morph_patch_old in text:
        text = replace_once(text, morph_patch_old, morph_patch_new, "morphHB hover patch")

    enhance_old = """    if(m){
      wiRoot.textContent=chooseLemmaRoot(m);
      wiParsing.textContent=m.parsing || m.morph || m.morphology || '—';
    }else{
      if(looksLikeStrong(wiRoot.textContent)) wiRoot.textContent='—';
    }"""

    enhance_new = """    if(m){
      wiRoot.textContent=chooseLemmaRoot(m);
      wiParsing.textContent=typeof window.compactMorphHBParsing==='function'
        ? (window.compactMorphHBParsing(m) || m.parsing || m.morph || m.morphology || '—')
        : (m.parsing || m.morph || m.morphology || '—');
    }else{
      if(looksLikeStrong(wiRoot.textContent)) wiRoot.textContent='—';
    }"""

    if enhance_old in text:
        text = replace_once(text, enhance_old, enhance_new, "enhance morph compact")

    manual_old = """      wiParsing.textContent=(manual&&manual.parsing) || (morph&&(morph.parsing||morph.morph||morph.morphology)) || '—';"""

    manual_new = """      wiParsing.textContent=(manual&&manual.parsing) || (typeof window.mergeInspectorParsing==='function'
        ? window.mergeInspectorParsing(morph, morph&&(morph.parsing||morph.morph||morph.morphology))
        : (morph&&(morph.parsing||morph.morph||morph.morphology))) || '—';"""

    if manual_old in text:
        text = replace_once(text, manual_old, manual_new, "manual inspector parsing")

    if 'src="greek-lexicon.js"' not in text:
        needle = '<script src="sefaria-bdb.js"></script>'
        if needle in text:
            text = text.replace(
                needle,
                needle + '\n<script src="greek-lexicon.js"></script>',
                1,
            )
        else:
            text = replace_once(
                text,
                "\n</body>\n</html>",
                '\n<script src="sefaria-bdb.js"></script>\n<script src="greek-lexicon.js"></script>\n</body>\n</html>',
                "script tags",
            )

    if "function startApp" not in text or not text.rstrip().endswith("</html>"):
        raise SystemExit("integrity check failed")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
