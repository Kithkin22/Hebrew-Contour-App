#!/usr/bin/env python3
"""Add BHSA (SHEBANQ) Hebrew text generation, aligned with Aleph bhsa-text.ts."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

HTML_OLD = """    <p class="muted">Choose Hebrew/WLC or Greek/SBLGNT, then generate into the editor.</p>

    <div class="generator-source-row">
      <label class="muted" for="textSource">Source:</label>
      <select id="textSource">
        <option value="hebrew">Hebrew — WLC</option>
        <option value="greek">Greek — SBLGNT</option>
      </select>
    </div>"""

HTML_NEW = """    <p class="muted">Choose Hebrew (WLC or BHSA) or Greek/SBLGNT, then generate into the editor.</p>

    <div class="generator-source-row">
      <label class="muted" for="textSource">Source:</label>
      <select id="textSource">
        <option value="hebrew">Hebrew — WLC (offline)</option>
        <option value="hebrew-bhsa">Hebrew — BHSA (online)</option>
        <option value="greek">Greek — SBLGNT</option>
      </select>
    </div>"""

ATTR_OLD = """    <p class="muted small">SBLGNT source files are provided by Faithlife/SBLGNT under CC BY 4.0; Hebrew source remains the bundled WLC.</p>"""

ATTR_NEW = """    <p class="muted small">SBLGNT: Faithlife/SBLGNT (CC BY 4.0). Hebrew WLC: bundled Westminster Leningrad Codex. Hebrew BHSA: ETCBC / BHS via SHEBANQ (requires internet).</p>"""

SETUP_BOOKS_OLD = """  if(status)status.textContent=source==='greek'?'Greek source: SBLGNT (fetched online from Faithlife/SBLGNT).':'Hebrew source: bundled WLC.';"""

SETUP_BOOKS_NEW = """  if(status)status.textContent=source==='greek'?'Greek source: SBLGNT (fetched online from Faithlife/SBLGNT).':source==='hebrew-bhsa'?'Hebrew source: BHSA / ETCBC via SHEBANQ (requires internet).':'Hebrew source: bundled WLC (offline).';"""

SETUP_RUTH_OLD = """if((source==='hebrew'&&b.name==='Ruth')||(source==='greek'&&b.id==='Matt'))o.selected=true;"""
SETUP_RUTH_NEW = """if(((source==='hebrew'||source==='hebrew-bhsa')&&b.name==='Ruth')||(source==='greek'&&b.id==='Matt'))o.selected=true;"""

GENERATE_WLC_OLD = """async function generateWlc(){
  const source=(document.getElementById('textSource')&&document.getElementById('textSource').value)||'hebrew';
  const sel=document.getElementById('bookSelect');
  const book=sel.value,bname=sel.options[sel.selectedIndex].textContent;
  const sc=document.getElementById('startChapter').value,sv=document.getElementById('startVerse').value,ec=document.getElementById('endChapter').value,ev=document.getElementById('endVerse').value;
  const status=document.getElementById('wlcStatus');
  let verses=[];
  try{
    if(source==='greek'){
      status.textContent='Loading Greek text from SBLGNT...';
      verses=await getSblgntText(book,sc,sv,ec,ev);
      state.language='greek';
    }else{
      verses=getWlcText(book,sc,sv,ec,ev);
      state.language='hebrew';
    }
  }catch(e){status.textContent='Could not load Greek text. Check your internet connection or use paste mode.';return;}
  if(!verses.length){status.textContent='No text found for that range.';return;}
  generatedRefs=verses.map(v=>`${bname} ${v.chapter}:${v.verse}`);
  document.getElementById('pasteBox').value=verses.map(v=>v.text).join('\\n');
  document.getElementById('pasteBox').dir=source==='greek'?'ltr':'rtl';
  document.getElementById('refBox').value=`${bname} ${sc}:${sv}${(sc!==ec||sv!==ev)?'-'+ec+':'+ev:''}`;
  status.textContent=`Loaded ${verses.length} verse(s) from ${document.getElementById('refBox').value} (${source==='greek'?'SBLGNT':'WLC'}).`;
  parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value);
}"""

GENERATE_WLC_NEW = """async function generateWlc(){
  const source=(document.getElementById('textSource')&&document.getElementById('textSource').value)||'hebrew';
  const sel=document.getElementById('bookSelect');
  const book=sel.value,bname=sel.options[sel.selectedIndex].textContent;
  const sc=document.getElementById('startChapter').value,sv=document.getElementById('startVerse').value,ec=document.getElementById('endChapter').value,ev=document.getElementById('endVerse').value;
  const status=document.getElementById('wlcStatus');
  let verses=[];
  try{
    if(source==='greek'){
      status.textContent='Loading Greek text from SBLGNT...';
      verses=await getSblgntText(book,sc,sv,ec,ev);
      state.language='greek';
    }else if(source==='hebrew-bhsa'){
      status.textContent='Loading Hebrew text from BHSA (SHEBANQ)...';
      verses=await getBhsaText(book,sc,sv,ec,ev);
      state.language='hebrew';
    }else{
      verses=getWlcText(book,sc,sv,ec,ev);
      state.language='hebrew';
    }
  }catch(e){
    status.textContent=source==='greek'?'Could not load Greek text. Check your internet connection or use paste mode.':source==='hebrew-bhsa'?'Could not load BHSA text. Check your internet connection or use WLC/paste mode.':'Could not load Hebrew text.';
    return;
  }
  if(!verses.length){status.textContent='No text found for that range.';return;}
  generatedRefs=verses.map(v=>`${bname} ${v.chapter}:${v.verse}`);
  document.getElementById('pasteBox').value=verses.map(v=>v.text).join('\\n');
  document.getElementById('pasteBox').dir=source==='greek'?'ltr':'rtl';
  document.getElementById('refBox').value=`${bname} ${sc}:${sv}${(sc!==ec||sv!==ev)?'-'+ec+':'+ev:''}`;
  const sourceLabel=source==='greek'?'SBLGNT':source==='hebrew-bhsa'?'BHSA':'WLC';
  status.textContent=`Loaded ${verses.length} verse(s) from ${document.getElementById('refBox').value} (${sourceLabel}).`;
  parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value);
}"""

BHSA_INSERT_AFTER = """function getWlcText(book,sc,sv,ec,ev){const out=[];let started=false;for(const line of WLC_TEXT.split(/\\r?\\n/)){if(!line.trim())continue;const parts=line.split('\\t');if(parts.length<6)continue;const [b,c,v,_blank,_seq,txt]=parts;const cn=+c,vn=+v;if(b===book&&cn===+sc&&vn===+sv)started=true;if(started){if(b!==book)break;if(cn>+ec||(cn===+ec&&vn>+ev))break;out.push({chapter:cn,verse:vn,text:(txt||'').trim()});if(cn===+ec&&vn===+ev)break;}}return out;}"""

BHSA_BLOCK = r"""function getWlcText(book,sc,sv,ec,ev){const out=[];let started=false;for(const line of WLC_TEXT.split(/\r?\n/)){if(!line.trim())continue;const parts=line.split('\t');if(parts.length<6)continue;const [b,c,v,_blank,_seq,txt]=parts;const cn=+c,vn=+v;if(b===book&&cn===+sc&&vn===+sv)started=true;if(started){if(b!==book)break;if(cn>+ec||(cn===+ec&&vn>+ev))break;out.push({chapter:cn,verse:vn,text:(txt||'').trim()});if(cn===+ec&&vn===+ev)break;}}return out;}
const SHEBANQ_VERSE_API='https://shebanq.ancient-data.org/hebrew/verse.json';
const BHSA_VERSION='4b';
const BHSA_LATIN_BY_WLC={
  '01O':'Genesis','02O':'Exodus','03O':'Leviticus','04O':'Numeri','05O':'Deuteronomium',
  '06O':'Josua','07O':'Judices','08O':'Ruth','09O':'Samuel_I','10O':'Samuel_II',
  '11O':'Reges_I','12O':'Reges_II','13O':'Chronica_I','14O':'Chronica_II','15O':'Esra',
  '16O':'Nehemia','17O':'Esther','18O':'Iob','19O':'Psalmi','20O':'Proverbia',
  '21O':'Ecclesiastes','22O':'Canticum','23O':'Jesaia','24O':'Jeremia','25O':'Threni',
  '26O':'Ezechiel','27O':'Daniel','28O':'Hosea','29O':'Joel','30O':'Amos','31O':'Obadia',
  '32O':'Jona','33O':'Micha','34O':'Nahum','35O':'Habakuk','36O':'Zephania','37O':'Haggai',
  '38O':'Sacharia','39O':'Maleachi'
};
function cleanBhsaVerse(raw){
  return String(raw||'')
    .replace(/<[^>]*>/g,'')
    .replace(/&nbsp;/gi,' ')
    .replace(/\{[פסמת]\}/g,'')
    .replace(/\u05C3+/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
async function fetchShebanqVerse(bhsaLatin,chapter,verse){
  const url=new URL(SHEBANQ_VERSE_API);
  url.searchParams.set('version',BHSA_VERSION);
  url.searchParams.set('book',bhsaLatin);
  url.searchParams.set('chapter',String(chapter));
  url.searchParams.set('verse',String(verse));
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data.good||!data.data||!data.data.text)return null;
  return cleanBhsaVerse(data.data.text);
}
async function getBhsaText(wlcBookId,sc,sv,ec,ev){
  const bhsaLatin=BHSA_LATIN_BY_WLC[wlcBookId];
  if(!bhsaLatin)throw new Error('No BHSA book mapping for '+wlcBookId);
  const refs=getWlcText(wlcBookId,sc,sv,ec,ev);
  if(!refs.length)return [];
  const out=[];
  for(const ref of refs){
    const text=await fetchShebanqVerse(bhsaLatin,ref.chapter,ref.verse);
    if(!text){
      if(!out.length)throw new Error(`BHSA lookup failed for ${bhsaLatin} ${ref.chapter}:${ref.verse}.`);
      break;
    }
    out.push({chapter:ref.chapter,verse:ref.verse,text});
    if(ref.chapter===+ec&&ref.verse===+ev)break;
  }
  if(!out.length)throw new Error('No Hebrew text returned from BHSA for that reference.');
  return out;
}"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if "getBhsaText" in text and 'value="hebrew-bhsa"' in text:
        print("BHSA generate already applied.")
        return

    text = replace_once(text, HTML_OLD, HTML_NEW, "generate HTML")
    text = replace_once(text, ATTR_OLD, ATTR_NEW, "attribution")
    text = replace_once(text, SETUP_BOOKS_OLD, SETUP_BOOKS_NEW, "setupBooks")
    if SETUP_RUTH_OLD in text:
        text = replace_once(text, SETUP_RUTH_OLD, SETUP_RUTH_NEW, "setupBooks Ruth default")
    text = replace_once(text, GENERATE_WLC_OLD, GENERATE_WLC_NEW, "generateWlc")
    text = replace_once(text, BHSA_INSERT_AFTER, BHSA_BLOCK, "BHSA helpers")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: {orig_len} -> {len(text)} bytes")


if __name__ == "__main__":
    main()
