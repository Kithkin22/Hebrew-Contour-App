#!/usr/bin/env python3
"""Admin link inbox badge + poll /api/feedback-summary."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "function initAdminInboxBadge"

CSS_OLD = """body.dark-mode .admin-link{color:#94a3b8;}
body.dark-mode .admin-link:hover,body.dark-mode .admin-link:focus{color:#6db5ff;}"""

CSS_NEW = """body.dark-mode .admin-link{color:#94a3b8;}
body.dark-mode .admin-link:hover,body.dark-mode .admin-link:focus{color:#6db5ff;}
.admin-link.has-unread{color:var(--ui-blue,#286090);opacity:1;font-weight:700;}
.admin-inbox-badge{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:16px;height:16px;padding:0 4px;margin-left:4px;
  font-size:10px;font-weight:800;line-height:1;border-radius:999px;
  background:#d9534f;color:#fff;vertical-align:top;
}
.admin-inbox-badge.hidden{display:none!important;}
body.dark-mode .admin-link.has-unread{color:#6db5ff;}"""

LINK_OLD = """      <a href="/admin.html" id="adminLink" class="admin-link" title="Feedback admin inbox (password required)">Admin</a>"""

LINK_NEW = """      <a href="/admin.html" id="adminLink" class="admin-link" title="Feedback admin inbox (password required)">Admin<span id="adminInboxBadge" class="admin-inbox-badge hidden" aria-hidden="true"></span></a>"""

INIT_ANCHOR = """  function initFeedbackModal(){"""

INIT_BLOCK = """  function initAdminInboxBadge(){
    var link=document.getElementById('adminLink');
    var badge=document.getElementById('adminInboxBadge');
    if(!link||!badge)return;
    var pollMs=120000;
    var storageKey='feedbackInboxLastSeenAt';
    function setBadge(count){
      if(!count){
        link.classList.remove('has-unread');
        badge.classList.add('hidden');
        badge.textContent='';
        badge.setAttribute('aria-hidden','true');
        link.removeAttribute('aria-label');
        return;
      }
      link.classList.add('has-unread');
      badge.classList.remove('hidden');
      badge.textContent=count>9?'9+':String(count);
      badge.setAttribute('aria-hidden','false');
      link.setAttribute('aria-label','Admin — '+count+' new feedback message'+(count===1?'':'s'));
    }
    async function refresh(){
      try{
        var since=localStorage.getItem(storageKey)||'';
        var url='/api/feedback-summary'+(since?('?since='+encodeURIComponent(since)):'');
        var res=await fetch(url,{cache:'no-store'});
        if(!res.ok)return;
        var data=await res.json();
        var unread=typeof data.unreadOpenCount==='number'?data.unreadOpenCount:0;
        setBadge(unread);
      }catch(e){}
    }
    refresh();
    setInterval(refresh,pollMs);
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden)refresh();
    });
  }

  function initFeedbackModal(){"""

INIT_CALL_OLD = """    document.addEventListener('DOMContentLoaded',function(){initTopMenus();initHelpModal();initFeedbackModal();});
  }else{initTopMenus();initHelpModal();initFeedbackModal();}"""

INIT_CALL_NEW = """    document.addEventListener('DOMContentLoaded',function(){initTopMenus();initHelpModal();initFeedbackModal();initAdminInboxBadge();});
  }else{initTopMenus();initHelpModal();initFeedbackModal();initAdminInboxBadge();}"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    if MARKER in text:
        print("Admin inbox badge already applied.")
        return
    text = replace_once(text, CSS_OLD, CSS_NEW, "admin badge CSS")
    text = replace_once(text, LINK_OLD, LINK_NEW, "admin link HTML")
    text = replace_once(text, INIT_ANCHOR, INIT_BLOCK, "initAdminInboxBadge")
    text = replace_once(text, INIT_CALL_OLD, INIT_CALL_NEW, "init call")
    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
