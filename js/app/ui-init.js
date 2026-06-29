/* Phase A UX: click menus, help modal, empty state actions */
(function(){
  let openCard=null;
  const backdrop=document.getElementById('topMenuBackdrop');

  function closeTopMenus(){
    if(typeof closeProjectFileMenu==='function')closeProjectFileMenu();
    document.querySelectorAll('.top-stack .card.compact-card.menu-open').forEach(function(card){
      card.classList.remove('menu-open');
      var t=card.querySelector('.menu-trigger');
      if(t)t.setAttribute('aria-expanded','false');
    });
    document.body.classList.remove('top-menu-open');
    if(backdrop){backdrop.classList.remove('show');backdrop.setAttribute('aria-hidden','true');}
    openCard=null;
  }

  window.openTopMenu=function(name){
    if(typeof closeProjectFileMenu==='function')closeProjectFileMenu();
    closeTopMenus();
    var card=document.querySelector('.top-stack .card.compact-card[data-menu="'+name+'"]');
    if(!card)return;
    document.body.classList.add('top-menu-open');
    card.classList.add('menu-open');
    var t=card.querySelector('.menu-trigger');
    if(t)t.setAttribute('aria-expanded','true');
    if(backdrop){backdrop.classList.add('show');backdrop.setAttribute('aria-hidden','false');}
    openCard=card;
    requestAnimationFrame(function(){
      if(typeof positionHcMenuCard==='function')positionHcMenuCard(card);
    });
  };
  window.closeTopMenus=closeTopMenus;

  function initTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card:not(.file-menu-card) .menu-trigger').forEach(function(trigger){
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
    window.addEventListener('resize',function(){
      if(openCard&&typeof positionHcMenuCard==='function')positionHcMenuCard(openCard);
      var fileCard=document.getElementById('projectFileMenuCard');
      if(fileCard&&fileCard.classList.contains('menu-open')&&typeof positionHcMenuCard==='function')positionHcMenuCard(fileCard);
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


  function initAdminInboxBadge(){
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

  function initFeedbackModal(){
    var modal=document.getElementById('feedbackModal');
    var btn=document.getElementById('feedbackBtn');
    var close=document.getElementById('feedbackModalClose');
    var form=document.getElementById('feedbackForm');
    var statusEl=document.getElementById('feedbackStatus');
    var submitBtn=document.getElementById('feedbackSubmitBtn');
    if(!modal||!btn||!form)return;
    function setStatus(msg,kind){
      if(!statusEl)return;
      statusEl.textContent=msg||'';
      statusEl.classList.remove('hidden','ok','err');
      if(!msg){statusEl.classList.add('hidden');return;}
      statusEl.classList.add(kind==='ok'?'ok':'err');
    }
    function open(){
      setStatus('');
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
      var msg=document.getElementById('feedbackMessage');
      if(msg)msg.focus();
    }
    function shut(){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      setStatus('');
    }
    btn.onclick=open;
    if(close)close.onclick=shut;
    modal.addEventListener('click',function(e){if(e.target===modal)shut();});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&modal.classList.contains('show'))shut();
    });
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      var category=(document.getElementById('feedbackCategory')||{}).value||'general';
      var message=String((document.getElementById('feedbackMessage')||{}).value||'').trim();
      var contact=String((document.getElementById('feedbackContact')||{}).value||'').trim();
      if(message.length<5){setStatus('Please enter at least a few words.','err');return;}
      if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Sending…';}
      setStatus('');
      var payload={
        category:category,
        message:message,
        contact:contact,
        context:{
          ref:(typeof state!=='undefined'&&state.ref)||'',
          language:(typeof state!=='undefined'&&state.language)||'',
          url:location.href,
          userAgent:navigator.userAgent
        }
      };
      try{
        var res=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        var data={};
        try{data=await res.json();}catch(err){}
        if(!res.ok)throw new Error((data&&data.error)||('Request failed ('+res.status+')'));
        var okMsg='Thank you — your feedback was saved.';
        if(data&&data.id)okMsg+=' Ticket '+data.id+'.';
        if(data&&data.ticketEmail)okMsg+=' Check your email for updates.';
        setStatus(okMsg,'ok');
        form.reset();
        setTimeout(shut,1400);
      }catch(err){
        setStatus(err.message||'Could not send feedback. Try again later.','err');
      }finally{
        if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Send feedback';}
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){initTopMenus();initHelpModal();initFeedbackModal();initAdminInboxBadge();});
  }else{initTopMenus();initHelpModal();initFeedbackModal();initAdminInboxBadge();}
})();
