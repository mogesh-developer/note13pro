/* V0.9.1 — truthful archive-inspection progress and explicit evidence. */
'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  // Expand the existing Commands tab, still 100% read-only and mode-gated.
  const selector=document.getElementById('v09CommandChoice');
  if(selector){
    const old=window.v09SetCommandOptions;
    window.v09SetCommandOptions=function(){
      const mode=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb';
      const extra=mode==='adb'?
        [['brand','Device brand'],['battery','Battery status'],['slot','Android slot suffix']]:
        [['slot-count','Number of slots'],['secure','Secure bootloader flag'],['recovery-size','Recovery partition size (if available)']];
      old();
      for(const [value,label] of extra){const opt=document.createElement('option');opt.value=value;opt.textContent=label;selector.append(opt)}
    };
    window.v09SetCommandOptions();
    document.querySelectorAll('input[name="v09CmdMode"]').forEach(x=>x.onchange=window.v09SetCommandOptions);
  }
  const copyBtn=document.getElementById('v09CommandCopy');
  if(copyBtn)copyBtn.onclick=()=>{
    const mode=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb';
    const key=document.getElementById('v09CommandChoice').value;
    const adb={devices:'devices -l',model:'shell getprop ro.product.model',codename:'shell getprop ro.product.device',firmware:'shell getprop ro.build.version.incremental',android:'shell getprop ro.build.version.release',brand:'shell getprop ro.product.brand',battery:'shell dumpsys battery',slot:'shell getprop ro.boot.slot_suffix',packages:'shell pm list packages'};
    const fb={devices:'devices',product:'getvar product',slot:'getvar current-slot',unlocked:'getvar unlocked',anti:'getvar anti','is-userspace':'getvar is-userspace','slot-count':'getvar slot-count',secure:'getvar secure','recovery-size':'getvar partition-size:recovery'};
    const cmd=mode==='adb'?adb[key]:fb[key];
    if(!cmd){toast('Command is not in the read-only allowlist','error');return}
    const str=mode+' '+cmd;
    navigator.clipboard.writeText(str).then(()=>toast('Copied: '+str,'success')).catch(()=>toast('Clipboard unavailable','error'));
  };
});
