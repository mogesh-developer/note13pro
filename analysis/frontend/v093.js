/* V0.9.3 — additive UI wiring. Keep privileged operations on their original verified backend endpoints. */
(()=>{
function init(){
 const $=id=>document.getElementById(id);
 const tabButtons=[...document.querySelectorAll('[data-v093-cmd-tab]')];
 function setTab(tab){
  tabButtons.forEach(b=>b.classList.toggle('primary',b.dataset.v093CmdTab===tab));
  $('v093InfoPanel').hidden=tab==='actions';$('v093ActionsPanel').hidden=tab!=='actions';
  if(tab!=='actions'){
   const target=document.querySelector(`input[name="v09CmdMode"][value="${tab}"]`);
   if(target){target.checked=true;target.dispatchEvent(new Event('change',{bubbles:true}));}
   explain();
  }
 }
 function explain(){
  const mode=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb', cmd=$('v09CommandChoice').value;
  const desc={devices:'Lists currently connected devices; no phone data changed.',model:'Reads the reported device model.',codename:'Reads the device firmware codename.',firmware:'Reads the installed software build.',android:'Reads the Android release.',packages:'Lists installed package names, read-only.',brand:'Reads the device brand reported by Android.',battery:'Reads Android battery status; does not charge or modify it.',hardware:'Reads Android hardware identifier; not proof of commercial model.',fingerprint:'Reads complete reported OS build fingerprint.',product:'Reads the Fastboot product/codename.',slot:'Reads active slot information.',unlocked:'Reads bootloader lock state.',anti:'Reads the reported anti-rollback index if exposed.', 'is-userspace':'Checks whether FastbootD is active.','slot-count':'Reads number of A/B slots if supplied by bootloader.','secure':'Reads Fastboot secure flag (no changes).','recovery-size':'Reads recovery partition size if reported; a missing partition is not a failure.','boot-size':'Reads size of boot partition as reported by this bootloader.','boot-has-slot':'Checks whether boot uses A/B slots.','system-has-slot':'Checks whether system uses A/B slots.','super-size':'Reads super partition size when exposed; not approval to flash.','super-type':'Reads reported super partition type; not proof of correct FastbootD mode.'};
  const cmds={adb:{devices:'adb devices -l',model:'adb shell getprop ro.product.model',codename:'adb shell getprop ro.product.device',firmware:'adb shell getprop ro.build.version.incremental',android:'adb shell getprop ro.build.version.release',brand:'adb shell getprop ro.product.brand',battery:'adb shell dumpsys battery',slot:'adb shell getprop ro.boot.slot_suffix',hardware:'adb shell getprop ro.boot.hardware',fingerprint:'adb shell getprop ro.build.fingerprint',packages:'adb shell pm list packages'},fastboot:{devices:'fastboot devices',product:'fastboot getvar product',slot:'fastboot getvar current-slot',unlocked:'fastboot getvar unlocked',anti:'fastboot getvar anti','is-userspace':'fastboot getvar is-userspace','slot-count':'fastboot getvar slot-count','secure':'fastboot getvar secure','recovery-size':'fastboot getvar partition-size:recovery','boot-size':'fastboot getvar partition-size:boot','boot-has-slot':'fastboot getvar has-slot:boot','system-has-slot':'fastboot getvar has-slot:system','super-size':'fastboot getvar partition-size:super','super-type':'fastboot getvar partition-type:super'}};
  $('v093CommandDescription').textContent='COMMAND: '+(cmds[mode]?.[cmd]||'Unknown')+' — '+(desc[cmd]||'Read-only device query.')+' This command does not erase or flash anything.';
 }
 tabButtons.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.v093CmdTab)));
 $('v09CommandChoice')?.addEventListener('change',explain);
 $('v093WipeShortcut')?.addEventListener('click',()=>{if(typeof startWipe==='function')startWipe();else $('v09CommandResult').textContent='Safe wipe action unavailable.';});
 $('v093FRPHelp')?.addEventListener('click',()=>{window.open('https://accounts.google.com/signin/recovery','_blank','noopener,noreferrer')});
 $('v093ShowImageDetails')?.addEventListener('click',()=>{const n=$('v09ImagesSummary');n.hidden=!n.hidden;const b=$('v093ShowImageDetails');b.textContent=n.hidden?'Expand':'Collapse';b.setAttribute('aria-expanded',String(!n.hidden));if(!n.hidden)n.scrollIntoView({block:'nearest'});});
 $('v094CopyMapping')?.addEventListener('click',()=>{const report=$('v09ImagesSummary').innerText||'';navigator.clipboard?.writeText(report).then(()=>toast('Mapping report copied','success')).catch(()=>toast('Clipboard unavailable','error'));});
 $('v094CopyCommandOutput')?.addEventListener('click',()=>{const output=$('v09CommandResult').innerText||'';navigator.clipboard?.writeText(output).then(()=>toast('Command output copied','success')).catch(()=>toast('Clipboard unavailable','error'));});
 const select=$('v09TelegramSelect'),nav=$('v093ChannelNav'),title=$('v093ChannelName');
 nav?.querySelectorAll('[data-channel]').forEach(b=>b.addEventListener('click',()=>{
  select.value=b.dataset.channel;
  title.textContent=b.textContent;
  nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  select.dispatchEvent(new Event('change',{bubbles:true}));
 }));
 // Existing load-on-first-open and refresh handlers remain the single source of Telegram data.
 setTab('adb');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
