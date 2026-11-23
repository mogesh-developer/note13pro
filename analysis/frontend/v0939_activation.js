/* Client-side preview UX. Server-side license gate is authoritative. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const publicPages=new Set(['youtube','telegram','support','aosp-roms']);
 let licensed=false;
 let gateDismissed=false;
 let welcomePreviewOpen=false;
 function setGate(active){
  licensed=!!active;document.body.classList.toggle('customer-unlicensed',!licensed);
  const veil=$('licenseStartOverlay');if(veil)veil.hidden=!(welcomePreviewOpen||(!licensed&&!gateDismissed));
  for(const page of document.querySelectorAll('.page')){
   const id=page.id.replace(/^page-/,'');
   const locked=!licensed&&!publicPages.has(id);
   page.classList.toggle('licensed-preview',locked);
   let note=page.querySelector(':scope > .license-page-note');
   if(locked&&!note){note=document.createElement('div');note.className='license-page-note';note.textContent='🔒 PREVIEW ONLY — Activate to use this section';page.prepend(note)}
   if(!locked&&note)note.remove();
  }
  const stat=document.querySelector('#page-dashboard .stat:nth-child(4) .stat-value');if(stat)stat.textContent=licensed?'ACTIVATED':'LOCKED PREVIEW';
 }
 function closePreview(){
  if(!welcomePreviewOpen)return;
  welcomePreviewOpen=false;
  const veil=$('licenseStartOverlay');if(veil)veil.hidden=licensed||gateDismissed;
  $('licenseWelcomePreview')?.focus();
 }
 function openWelcomePreview(){
  welcomePreviewOpen=true;
  const veil=$('licenseStartOverlay');
  if(veil){veil.hidden=false;veil.scrollTop=0;}
 }
 function openActivation(){if(licensed){window.toast?.('This PC is already activated.','info');return}gateDismissed=true;const veil=$('licenseStartOverlay');if(veil)veil.hidden=true;window.navigate('settings');$('licenseEmail')?.focus();}
 function browse(){gateDismissed=true;const veil=$('licenseStartOverlay');if(veil)veil.hidden=true;window.navigate('youtube');}
 // Existing listeners still render the full page; captured interactive events
 // on protected pages are suppressed before their handlers run.
 function block(e){
  if(licensed)return;
  const target=e.target;const page=target.closest?.('.page');if(!page)return;
  const id=page.id.replace(/^page-/,'');if(publicPages.has(id))return;
  if(id==='settings'&&target.closest('#licensePanel'))return;
  if(target.matches('input,textarea,select,button,a,[role=button]')||target.closest('button,a,[role=button]')){
   e.preventDefault();e.stopImmediatePropagation();
   if(e.type==='click')window.toast?.('Locked Preview — activate your customer license to use this feature.','info');
  }
 }
 document.addEventListener('click',block,true);document.addEventListener('submit',block,true);document.addEventListener('change',block,true);
 document.addEventListener('DOMContentLoaded',()=>{
  setGate(false);
  $('licenseWelcomePreview')?.addEventListener('click',openWelcomePreview);
  const welcomeOverlay=$('licenseStartOverlay');
  // In preview, every click closes without triggering an activation/navigation action.
  welcomeOverlay?.addEventListener('click',e=>{
   if(!welcomePreviewOpen)return;
   e.preventDefault();e.stopImmediatePropagation();closePreview();
  },true);
  document.addEventListener('keydown',e=>{if(welcomePreviewOpen&&e.key==='Escape'){e.preventDefault();closePreview();}});
  $('licenseStartBrowse').onclick=browse;$('licenseStartActivate').onclick=openActivation;
  const contact=$('licenseStartContact');if(contact)contact.onclick=()=>{gateDismissed=true;$('licenseStartOverlay').hidden=true;window.navigate('support');}; const guide=$('licenseStartGuide');if(guide)guide.onclick=()=>{gateDismissed=true;$('licenseStartOverlay').hidden=true;window.navigate('youtube');};
  window.addEventListener('tech-office-license-state',e=>setGate(!!e.detail?.active));
 });
})();
