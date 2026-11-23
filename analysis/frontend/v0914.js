/* V0.9.14: selected mockup layout. Keeps the original element IDs and handlers. */
(()=>{'use strict';
function init(){
 const page=document.getElementById('page-fastboot');if(!page)return;
 const head=page.querySelector('.page-head');
 const source=page.querySelector('.v094-rom-source-panel');
 const mode=page.querySelector('.v09-mode-row');
 const refresh=document.getElementById('refreshFastbootDevice');
 const flash=document.getElementById('v09MainFlash');
 const state=document.getElementById('fastbootDeviceState');
 const summary=document.getElementById('fastbootDeviceSummary');
 const progress=page.querySelector('.v096-flash-actions>.panel:last-child');
 const lower=page.querySelector('.v096-flash-lower');
 const details=page.querySelector('.v096-flash-details');
 if(!head||!mode||!refresh||!flash||!progress||!lower)return;
 page.classList.add('v0914-layout');
 const toolbar=document.createElement('div');toolbar.className='v0914-top-controls';
 // Same compact action row; no new tab, panel or large blank space.
 const clean=document.createElement('label');clean.className='v0953-preflash-choice';
 clean.title='OPTIONAL DATA WIPE BEFORE FLASH: metadata removes encryption/setup metadata. userdata permanently removes installed apps, accounts, photos, and settings. OFF means normal existing ROM flashing. A backup is strongly recommended.';
 clean.innerHTML='<input id="v0953PreflashClean" type="checkbox" autocomplete="off" aria-label="Optional wipe metadata and userdata before flashing"><span class="v0955-wipe-labels"><small>Wipe metadata</small><small>Wipe userdata</small></span>';
 toolbar.append(mode,refresh,clean,flash);
 const device=document.createElement('div');device.className='v0914-device';
 const title=document.createElement('strong');title.textContent='Device';
 device.append(title,state,summary);toolbar.append(device);
 head.after(toolbar);
 const strip=page.querySelector('.v094-device-strip');if(strip)strip.hidden=true;
 const modePanel=page.querySelector('.v096-flash-actions>.panel:first-child');
 // Keep script hint and status as a compact information strip.
 const hint=document.getElementById('v0912ActiveScript');
 const status=document.getElementById('v09FlashStatus');
 const info=document.createElement('div');info.className='v0914-inline-info';
 if(hint)info.append(hint);if(status)info.append(status);
 source.querySelector('.v093-source-cards')?.after(info);
 modePanel?.remove();
 const monitor=document.createElement('div');monitor.className='v0914-monitor';
 // Move existing mapping panel without cloning it: all selection and flash handlers remain bound.
 const imageReport=document.getElementById('v094ImageReport');
 if(imageReport)monitor.append(imageReport);
 if(details)monitor.append(details);
 monitor.append(progress);
 source.after(monitor);
 lower.remove();
 const log=document.getElementById('v09FlashLog');if(log)log.textContent='Ready. Select an original Fastboot ROM, extracted folder, manufacturer script, or IMG files.';
 const header=progress.querySelector('.panel-heading');
 const actions=document.createElement('div');actions.className='v0914-log-actions';
 const auto=document.createElement('label');auto.innerHTML='<input type="checkbox" checked id="v0914AutoScroll"> Auto-scroll';
 const copy=document.createElement('button');copy.type='button';copy.className='btn tiny';copy.textContent='Copy Log';copy.onclick=()=>navigator.clipboard?.writeText(log?.textContent||'');
 const clear=document.createElement('button');clear.type='button';clear.className='btn tiny';clear.textContent='Clear View';clear.onclick=()=>{window.__v16ClearView=window.__v16DisplayedJobId||'no-job';if(log)log.textContent='';};
 actions.append(auto,copy,clear);header?.append(actions);
 if(log){new MutationObserver(()=>{if(auto.querySelector('input').checked)log.scrollTop=log.scrollHeight}).observe(log,{childList:true,characterData:true,subtree:true})}
 // Original modeless mode selection: warning is shown once when Flash is pressed.
 document.querySelectorAll('input[name="v09FlashMode"]').forEach(input=>input.addEventListener('change',()=>{
   document.getElementById('v0914ChosenMode')?.remove();
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
