/* Light/Dark mode toggle */
(function(){
  function installThemeToggle(){
    if(document.getElementById('themeToggleBtn')) return;
    const top=document.querySelector('.top-stack');
    if(!top) return;

    const btn=document.createElement('button');
    btn.id='themeToggleBtn';
    btn.type='button';
    top.appendChild(btn);

    function apply(mode){
      const dark = mode === 'dark';
      document.body.classList.toggle('dark-mode', dark);
      btn.textContent = dark ? '☀ Light Mode' : '☾ Dark Mode';
      localStorage.setItem('contourTheme', mode);
    }

    const saved=localStorage.getItem('contourTheme') || 'light';
    apply(saved);

    btn.onclick=function(){
      apply(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
    };
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', installThemeToggle);
  else installThemeToggle();
})();
