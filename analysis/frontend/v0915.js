/* V0.9.15 UI refresh: additive only; no change to existing AOSP sideload executable. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const adbDescriptions={devices:'List connected devices',model:'Read device model',codename:'Read device codename',firmware:'Read firmware build',android:'Read Android version',brand:'Read device brand',battery:'Read battery status',slot:'Read active boot slot',hardware:'Read hardware ID',fingerprint:'Read build fingerprint',packages:'List installed packages'};
const fastbootDescriptions={devices:'List Fastboot devices',product:'Read product codename',slot:'Read active slot',unlocked:'Read bootloader status',anti:'Read rollback index','is-userspace':'Check FastbootD mode','slot-count':'Read slot count',secure:'Read secure flag','recovery-size':'Recovery partition size','boot-size':'Boot partition size','boot-has-slot':'Boot A/B support','system-has-slot':'System A/B support','super-size':'Super partition size','super-type':'Super partition type'};

function rebuildCommandButtons(){
 const select=$('v09CommandChoice'),grid=$('v15CommandGrid');if(!select||!grid)return;
 const mode=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb';const desc=mode==='adb'?adbDescriptions:fastbootDescriptions;
 grid.replaceChildren();const seen=new Set();
 [...select.options].forEach(opt=>{if(seen.has(opt.value))return;seen.add(opt.value);
  const btn=document.createElement('button');btn.type='button';btn.className='v15-command-button';btn.dataset.command=opt.value;
  const title=document.createElement('strong');title.textContent=opt.textContent;
  const subtitle=document.createElement('small');subtitle.textContent=desc[opt.value]||'Read device information';
  btn.append(title,subtitle);btn.onclick=async()=>{
    select.value=opt.value;
    grid.querySelectorAll('.v15-command-button').forEach(b=>b.classList.remove('v15-active'));
    btn.classList.add('v15-active');btn.disabled=true;
    const out=$('v09CommandResult');if(out)out.textContent='RUNNING • '+opt.textContent+'\n';
    try{await v09CommandRun()}finally{btn.disabled=false;}
  };grid.append(btn);
 });
}
function bootCommands(){
 // Render after legacy handlers construct the existing options; do not replace backend command map.
 const modeInputs=document.querySelectorAll('input[name="v09CmdMode"]');
 modeInputs.forEach(r=>r.addEventListener('change',()=>queueMicrotask(rebuildCommandButtons)));
 document.querySelectorAll('[data-v093-cmd-tab]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(rebuildCommandButtons)));
 rebuildCommandButtons();
}
function bootRecovery(){
 const local=$('v15LocalSideloadPanel'),start=$('v15LocalStart');if(!local||!start)return;
 const tabs=[...document.querySelectorAll('[data-v095-recovery]')];
 function select(mode){tabs.forEach(b=>b.classList.toggle('primary',b.dataset.v095Recovery===mode));
  $('v095RecoveryImagePanel').hidden=mode!=='image';$('v095SideloadPanel').hidden=mode!=='sideload';local.hidden=mode!=='local';if($('v40HybridPanel'))$('v40HybridPanel').hidden=mode!=='hybrid';if($('v15RecoveryDetails'))$('v15RecoveryDetails').hidden=mode==='hybrid';const shared=document.querySelector('.v095-recovery-progress');if(shared)shared.hidden=mode==='hybrid';}
 const modeData={image:{name:'Recovery IMG',path:'recoveryPath',command:'Recovery image via the existing verified Fastboot workflow'},sideload:{name:'AOSP ADB Sideload',path:'sideloadPath',command:'Selected images from ROM ZIP → Fastboot flash → Recovery → wait for ADB sideload → sideload original ZIP'},local:{name:'Local ADB Sideload',path:'v15LocalZip',command:'adb -s DEVICE sideload <ZIP>'},hybrid:{name:'Hybrid Flasher',path:'hybridZIP',command:'Original BAT detected automatically from selected ROM ZIP'}};
 function refreshDetails(){const mode=tabs.find(b=>b.classList.contains('primary'))?.dataset.v095Recovery||'image',v=modeData[mode]||modeData.image;
  const path=$(v.path)?.value.trim()||'';const d=typeof device!=='undefined'?device:{};
  $('v15MethodTag').textContent=v.name;
  $('v15MethodName').textContent=v.name;
  $('v15SelectedFile').textContent=path||'No file selected';
  $('v15SelectedDevice').textContent=(d.model||'Not detected')+(d.mode?' • '+d.mode:'');
  $('v15CommandLine').textContent=v.command;
 }
 tabs.forEach(b=>b.addEventListener('click',()=>{select(b.dataset.v095Recovery);refreshDetails()},true));
 ['recoveryPath','sideloadPath','v15LocalZip'].forEach(id=>$(id)?.addEventListener('input',refreshDetails));
 document.querySelectorAll('#browseRecovery,#browseSideload,#v15LocalBrowse,#v095RecoveryRefresh').forEach(btn=>btn?.addEventListener('click',()=>setTimeout(refreshDetails,350)));
 setInterval(()=>{if(document.getElementById('page-recovery')?.classList.contains('shown'))refreshDetails()},2000);
 $('v15LocalBrowse').onclick=async()=>{try{const path=await chooseWindowsPath('zip');if(path)$('v15LocalZip').value=path}catch(e){toast(e.message,'error')}};
 start.onclick=async()=>{const path=$('v15LocalZip').value.trim();if(!/\.zip$/i.test(path)){toast('Choose a local ZIP first.','error');return}
  start.disabled=true;
  try{const job=await api('/api/sideload/local',{path});window.__v095SetRecoveryJob?.(job.id||'');toast('Local ADB sideload started; watch the shared progress panel.','success');$('v095RecoveryOutput').textContent='LOCAL ADB SIDELOAD • '+path+'\n'+(job.id||'Job queued')}
  catch(e){$('v095RecoveryOutput').textContent='LOCAL SIDELOAD FAILED TO START: '+e.message;toast(e.message,'error')}
  finally{start.disabled=false;}
 };
 // Preserve original progress and log panel; only change completed-transfer visual to 100%.
 const bar=$('v095RecoveryProgressFill');if(bar)new MutationObserver(()=>{
   const status=($('v095RecoveryJobState')?.textContent||'').toLowerCase();
   if(status==='verification_required'||status==='complete')bar.style.width='100%';
 }).observe($('v095RecoveryJobState'),{childList:true,subtree:true});
 select('image');refreshDetails();
}
function fastbootUI(){
 const page=$('page-fastboot'),log=$('v09FlashLog'),head=$('v09FlashLogDetails');if(!page||!log||!head)return;
 page.classList.add('v0915-fastboot');
 const actions=page.querySelector('.v0914-log-actions');
 const logToggle=document.createElement('button');logToggle.type='button';logToggle.className='btn tiny';logToggle.textContent='Collapse Logs';
 logToggle.onclick=()=>{page.classList.toggle('v15-logs-collapsed');const collapsed=page.classList.contains('v15-logs-collapsed');logToggle.textContent=collapsed?'Expand Logs':'Collapse Logs'};
 actions?.prepend(logToggle);
 const imageReport=$('v094ImageReport');if(imageReport){
  const toggle=document.createElement('button');toggle.type='button';toggle.className='btn tiny';toggle.textContent='Expand Images';toggle.id='v15ToggleImages';
  const heading=imageReport.querySelector('.panel-heading')||imageReport.firstElementChild;
  heading?.append(toggle);
  toggle.onclick=()=>{page.classList.toggle('v15-images-expanded');toggle.textContent=page.classList.contains('v15-images-expanded')?'Collapse Images':'Expand Images';};
 }
 // Use only the top universal Flash button, not an IMG-specific flash action.
 const extra=$('v0912FlashSelected');if(extra)extra.hidden=true;
 const flash=$('v09MainFlash');if(flash){
  const refresh=()=>{const kind=document.querySelector('input[name="flashSourceMethod"]:checked')?.value;
   const path=typeof selectedFlashSources!=='undefined'?selectedFlashSources[kind]:'';
   flash.classList.toggle('v15-flash-ready',!!path&&!flash.disabled);
   flash.title=path?'Flash selected '+kind+' source: '+path:'Select a ROM source to enable flashing';
  };
  document.querySelectorAll('input[name="flashSourceMethod"],input[name="v09FlashMode"]').forEach(r=>r.addEventListener('change',refresh));
  document.querySelectorAll('#browseROM,#browseFolder,#browseImagesFlash,#browseScript').forEach(b=>b.addEventListener('click',()=>setTimeout(refresh,700)));
  const observer=new MutationObserver(refresh);observer.observe(flash,{attributes:true,attributeFilter:['disabled']});refresh();
 }
 // Don't append global logs from other ROM sessions to the current session display.
 const sourceControls=document.querySelectorAll('#browseROM,#browseFolder,#browseImagesFlash,#browseScript');
 sourceControls.forEach(b=>b.addEventListener('click',()=>{}));
}
function deviceActions(){
 document.querySelectorAll('[data-v15-erase]').forEach(btn=>btn.addEventListener('click',async()=>{
  const partition=btn.dataset.v15Erase;
  const caution=partition==='metadata'?'Encryption metadata may be erased and existing data may become inaccessible.':'All user data, apps, photos and settings on the device may be lost.';
  const ok=await modal('Confirm fastboot erase '+partition,warnBody([caution,'Device: '+(device?.model||'Unknown'),'Command: fastboot erase '+partition,'This is not reversible and does not remove Google/Mi account protection.']),{accept:'Erase '+partition,cancel:'Cancel',danger:true});
  if(!ok)return;
  btn.disabled=true;try{const job=await api('/api/device/erase',{partition,confirm:'ERASE '+partition.toUpperCase()});$('v09CommandResult').textContent='Started: fastboot erase '+partition+'\nJob: '+job.id+'\nView Operations & Logs for the actual result.';toast('Erase command started','info')}
  catch(e){$('v09CommandResult').textContent='Fastboot erase failed to start: '+e.message;toast(e.message,'error')}
  finally{btn.disabled=false}
 }));
}
function init(){bootCommands();bootRecovery();fastbootUI();deviceActions();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
