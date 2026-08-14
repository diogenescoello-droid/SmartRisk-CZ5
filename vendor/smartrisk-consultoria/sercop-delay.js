(()=>{
  const q=new URLSearchParams(location.search);
  if(q.get('scenario')!=='sercop-epmmop-2025')return;
  const VERSION='20260814-01';
  const modal=document.getElementById('modal');
  const newBtn=document.getElementById('newBtn');
  const clean=()=>{
    if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');modal.style.display='none'}
    if(newBtn){newBtn.disabled=true;newBtn.style.display='none'}
    try{if(typeof s!=='undefined')s.wizard=0}catch(_){ }
  };
  clean();
  const nativeAlert=window.alert.bind(window);
  window.alert=msg=>/Borrador preparado en modo evaluaci[oó]n/i.test(String(msg))?undefined:nativeAlert(msg);
  let tries=0;
  const load=()=>{
    if(document.querySelector('script[data-sercop-loader]'))return;
    const sc=document.createElement('script');
    sc.dataset.sercopLoader='1';
    sc.src=`sercop-case-loader.js?v=${VERSION}`;
    document.body.appendChild(sc);
  };
  const wait=()=>{
    clean();
    if(window.SmartRiskModuleActions||tries++>40){load();return}
    setTimeout(wait,50);
  };
  wait();
})();