/* V0.9.6: UI-only refinements. All flashing and device operations remain
   on existing verified backend endpoints. No new destructive command paths. */
(()=>{'use strict';
const channels={
 Wallpaper_AndroStuffs:['Walls','WP'],BtUnlock3:['Bootloader Paid Service','BL'],HyperOsUpdates:['HyperOS Apps','HY'],TechOfficeUpdate:['News','NW'],TO_Deals:['Smartphones','SP'],TechOfficeDeals:['Deals','DL']
};
function init(){
 const select=document.getElementById('v09TelegramSelect');
 const nav=document.getElementById('v093ChannelNav');
 const handle=document.getElementById('v096TelegramHandle');
 const badge=document.getElementById('v096TelegramBadge');
 const avatar=document.getElementById('v096TelegramAvatar');
 const status=document.getElementById('v09TelegramStatus');
 if(!select||!nav||!handle||!status)return;
 const buttons=[...nav.querySelectorAll('[data-channel]')];
 const update=()=>{
  const k=select.value, item=channels[k]||[k,'TG'];
  handle.textContent='@'+k+' • Public channel';avatar.textContent=item[1];
  buttons.forEach(btn=>{const active=btn.dataset.channel===k;btn.setAttribute('role','tab');btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;});
  badge.textContent='PUBLIC FEED';badge.classList.remove('v096-cached');
 };
 select.addEventListener('change',update);
 nav.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const at=buttons.findIndex(b=>b.dataset.channel===select.value);
  const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:e.key==='ArrowRight'?(at+1)%buttons.length:(at+buttons.length-1)%buttons.length;
  buttons[next].click();buttons[next].focus();
 });
 const watch=new MutationObserver(()=>{
  const t=status.textContent||'';
  if(t.includes('CACHED')){badge.textContent='CACHED';badge.classList.add('v096-cached');}
  else if(t.includes('unavailable')||t.includes('did not expose')){badge.textContent='UNAVAILABLE';badge.classList.add('v096-cached');}
  else{badge.textContent='PUBLIC FEED';badge.classList.remove('v096-cached');}
 });watch.observe(status,{childList:true,characterData:true,subtree:true});update();
 // Preserve one row of ROM selectors while showing flash mode, flash button,
 // mapping and real live result side by side. Moving existing DOM nodes retains
 // every listener and data binding; the backend flash executor is untouched.
 const flash=document.getElementById('page-fastboot');
 const source=flash?.querySelector('.v094-rom-source-panel');
 const mode=source?.nextElementSibling;
 const progress=mode?.nextElementSibling;
 if(source && mode?.classList.contains('panel') && progress?.classList.contains('panel') && !source.querySelector('.v096-flash-lower')){
  const sources=source.querySelector('.v093-source-cards');
  const left=document.createElement('div');left.className='v096-flash-details';
  let following=sources?.nextSibling;
  while(following){const next=following.nextSibling;left.append(following);following=next;}
  const right=document.createElement('div');right.className='v096-flash-actions';
  right.append(mode,progress);
  const lower=document.createElement('div');lower.className='v096-flash-lower';
  lower.append(left,right);source.append(lower);
 }
 document.querySelectorAll('[data-v093-cmd-tab]').forEach(b=>b.addEventListener('click',()=>{
  requestAnimationFrame(()=>{const c=document.querySelector('.content');if(c)c.scrollTop=0;});
 }));
 const safeScroll=(page)=>{
  const content=document.querySelector('.content');if(content)content.scrollTop=0;
  // Keep the selected feature's main actions visible even when returning from
  // a long inner report; scrolling inside an individual report is preserved.
 };
 document.querySelectorAll('.nav[data-page]').forEach(button=>button.addEventListener('click',()=>safeScroll(button.dataset.page)));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
