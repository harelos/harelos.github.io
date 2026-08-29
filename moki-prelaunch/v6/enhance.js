(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero=document.querySelector('.heroBg'),quest=document.querySelector('.questMedia img'),finalImg=document.querySelector('.finalBg');
  if(!reduced){
    let raf=0;
    const move=()=>{
      const vh=innerHeight;
      if(hero){const r=hero.getBoundingClientRect();const d=(vh*.45)-(r.top+r.height*.45);hero.style.transform=`scale(1.025) translate3d(0,${Math.max(-7,Math.min(7,d*.012))}px,0)`;}
      if(quest){const r=quest.getBoundingClientRect();const d=(vh*.5)-(r.top+r.height*.5);quest.style.transform=`scale(1.035) translate3d(0,${Math.max(-8,Math.min(8,d*.016))}px,0)`;}
      if(finalImg){const r=finalImg.getBoundingClientRect();const d=(vh*.5)-(r.top+r.height*.5);finalImg.style.transform=`scale(1.025) translate3d(0,${Math.max(-6,Math.min(6,d*.012))}px,0)`;}
      raf=0;
    };
    addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(move)},{passive:true});
    addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(move)},{passive:true});
    move();
  }
  document.querySelectorAll('.moments,.memories').forEach(scroller=>{
    const hint=scroller.parentElement?.querySelector('.swipeHint');
    if(!hint)return;
    const hide=()=>{hint.style.opacity='0';hint.style.transition='opacity .25s ease';scroller.removeEventListener('scroll',hide)};
    scroller.addEventListener('scroll',hide,{passive:true});
  });
})();
