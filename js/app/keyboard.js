/* 1.3.8b keyboard shortcuts inserted inside existing script */
(function(){
 const picker=document.getElementById('shortcutPicker');
 const grid=document.getElementById('shortcutPickerGrid');
 function selected(){return !!(state && state.selected && locOK(state.selected));}
 function closeP(){if(picker)picker.classList.remove('show');}
 function pos(){
   const w=document.querySelector('.word.selected');
   if(!w||!picker)return;
   const r=w.getBoundingClientRect();
   picker.style.left=(window.scrollX+r.left)+'px';
   picker.style.top=(window.scrollY+r.bottom+8)+'px';
 }
 function openColor(kind,applyToAll){
   if(!selected()||!picker||!grid)return;
   const colors=kind==='c'
    ? ['#000000','#0b61a4','#b02a2a','#3c763d','#8a6d3b','#6f42c1','#d2691e','']
    : ['#fff36d','#b7f7c1','#bde7ff','#ffd1dc','#e5ccff','#ffd8a8','#ffc9c9',''];
   grid.innerHTML='';
   colors.forEach(c=>{
     const b=document.createElement('button');
     if(c){b.style.background=c;} else {b.textContent='X';}
     b.onclick=function(){
       if(kind==='c')setSelectedColor(c,applyToAll);
       if(kind==='h')setSelectedHighlight(c,applyToAll);
       closeP();
     };
     grid.appendChild(b);
   });

   const customWrap=document.createElement('div');
   customWrap.style.gridColumn='span 4';
   customWrap.style.display='flex';
   customWrap.style.alignItems='center';
   customWrap.style.gap='8px';
   customWrap.style.marginTop='4px';

   const customInput=document.createElement('input');
   customInput.type='color';
   customInput.value=(kind==='c') ? '#000000' : '#fff36d';

   const applyBtn=document.createElement('button');
   applyBtn.textContent='Apply';
   applyBtn.onclick=function(){
      if(kind==='c') setSelectedColor(customInput.value,applyToAll);
      if(kind==='h') setSelectedHighlight(customInput.value,applyToAll);
      closeP();
   };

   customWrap.appendChild(customInput);
   customWrap.appendChild(applyBtn);
   grid.appendChild(customWrap);

   pos(); picker.classList.add('show');
 }
 document.addEventListener('keydown',function(e){
   const mod=e.ctrlKey||e.metaKey;
   const key=String(e.key||'').toLowerCase();
   const t=(document.activeElement&&document.activeElement.tagName)||'';
   const inField=/INPUT|TEXTAREA|SELECT/.test(t)||(document.activeElement&&document.activeElement.isContentEditable);
   if(mod&&key==='s'&&!e.shiftKey&&!e.altKey){
     e.preventDefault();
     e.stopPropagation();
     if(typeof saveProjectLocal==='function')saveProjectLocal();
     return;
   }
   if(!inField&&mod&&key==='z'&&!e.shiftKey&&!e.altKey){
     e.preventDefault();
     e.stopPropagation();
     if(typeof undoLastChange==='function')undoLastChange();
     return;
   }
   if(inField)return;
   const allMod=mod&&e.shiftKey&&!e.altKey;
   if((mod||e.altKey)&&!allMod)return;
   if(e.key==='Escape'){closeP();return;}
   if(!selected())return;
   const k=e.key.toLowerCase();
   if(allMod){
     if(k==='b'){e.preventDefault();toggleSelectedFormat('bold',true);}
     else if(k==='i'){e.preventDefault();toggleSelectedFormat('italic',true);}
     else if(k==='u'){e.preventDefault();toggleSelectedFormat('underline',true);}
     else if(k==='c'){e.preventDefault();openColor('c',true);}
     else if(k==='h'){e.preventDefault();openColor('h',true);}
     return;
   }
   if(k==='b'){e.preventDefault();toggleSelectedFormat('bold');}
   else if(k==='i'){e.preventDefault();toggleSelectedFormat('italic');}
   else if(k==='u'){e.preventDefault();toggleSelectedFormat(e.shiftKey?'doubleUnderline':'underline');}
   else if(k==='c'){e.preventDefault();openColor('c');}
   else if(k==='h'){e.preventDefault();openColor('h');}
 },true);
 document.addEventListener('click',function(e){if(picker&&!picker.contains(e.target))closeP();},true);
})();
