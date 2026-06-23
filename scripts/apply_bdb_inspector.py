#!/usr/bin/env python3
"""Wire sefaria-bdb.js and fix inspector BDB autofill (Aleph-aligned)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

INLINE_BDB_START = "/* Sefaria BDB lookup for hover inspector */\n(function(){\n  const CACHE={};"
INLINE_BDB_END = "})();\n\n\n/* 4.0 Hover Inspector Shell */"

SHOW_PATCH_OLD = """    document.getElementById('wiWord').textContent = word || '—';
    document.getElementById('wiRoot').textContent = data.root || '—';
    document.getElementById('wiParsing').textContent = data.parsing || data.morph || '—';
    if(typeof applyLanguageLayout==='function') applyLanguageLayout();

    positionInspector(el);
    box.setAttribute('aria-hidden','false');
  }"""

SHOW_PATCH_NEW = """    document.getElementById('wiWord').textContent = word || '—';
    document.getElementById('wiRoot').textContent = data.root || '—';
    document.getElementById('wiParsing').textContent = data.parsing || data.morph || '—';
    if(typeof applyLanguageLayout==='function') applyLanguageLayout();

    positionInspector(el);
    box.setAttribute('aria-hidden','false');

    if((!window.state||state.language!=='greek')&&typeof window.applyBdbToInspector==='function'){
      applyBdbToInspector(word, document.getElementById('wiRoot'), document.getElementById('wiParsing'), el);
    }
  }"""

APPLY_BDB_OLD = """  async function applyBdbToInspector(word, wiRoot, wiParsing){
    if(typeof window.lookupSefariaBDB!=='function') return;
    if(window.state&&state.language==='greek'){fillBdbFields(null);return;}
    const bdb=await window.lookupSefariaBDB(word);
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(!bdb) return;
    if(wiRoot && (!wiRoot.textContent || wiRoot.textContent==='—') && bdb.lemma) wiRoot.textContent=bdb.lemma;
    if(wiParsing && (!wiParsing.textContent || wiParsing.textContent==='—') && bdb.parsing) wiParsing.textContent=bdb.parsing;
    fillBdbFields(bdb);
  }"""

APPLY_BDB_NEW = """  async function applyBdbToInspector(word, wiRoot, wiParsing, wordEl){
    if(typeof window.lookupSefariaBDB!=='function') return;
    if(window.state&&state.language==='greek'){fillBdbFields(null);return;}
    const passageRef=typeof window.passageRefForWordEl==='function'?passageRefForWordEl(wordEl):((window.state&&state.ref)||'');
    const bdb=await window.lookupSefariaBDB(word,{passageRef});
    if(window.CONTOUR_INSPECTOR_ENABLED===false) return;
    if(!bdb) return;
    if(wiRoot){
      const rootText=bdb.root||bdb.lemma||'—';
      if(rootText!=='—') wiRoot.textContent=rootText;
    }
    if(wiParsing && bdb.parsing && bdb.parsing!=='—') wiParsing.textContent=bdb.parsing;
    fillBdbFields(bdb);
  }"""

ENHANCE_BDB_CALL_OLD = "      applyBdbToInspector(word, wiRoot, wiParsing);"
ENHANCE_BDB_CALL_NEW = "      applyBdbToInspector(word, wiRoot, wiParsing, wordEl);"


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1, found {n}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if INLINE_BDB_START in text and INLINE_BDB_END in text:
        start = text.index(INLINE_BDB_START)
        end = text.index(INLINE_BDB_END)
        text = text[:start] + text[end:]

    if 'src="sefaria-bdb.js"' not in text:
        needle = '<script src="greek-lexicon.js"></script>'
        if needle in text:
            text = text.replace(
                needle,
                '<script src="sefaria-bdb.js"></script>\n' + needle,
                1,
            )
        else:
            text = replace_once(
                text,
                "\n</body>\n</html>",
                '\n<script src="sefaria-bdb.js"></script>\n</body>\n</html>',
                "sefaria script tag",
            )

    if "applyBdbToInspector(word, wiRoot, wiParsing, wordEl)" not in text:
        text = replace_once(text, APPLY_BDB_OLD, APPLY_BDB_NEW, "apply bdb fn")
        text = replace_once(text, ENHANCE_BDB_CALL_OLD, ENHANCE_BDB_CALL_NEW, "enhance bdb call")

    if "applyBdbToInspector(word, document.getElementById('wiRoot')" not in text:
        text = replace_once(text, SHOW_PATCH_OLD, SHOW_PATCH_NEW, "showInspector bdb")

    if len(text) < orig_len * 0.9 or "function startApp" not in text or not text.rstrip().endswith("</html>"):
        raise SystemExit("integrity check failed")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({orig_len} -> {len(text)} bytes)")


if __name__ == "__main__":
    main()
