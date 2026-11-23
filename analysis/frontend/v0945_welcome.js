/* One-time fast typewriter reveal on existing bilingual welcome paragraphs. */
(()=>{'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const veil=document.getElementById('licenseStartOverlay');if(!veil)return;
 const texts=[...veil.querySelectorAll('.welcome-language p')];
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 let timers=[],finished=false;function finish(){if(finished)return;finished=true;timers.forEach(clearTimeout);texts.forEach(e=>{e.style.clipPath='none';e.style.opacity='1'});}
 texts.forEach((e,i)=>{e.style.clipPath='inset(0 100% 0 0)';e.style.opacity='1';e.style.transition='clip-path '+Math.min(330,170+(e.textContent||'').length*.30)+'ms steps(14,end)';timers.push(setTimeout(()=>{e.style.clipPath='inset(0 0 0 0)'},i*75+80));});
 veil.addEventListener('click',e=>{if(e.target.closest('button'))finish();});timers.push(setTimeout(finish,1200));
});})();
