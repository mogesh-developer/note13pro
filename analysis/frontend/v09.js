/* V0.9 clean workflow: explicit one-source method, fresh physical Fastboot scan,
   no implicit flashing, contextual process, truthful source previews. */
'use strict';
let v09ResolvedArchive='',v09ResolvedRoot='',v09StageJob='',v09LastFlashJob='',v09LastImageSource='';
let v092StageOutput='';
let v100Phase='select',v100StageSource='',v100PreparedPlan=null,v100VerifyBusy=false;
let v094ImagePreviewSeq=0;
let v0912ImageCatalog=null;
let v0912FlashBusy=false;
let v0913StageResolving=false, v0913ModeCheckSeq=0;
let v17LastStartError='';
function v0912FlashGuard(busy){
 v0912FlashBusy=!!busy;
 for(const id of ['browseROM','browseFolder','browseImagesFlash','browseScript','v0912FlashSelected']){
  const x=v09$(id);if(x)x.disabled=!!busy;
 }
 document.querySelectorAll('input[name="flashSourceMethod"], input[name="v09FlashMode"]').forEach(x=>{x.disabled=!!busy});
 const clean=document.getElementById('v0953PreflashClean');if(clean)clean.disabled=!!busy;
}
const v0912ModeFile={clean:'flash_all.bat',preserve:'flash_all_except_storage.bat',lock:'flash_all_lock.bat'};
const v0912ScriptMode=path=>{const file=v09Name(path).toLowerCase();return Object.keys(v0912ModeFile).find(mode=>file===v0912ModeFile[mode]||file===v0912ModeFile[mode].replace('.bat','.sh'))||''};
function v0912UpdateCount(){const selected=document.querySelectorAll('#v09ImagesSummary input[data-flash-img]:checked').length;const e=v09$('v0912ImageSelectedCount');if(e)e.textContent=selected+' IMG selected • commands listed below';}
async function v0912UpdateScriptHint(){
 const kind=v09FlashRadio(),mode=v09FlashMode(),hint=v09$('v0912ActiveScript');if(!hint)return;
 let root='',txt=mode==='clean'?'Clean':mode==='preserve'?'Save User Data':'Clean All & Lock';
 if(kind==='script')root=v09Dir(selectedFlashSources.script||'');
 else if(kind==='folder')root=selectedFlashSources.folder||'';
 else if(kind==='images')root=v09Dir(selectedFlashSources.images||'');
 else if(kind==='tgz')root=v09ResolvedRoot||'';
 if(!root){hint.textContent=txt+' → '+v0912ModeFile[mode]+' • BAT will be discovered after choosing/extracting ROM';return}
 try{const result=await api('/api/stock/script-modes',{root});if(v09FlashMode()!==mode||v09FlashRadio()!==kind)return;
  const file=(result.modes||{})[mode];
  hint.textContent=txt+' → '+(file||'NOT FOUND IN SELECTED ROM')+(file?' • official manufacturer BAT':' • file unavailable');
  if(kind==='script'){
    const picked=selectedFlashSources.script||'',actual=v0912ScriptMode(picked);
    v09$('v0912ManualScriptMode').textContent='Chosen BAT: '+v09Name(picked)+' • detected mode: '+(actual||'UNSUPPORTED')+'. Selected BAT runs directly when Flash is clicked.';
    hint.textContent='Selected script: '+v09Name(picked)+' • original BAT will run when Flash is clicked.';
  }
 }catch(e){hint.textContent='Cannot inspect manufacturer scripts: '+e.message}
}
// The opt-in is read at Flash click time; never persists into a new process.
async function v0953PreflashConsent(){
 const checked=!!document.getElementById('v0953PreflashClean')?.checked;
 if(!checked)return {preflash_clean:false,wipe_confirm:''};
 const ok=await modal('Confirm optional pre-flash data wipe',warnBody([
  'This option permanently erases userdata and encryption metadata on the connected phone BEFORE the selected ROM flashing method starts.',
  ...(v09FlashMode()==='preserve'?['IMPORTANT: Save User Data mode is selected, but checking this wipe WILL still delete user data.']:[]),
  'Apps, photos, files and settings on the phone may be permanently lost. Keep a verified backup.',
  'This does NOT erase FRP/account ownership protection or guarantee resolution of sign-in issues.',
  'If either erase operation fails, the selected ROM flash will NOT start.'
 ]),{accept:'ERASE DATA, THEN FLASH',cancel:'Cancel',danger:true});
 return ok?{preflash_clean:true,wipe_confirm:'ERASE USERDATA AND METADATA'}:null;
}

async function v0912FlashImages(){
 if(v09FlashMode()==='lock'){await v0913LockWarning();return}
 if(v0912FlashBusy){toast('A flash job is already running. Wait for its actual result.','error');return}
 if(v09FlashRadio()!=='images'){toast('Select the Images Folder method first.','error');return}
 const folder=selectedFlashSources.images;
 if(!folder){toast('Choose an extracted ROM images/ folder.','error');return}
 const chosen=[...document.querySelectorAll('#v09ImagesSummary input[data-flash-img]:checked')].map(x=>x.dataset.flashImg);
 if(!chosen.length){toast('Choose one or more individual IMG files from the list.','error');return}
 v09Status('Preparing selected image commands…');
 let plan;
 try{const fresh=await api('/api/scan');setDevice(fresh.device);v09FastbootStatus();plan=await api('/api/stock/image-batch-plan',{folder,mode:v09FlashMode(),images:chosen});}
 catch(e){v09Status('IMG plan verification failed: '+e.message,true);return}
 if(!plan.executable){const blockers=(plan.blockers||[]).slice(0,7).join(' | ');if(/mismatch|codename|region/i.test(blockers))await v0913MismatchPrompt(plan,'Selected Images');v09Status('IMG FLASH BLOCKED: '+blockers,true);v09$('v09FlashProgressText').textContent='No IMG written. '+blockers;toast('Selected IMG(s) not eligible: '+blockers,'error');return}
 const desc=['Device '+(device?.codename||'Unknown')+' • Region '+(device?.region||'Unknown'),'Manufacturer script: '+v09Name(plan.script),...plan.steps.map((x,i)=>(i+1)+'. '+x.partition+' ← '+v09Name(x.file)),'This writes only checked partitions. The separate opt-in pre-flash wipe, if selected, is confirmed next. No automatic relock.','Verify exact device/ROM compatibility and a recovery backup first.'];
 if(!await modal('⚠ CONFIRM SELECTED IMG FLASH',warnBody(desc),{accept:'FLASH SELECTED IMAGES',danger:true})){v09Status('IMG flashing canceled before any device writes.');return}
 const wipe=await v0953PreflashConsent();if(!wipe)return;
 try{const j=await api('/api/stock/image-batch-flash',{folder,mode:v09FlashMode(),images:chosen,plan_hash:plan.plan_hash,confirm:'FLASH SELECTED IMAGES',...wipe});v09LastFlashJob=j.id||'';v0912FlashGuard(true);v09$('v09FlashLogDetails').open=true;v09Status('Selected IMG flash started • '+chosen.length+' images • no fixed timeout');v09$('v09FlashJobStatus').textContent='FLASHING IMGS';v09$('v09FlashProgressText').textContent='IMG flashing in progress — check shared live commands, do not disconnect USB.';toast('Selected IMG flash job started.','info')}
 catch(e){v09Status('IMG flash denied: '+e.message,true);toast(e.message,'error')}
}

const v09$=id=>document.getElementById(id);
const v09Name=v=>String(v||'').split(/[\\/]/).pop();
const v09Dir=v=>String(v||'').replace(/[\\/][^\\/]+$/,'');
const v09FlashRadio=()=>document.querySelector('input[name="flashSourceMethod"]:checked')?.value||'';
const v09FlashMode=()=>document.querySelector('input[name="v09FlashMode"]:checked')?.value||'clean';
function v09Status(msg,bad=false){const el=v09$('v09FlashStatus');if(el){el.textContent=msg;el.style.color=bad?'#ff909e':'#abd5ea'}}
function v09SyncSources(){for(const [kind,id] of Object.entries({tgz:'v09TgzPath',folder:'v09FolderPath',images:'v09ImagesPath'})){const e=v09$(id);if(e){e.textContent=selectedFlashSources[kind]?selectedFlashSources[kind]:'No '+kind+' selected';e.title=selectedFlashSources[kind]||''}}}
function v09FastbootStatus(){const ok=device?.mode==='fastboot'&&!device?.demo;const pill=v09$('fastbootDeviceState');if(pill){pill.textContent=ok?'FASTBOOT CONNECTED':device?.mode==='device'?'ADB — NOT FASTBOOT':(device?.mode||'NOT CONNECTED').toUpperCase();pill.className='pill '+(ok?'':'warning')};const desc=v09$('fastbootDeviceSummary');if(desc)desc.textContent='Device: '+(device?.model||'Unknown')+' • Codename: '+(device?.codename||'Unknown')+' • OS: '+(device?.firmware||'Unknown')+' • Region: '+(device?.region||'Unknown')+' • Bootloader: '+(device?.bootloader||'UNKNOWN')+(ok?' • Fastboot detected':' • Connect device in Fastboot');return !!ok}
async function v09Browse(kind,picker){if(v0912FlashBusy){toast('Flashing active. Do not switch sources until the current device result.','error');return}let path=await chooseWindowsPath(picker);if(!path)return;
 if(kind==='tgz'&&!/\.(?:tgz|tar\.gz)$/i.test(path)){toast('Official Fastboot ROM selection requires a .tgz or .tar.gz archive, not a Recovery ZIP. Choose a Fastboot TGZ; Recovery ZIP belongs in Recovery Flashing.','error');return}
 if(kind==='images'&&!/[\\/]images$/i.test(path)){toast('Select the ROM images subfolder, not its parent.','error');return}
 selectedFlashSources[kind]=path;verifiedFlashPlan=null;window.__v16ClearView=null;
 const radio=document.querySelector('input[name="flashSourceMethod"][value="'+kind+'"]');if(radio)radio.checked=true;
 if(kind==='script'){
  v09$('scriptPath').value=path;const name=v09$('v0913ScriptFile');if(name){name.textContent=path;name.title=path;}
  const found=v0912ScriptMode(path);
  if(found){const radio=document.querySelector('input[name="v09FlashMode"][value="'+found+'"]');
    if(radio)radio.checked=true;
    if(found==='lock')toast('Flash & Lock script selected. A clear warning appears before flashing.','info');
  }else toast('Custom BAT selected. Its original commands will run when Flash is pressed.','info');
}
 else v09$('romPath').value=path;
 v100ResetStage();v0912ImageCatalog=null;
 v09SyncSources();setSourceBadge();
 if(kind!=='images'){v094ImagePreviewSeq++;const report=v09$('v094ImageReport');if(report)report.hidden=true;}
 if(kind==='images')v09ListImages(path);v0912UpdateScriptHint();if(kind!=='tgz')v09Status('Source selected. Choose mode and press Flash Selected ROM.');v100PhaseUI('select');toast(v09Name(path)+' selected. Nothing has been flashed.','success');
 if(kind==='tgz')await v09Stage();
 else if(kind==='folder')v0912UpdateScriptHint();
}
async function v09ListImages(path){
 const previewSeq=++v094ImagePreviewSeq;
 const box=v09$('v09ImagesSummary');const panel=v09$('v094ImageReport');if(panel)panel.hidden=false;box.hidden=false;box.textContent='Scanning images folder and checking the parent ROM script…';
 try{
  const r=await api('/api/stock/images-preview',{path,mode:v09FlashMode()==='lock'?'clean':v09FlashMode()});
  if(previewSeq!==v094ImagePreviewSeq || v09FlashRadio()!=='images' || selectedFlashSources.images!==path)return;
  if(v09$('v094ImageCount'))v09$('v094ImageCount').textContent=(r.image_count||0)+' files';box.replaceChildren();const title=document.createElement('b');title.textContent=r.summary||('Found '+r.image_count+' files');box.append(title);
  const origin=document.createElement('div');origin.className='small muted';origin.textContent='ROM: '+(r.parent_rom||'Unknown')+' • Mapping evidence: '+(r.source||'unverified');box.append(origin);
  for(const warning of r.warnings||[]){const line=document.createElement('div');line.className='danger-text small';line.textContent=warning;box.append(line)}
  const details=document.createElement('div');details.className='v094-image-mappings';
  const table=document.createElement('div');table.className='v092-image-table';
  v0912ImageCatalog=r;
  for(const item of r.images||[]){const line=document.createElement('label');line.className='v092-image-row v0912-image-row';
   const tick=document.createElement('input');tick.type='checkbox';tick.dataset.flashImg=item.name;tick.dataset.verified=item.status==='script-mapped'?'true':'false';tick.disabled=false;tick.title=item.status==='script-mapped'?'Partition from manufacturer BAT':'Filename-derived partition suggestion; please check exact intended partition.';tick.addEventListener('change',v0912UpdateCount);
   const name=document.createElement('strong');name.textContent=item.name;
   const target=document.createElement('span');const suggested=item.partition||item.name.replace(/\.(?:img|bin|elf|mbn)$/i,'');target.textContent=' → '+suggested+' • '+(item.size/1048576).toFixed(1)+' MB';
   const evidence=document.createElement('small');evidence.className='muted';evidence.textContent=' • '+(item.status==='script-mapped'?'OEM BAT mapping':'Filename suggestion — not OEM verified')+' • fastboot flash '+suggested+' '+item.name;
   line.append(tick,name,target,evidence);table.append(line)}
  details.append(table);box.append(details);v0912UpdateCount();
 }catch(e){if(previewSeq===v094ImagePreviewSeq)box.textContent='Folder inspection blocked: '+e.message}
}
// TGZ select begins extraction and verification automatically. Only explicit Flash
// after a verified ready state can write to phone. No timer starts flashing.
function v100PhaseUI(phase,message='',bad=false){
 v100Phase=phase;
 if(message)v09Status(message,bad);
 if(phase==='ready'&&v09$('v09FlashProgressText'))v09$('v09FlashProgressText').textContent='TGZ extraction complete. Select the flash mode and click Flash Selected ROM.';
 const tgz=v09FlashRadio()==='tgz';
 const flow=v09$('v100Flow');if(flow)flow.hidden=!tgz;
 const del=v09$('v100DeleteROM');if(del)del.disabled=['extracting','verifying','flashing'].includes(phase);
 const open=v09$('v092OpenROM');if(open)open.disabled=phase==='extracting';
 const current=v09$('v100FlowText');
 if(current)current.textContent=message||({select:'Choose a TGZ to start automatic extraction.',extracting:'ROM EXTRACTING — PLEASE WAIT. No flashing has started.',extracted:'ROM extracted. Device and ROM verifying automatically…',verifying:'Rechecking physical device and validating ROM...',blocked:'Verification blocked. Recheck or choose the correct ROM.',ready:'NOW YOU CAN FLASH — checks passed. Flashing will only start after your click.',flashing:'FLASHING — DO NOT DISCONNECT USB.',finished:'Fastboot commands finished; verify successful phone boot.',failed:'Flashing failed. Inspect the live log; do not retry blindly.'})[phase]||'';
 for(const [name,group] of [['extract',['extracting','extracted','verifying','blocked','ready','flashing','finished','failed']],['verify',['ready','flashing','finished','failed']],['flash',['flashing','finished','failed']]]){
  const el=v09$('v100Step'+name);if(el)el.classList.toggle('done',group.includes(phase));
 }
 const btn=v09$('v09MainFlash');if(!btn)return;
 btn.textContent='▶ Flash Selected ROM';
 btn.disabled=v0912FlashBusy||!selectedFlashSources[v09FlashRadio()]||(tgz&&phase!=='ready');
}
function v100ResetStage(){
 v09ResolvedArchive='';v09ResolvedRoot='';v09StageJob='';v092StageOutput='';
 v100StageSource='';v100PreparedPlan=null;v09LastFlashJob='';
 v09$('v092OpenROM').hidden=true;v09$('v100DeleteROM').hidden=true;
 v100PhaseUI('select','Choose a source. TGZ auto extraction starts on selection; no device write without Flash.');
}
async function v09Refresh(){
 if(v0912FlashBusy){v09Status('Extraction or flashing is still running. Buttons unlock when the current operation finishes.');return}
 try{await scanDevice();v09FastbootStatus();v09Status(device?.mode==='fastboot'?'Fastboot device detected. Ready to use selected mode.':'No Fastboot device detected. Connect phone and refresh.',device?.mode!=='fastboot')}
 catch(e){v09Status('Device refresh failed: '+e.message,true)}
}

async function v09Stage(){
 const path=selectedFlashSources.tgz;
 if(v09FlashRadio()!=='tgz'||!/\.(?:tgz|tar\.gz)$/i.test(path||'')){toast('Select an original Fastboot TGZ, not a Recovery ZIP.','error');return null}
 if(v0912FlashBusy||['extracting','resolving','verifying','flashing'].includes(v100Phase))return null;
 // Always use the application's own unique output folder. Selection alone
 // may start extraction, but NO PHONE WRITE without subsequent user consent.
 try{
  const job=await api('/api/stock/stage',{path,destination:''});
  v09ResolvedArchive=path;v09ResolvedRoot='';v09StageJob=job.id||'';
  v100StageSource=path;v100PreparedPlan=null;v09LastFlashJob='';
  v09$('v092OpenROM').hidden=true;v09$('v100DeleteROM').hidden=true;
  v100PhaseUI('extracting','EXTRACTING ROM: flash buttons temporarily unavailable until extraction reaches 100%. No phone writes.');
  v0912FlashGuard(true);
  v09$('v09FlashJobStatus').textContent='EXTRACTING';
  v09$('v09FlashProgressText').textContent='Extracting the selected TGZ. Flash will become available when extraction finishes.';
  return job;
 }catch(e){v100PhaseUI('stage-failed','Automatic TGZ extraction could not start: '+e.message,true);toast(e.message,'error');return null}
}
async function v0913VerifySelectedFolder(){
 if(v09FlashRadio()!=='folder'||!selectedFlashSources.folder)return;
 const folder=selectedFlashSources.folder,mode=v09FlashMode(),seq=++v0913ModeCheckSeq;
 v09Status('Detecting the original ROM flash scripts…');
 try{
  const check=await api('/api/scan');setDevice(check.device);v09FastbootStatus();
  const plan=await api('/api/stock/plan',{rom_path:folder,script_path:'',mode});
  if(seq!==v0913ModeCheckSeq||folder!==selectedFlashSources.folder||v09FlashRadio()!=='folder'||mode!==v09FlashMode())return;
  verifiedFlashPlan=plan;
  v09Status(plan.executable?'NOW YOU CAN FLASH — verified '+v09Name(plan.script_path)+'. Select mode and click Flash.':'VERIFICATION BLOCKED: '+(plan.blockers||[]).slice(0,2).join(' | '),!plan.executable);
 }catch(e){if(seq===v0913ModeCheckSeq)v09Status('Verification unavailable: '+e.message,true)}
}
async function v0913MismatchPrompt(plan,method){
 const blockers=(plan.blockers||[]).slice(0,5);
 const recheck=await modal('⚠ ROM / DEVICE CODENAME MISMATCH',warnBody([
   'Method: '+method,
   'Connected device: '+(device?.model||'Unknown')+' • '+(device?.codename||'Unknown')+' • Region '+(device?.region||'Unknown'),
   'Selected ROM: '+(plan.rom_codename||plan.device_codename||'Unknown')+' • Region '+(plan.rom_region||'Unknown'),
   'This ROM may permanently brick a different device.',
   'Recheck & Verify rescans the physical device. Skip Warning dismisses this notice but DOES NOT bypass incompatible ROM flashing.',
   ...blockers
 ]),{accept:'Recheck & Verify',cancel:'Skip Warning (No Flash)',danger:true});
 if(recheck){try{const r=await api('/api/scan');setDevice(r.device);v09FastbootStatus();v09Status('Device rechecked. Review selected ROM and press Flash again to build a fresh plan.');}catch(e){v09Status('Recheck failed: '+e.message,true)}}
}
async function v0913LockWarning(){
 const body=warnBody(['Flash All & Lock will relock the bootloader. Wrong codename, region, firmware or rollback version can permanently brick the device.',
  'This same warning applies to Original TGZ, Extracted ROM Folder, user-selected BAT and any other attempted lock operation.',
  'A countdown never overrides the mandatory, independent device/ROM/relock checks. Relock remains blocked in this test build.']);
 const msg=document.createElement('p');msg.className='danger-text';body.append(msg);
 let left=3;msg.textContent='Read the warning • 3 seconds remaining';
 const confirmation=modal('⚠ FLASH ALL & LOCK — HIGH RISK',body,{accept:'I UNDERSTAND',cancel:'Cancel',danger:true});
 const accept=document.getElementById('modalAccept');accept.disabled=true;
 const timer=setInterval(()=>{left--;if(left>0)msg.textContent='Read the warning • '+left+' seconds remaining';else{clearInterval(timer);accept.disabled=false;msg.textContent='Warning acknowledged. Safe relock eligibility is still required.';}},1000);
 const accepted=await confirmation;clearInterval(timer);accept.disabled=false;
 if(accepted)v09Status('LOCK MODE NOT AUTHORIZED: relock compatibility is not independently established. No phone partitions written.',true);
 return false;
}

async function v100Verify(showMismatch=true){
 const source=selectedFlashSources.tgz;
 if(!source||v100StageSource!==source||!v09StageJob){v100ResetStage();toast('Source changed. Extract the chosen TGZ again.','error');return null}
 if(v100VerifyBusy)return null;
 v100VerifyBusy=true;v100PhaseUI('verifying','Rechecking physical Fastboot device and the extracted official ROM…');
 try{
  const check=await api('/api/scan');setDevice(check.device);v09FastbootStatus();
  const answer=await api('/api/stock/staged-plan',{stage_id:v09StageJob,archive_path:source,mode:v09FlashMode()});
  if(source!==selectedFlashSources.tgz||v100StageSource!==source){v100ResetStage();return null}
  const plan=answer.plan;v09ResolvedRoot=answer.root;verifiedFlashPlan=plan;
  v100PreparedPlan=plan;v092StageOutput=v092StageOutput||'';
  if(plan.executable){
   v100PhaseUI('ready','NOW YOU CAN FLASH — '+plan.rom_codename+' / '+plan.rom_region+' • '+plan.steps.length+' verified steps. Click the button to confirm; phone not written yet.');
   return plan;
  }
  const blockers=plan.blockers||[];
  const mismatch=blockers.some(x=>/mismatch|CODENAME|region mismatch/i.test(x));
  v100PhaseUI('blocked','BLOCKED: '+(blockers.slice(0,3).join(' | ')||'Device/ROM safety validation incomplete'),true);
  if(mismatch&&showMismatch){
   const retry=await modal('⚠ ROM / DEVICE MISMATCH — FLASH BLOCKED',warnBody([
     'Connected: '+(device?.model||'Unknown')+' ('+(device?.codename||'Unknown')+') • Region: '+(device?.region||'Unknown'),
     'Selected ROM: '+(plan.rom_codename||'Unknown')+' • Region: '+(plan.rom_region||'Unknown'),
     'Recheck & Verify rescans the currently connected phone. Skip keeps the extracted files but NEVER permits mismatched ROM flashing.',
     ...blockers.slice(0,3)
   ]),{accept:'Recheck & Verify',cancel:'Skip Warning (No Flash)',danger:false});
   if(retry){v100VerifyBusy=false;return v100Verify(false)}
  }
  return null;
 }catch(e){v100PhaseUI('blocked','Verification failed: '+e.message+'. Recheck selected ROM and device.',true);return null}
 finally{v100VerifyBusy=false}
}
async function v09Flash(){
 if(v0912FlashBusy){toast('A flash/extraction job is already running.','error');return}
 const kind=v09FlashRadio(),mode=v09FlashMode();
 if(!kind){toast('Select TGZ, extracted ROM folder, IMG files or BAT first.','error');return}
 if(kind==='images')return v0914FlashImages();
 const src=selectedFlashSources[kind];if(!src){toast('Select a ROM input first.','error');return}
 let root='',script='';
 if(kind==='tgz'){
  if(!v09ResolvedRoot||v100Phase!=='ready'){v09Status('Wait for TGZ extraction to complete (100%) before flashing.',true);toast('TGZ extraction is not complete yet.','error');return}
  root=v09ResolvedRoot;
 }else if(kind==='folder'){root=src}
 else if(kind==='script'){script=src;root=v09Dir(src)}
 if(mode==='lock'||(kind==='script'&&v0912ScriptMode(script)==='lock')){
  const confirmed=await modal('⚠ Flash All & Lock — High Risk',warnBody([
   'This action can permanently brick your phone if the ROM, hardware region or bootloader requirements do not match.',
   'Your selected manufacturer BAT controls the wipe, flash and relock sequence.',
   'Continue only if you are sure the file and device are correct.'
  ]),{accept:'Continue Flash & Lock',cancel:'Cancel',danger:true});
  if(!confirmed)return;
 }
 const wipe=await v0953PreflashConsent();if(!wipe)return;
 try{
  const j=await api('/api/stock/official-flash',{rom_path:root,script_path:script,mode,confirm:'FLASH SELECTED ROM',...wipe});
  v17LastStartError='';v09LastFlashJob=j.id||'';window.__v19JobSources??={};window.__v19JobSources[j.id]={rom:src,method:kind,mode};v0912FlashGuard(true);v09$('v09FlashLogDetails').open=true;
  v09$('v09FlashJobStatus').textContent='FLASHING';
  v09Status('Original manufacturer BAT running. Follow live commands below.');
  if(kind==='tgz')v100PhaseUI('flashing','Flashing original Xiaomi BAT — keep USB connected.');
  toast('Original ROM flashing started.','success');
 }catch(e){v17LastStartError='FLASH NOT STARTED: '+e.message;v09Status(v17LastStartError,true);toast(e.message,'error')}
}
// The single visible IMG Flash button uses the already-registered verified
// image-batch executor. Previous official-image-flash route was not registered
// in routes(), so the former handler returned HTTP 404.
async function v0914FlashImages(){
 return v0912FlashImages();
}

async function v09Jobs(){
 try{const data=await api('/api/jobs');const jobs=data.jobs||[];
 {
  if(v09StageJob&&v09FlashRadio()==='tgz'){
   const st=jobs.find(j=>j.id===v09StageJob);
   if(st?.status==='failed'&&v100Phase==='extracting'){
    v0912FlashGuard(false);v100PhaseUI('stage-failed','TGZ EXTRACTION FAILED: '+(st.detail||'See process log'),true);
   }
   if(st?.status==='complete'&&st.output_dir&&v100Phase==='extracting'&&!v0913StageResolving&&v100StageSource===selectedFlashSources.tgz){
    v0913StageResolving=true;v100PhaseUI('resolving','ROM extracted. Checking manufacturer scripts…');try{
     const x=await api('/api/stock/stage-roots',{path:st.output_dir});
     if(x.roots?.length!==1)throw Error('Expected exactly one manufacturer ROM script root');
     v09ResolvedRoot=x.roots[0];v092StageOutput=st.output_dir;v0912UpdateScriptHint();
     v09$('v092OpenROM').hidden=false;v09$('v100DeleteROM').hidden=false;
     v0912FlashGuard(false);v100PhaseUI('ready','ROM EXTRACTED • BAT scripts found. Select Clean / Save Data / Lock and press Flash Selected ROM. Phone must be in Fastboot.');
     v17LastStartError='';
    }catch(e){v0912FlashGuard(false);v100PhaseUI('stage-failed','ROM extracted but structure check failed: '+e.message,true)}finally{v0913StageResolving=false}
   }
  }
  const job= v09LastFlashJob?jobs.find(j=>j.id===v09LastFlashJob):null;
  if(job&&v0912FlashBusy&&['failed','complete','verification_required','deleted'].includes(job.status))v0912FlashGuard(false);
  const stage=v09StageJob?jobs.find(j=>j.id===v09StageJob):null;
  const current=job&&job.status==='running'?job:(stage&&stage.status==='running'?stage:job||stage);
  if(current){const pct=current.total?Math.min(100,Math.max(0,Math.round(current.done/current.total*100))):0;
    v09$('v09FlashJobStatus').textContent=current.status.toUpperCase();v09$('v09FlashProgressFill').parentElement.classList.toggle('indeterminate',!current.total&&current.status==='running');v09$('v09FlashProgressFill').style.width=(!current.total&&['complete','verification_required'].includes(current.status)?100:pct)+'%';v09$('v09FlashProgressText').textContent=current.kind+' — '+(current.detail||current.status)+(current.total?' • '+pct+'%':' • OEM BAT progress: live / percentage unavailable');
    if(stage?.status==='complete'&&!job){v09$('v09FlashJobStatus').textContent='ROM EXTRACTED';v09$('v09FlashProgressText').textContent='TGZ extraction complete • Select mode and Flash.';}
    if(job&&job.status==='failed'&&v100Phase==='flashing')v100PhaseUI('failed','FLASH FAILED: '+(job.detail||'Inspect logs')+' — do not retry blindly.',true);
    if(job&&job.status==='verification_required'&&v100Phase==='flashing')v100PhaseUI('finished','ALL FASTBOOT COMMANDS COMPLETE. Verify actual Android boot on device before declaring installation successful.');
    if(current.status==='failed'&&v100Phase!=='failed'&&v100Phase!=='stage-failed')v09Status('Operation FAILED: '+(current.detail||'See logs'),true);

  }
  const method=v09FlashRadio(),input=selectedFlashSources[method]||'',flashMode=v09FlashMode();
  const operation=current?.id||'No job';const when=current?.started||'No operation started';
  const info=['══════════ FASTBOOT SESSION ══════════','ROM / Source: '+(input||'Not selected'),'Method: '+(method||'None')+' | Mode: '+(method==='script'?(v0912ScriptMode(input)||'Custom BAT'):flashMode),'Selected script: '+(method==='script'?v09Name(input):(v0912ModeFile[flashMode]||'N/A')),'Job ID: '+operation+' | Started: '+when,'Result: '+(current?.status||'Not started'),'══════════ LIVE COMMAND OUTPUT ══════════'];
  const key=current?.id||'no-job';window.__v16DisplayedJobId=key;
  if(window.__v16ClearView!==key)v09$('v09FlashLog').textContent=info.join('\n')+'\n'+(v17LastStartError?'\n'+v17LastStartError+'\n':'')+((current?.lines||[]).slice(-1700).join('\n')||'No commands in this session yet.');
  window.__v19RenderFlashSessions?.(jobs,current);
 }
 if(activePage==='images'){
  const relevant=v09ImageJob?jobs.find(j=>j.id===v09ImageJob):jobs.filter(j=>j.kind==='Extract selected stock images'||j.kind==='Full archive unzip').sort((a,b)=>b.started.localeCompare(a.started))[0];
  if(relevant){
   const b=v09$('viewExtractedFiles');if(b){if(relevant.status==='complete'&&relevant.output_dir){b.dataset.v095Output=relevant.output_dir;b.textContent='📂 View Extracted Folder';b.disabled=false;}else if(relevant.status==='running'){delete b.dataset.v095Output;b.disabled=true;}}
   const pct=relevant.total?Math.min(100,Math.round(relevant.done/relevant.total*100)):0;
   v09$('v09ImageProgressFill').parentElement.classList.toggle('indeterminate',!relevant.total&&relevant.status==='running');
   v09$('v09ImageProgressFill').style.width=pct+'%';
   v09$('v09ImageProgressText').textContent=relevant.status.toUpperCase()+(relevant.total?' • '+pct+'%':' • calculating progress…')+' • '+(relevant.detail||'');
   const percentage=v09$('v099ProgressPercent');if(percentage)percentage.textContent=relevant.total?pct+'%':'—';
   const status=v09$('v099JobStatus');if(status)status.textContent=relevant.status.toUpperCase();
   const output=v09$('v099ExtractLog');if(output){const lines=[relevant.kind+' • '+relevant.started,...(relevant.lines||[])];if(relevant.detail)lines.push(relevant.status+': '+relevant.detail);if(relevant.output_dir)lines.push('Saved in: '+relevant.output_dir);output.textContent=lines.join('\n')}
   v09$('imageOutputNote').textContent='Source-bound stock IMG extraction; individual image hashes are recorded in the output manifest.';
  }
 }
 }catch(_){/* Never fabricate success/progress from a failed poll. */}
}
function v09SetCommandOptions(){const m=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb';const items=m==='adb'?[['devices','Connected ADB devices'],['model','Device model'],['codename','Device codename'],['firmware','Firmware build'],['android','Android version'],['brand','Device brand'],['battery','Battery information'],['slot','Boot slot suffix'],['hardware','Hardware identifier'],['fingerprint','OS build fingerprint'],['packages','Installed packages']]:[['devices','Connected Fastboot devices'],['product','Product codename'],['slot','Active slot'],['unlocked','Bootloader unlocked status'],['anti','Anti-rollback index'],['is-userspace','FastbootD status'],['slot-count','Slot count'],['secure','Secure flag'],['recovery-size','Recovery partition size'],['boot-size','Boot partition size'],['boot-has-slot','Boot slot support'],['system-has-slot','System slot support'],['super-size','Super partition size'],['super-type','Super partition type']];v09$('v09CommandChoice').replaceChildren(...items.map(([value,label])=>{const el=document.createElement('option');el.value=value;el.textContent=label;return el}))}
async function v09CommandRun(){const mode=document.querySelector('input[name="v09CmdMode"]:checked')?.value||'adb',command=v09$('v09CommandChoice').value;const out=v09$('v09CommandResult');out.textContent='Checking connected '+mode+' phone…';try{const r=await api('/api/commands/run',{mode,command});out.textContent=(r.command||command)+'\nDevice: '+(r.device||'Unknown')+'\n\n'+(r.result||'[command completed; no output]')}catch(e){out.textContent='Command blocked or failed: '+e.message}}
function v096ShowTelegramEmpty(channel,message){
 const card=document.createElement('article');card.className='v096-telegram-empty';
 const title=document.createElement('strong');title.textContent='@'+channel;
 const note=document.createElement('p');note.textContent=message;
 const button=document.createElement('button');button.className='btn primary';button.textContent='Open Channel ↗';button.onclick=()=>v09TelegramOpen();
 card.append(title,note,button);v09$('v09TelegramPosts').append(card);
}
let v092TelegramRequest=0;
let v0937TelegramStartedAt=0, v0937TelegramLastAutoAt=0, v0937TelegramInFlight=false;
function v0937TelegramInterval(){return v0937TelegramStartedAt&&Date.now()-v0937TelegramStartedAt<180000?3000:60000;}
const v0913TelegramHashes=Object.create(null);
async function v09TelegramPosts(auto=false){
 if(auto&&v0937TelegramInFlight)return;
 const channel=v09$('v09TelegramSelect').value, request=++v092TelegramRequest;
 if(auto){v0937TelegramInFlight=true;v0937TelegramLastAutoAt=Date.now();}
 if(!auto){v09$('v09TelegramStatus').textContent='Fetching up to 30 public posts from @'+channel+'…';v09$('v09TelegramPosts').replaceChildren();}
 try{const r=await api('/api/telegram/posts',{channel});if(request!==v092TelegramRequest)return;
  const posts=r.posts||[],signature=JSON.stringify(posts.map(p=>[p.id,p.photo,p.text,p.date]));
  const status=(r.cached?'CACHED • ':'')+'@'+channel+' • '+posts.length+' available public posts'+(r.warning?' • '+r.warning:'')+' • Last refresh: '+new Date().toLocaleTimeString()+' • Auto every '+(v0937TelegramInterval()/1000)+'s';
  if(auto&&signature===v0913TelegramHashes[channel]&&v09$('v09TelegramPosts').childElementCount){v09$('v09TelegramStatus').textContent=status;return}
  v0913TelegramHashes[channel]=signature;
  v09$('v09TelegramPosts').replaceChildren();v09$('v09TelegramStatus').textContent=status;
  for(const p of posts){const card=document.createElement('article');card.className='v09-telegram-card';
   if(p.photo&&/^https:\/\/[^\s]+$/.test(p.photo)){const img=document.createElement('img');img.src=p.photo;img.loading='lazy';img.alt='Public Telegram post media';
    img.onerror=()=>{if(img.dataset.retried)return;img.dataset.retried='1';const retryURL=new URL(p.photo);retryURL.searchParams.set('tech_retry','1');img.src=retryURL.href;};card.append(img)}
   const d=document.createElement('time');d.className='muted small';d.textContent=p.date||'Date unavailable';
   const txt=document.createElement('p');txt.textContent=p.text||'Media post';
   const b=document.createElement('button');b.className='btn tiny';b.textContent='Open Original Post ↗';b.onclick=()=>api('/api/telegram/open',{channel,post_id:p.id}).catch(e=>toast(e.message,'error'));
   card.append(d,txt,b);v09$('v09TelegramPosts').append(card)}
  if(!posts.length){
   v09$('v09TelegramStatus').textContent='Telegram did not expose public posts for @'+channel+'. You can retry or open the channel.';
   v096ShowTelegramEmpty(channel,'No accessible public post preview was returned. Posts are never fabricated.');
  }
 }catch(e){if(request===v092TelegramRequest){
   v09$('v09TelegramStatus').textContent='Public preview refresh failed for @'+channel+': '+e.message+' • Previous posts retained when available';
   if(!auto||!v09$('v09TelegramPosts').childElementCount)v096ShowTelegramEmpty(channel,'Network request or Telegram public preview failed. Open the original channel or try Refresh Posts.');
 }}finally{if(auto)v0937TelegramInFlight=false;}
}
async function v09TelegramOpen(postId=''){const channel=v09$('v09TelegramSelect').value;try{await api('/api/telegram/open',{channel,post_id:postId})}catch(e){toast(e.message,'error')}}
async function v09ExtractImages(all){
 if(!imgCatalog?.source || imgCatalog.source!==v09$('imageSourcePath').value.trim() || !imgCatalog.scan_token){v09ResetImages();toast('Source changed or scan expired. Click Scan Images again.','error');return}
 const selected=all?[]:[...document.querySelectorAll('#imageList input[type="checkbox"]:checked')].map(x=>x.dataset.image);
 if(!all&&!selected.length){toast('Select at least one supported IMG.','error');return}
 const method=document.querySelector('input[name="v09ImageDestination"]:checked')?.value||'auto';
 let destination='';if(method==='manual'){destination=await chooseWindowsPath('directory');if(!destination)return}
 if(!await modal('Extract Stock IMG Files',warnBody(['Source: '+v09Name(imgCatalog.source),'Images: '+(all?'All supported':selected.join(', ')),'Output: '+(destination?destination+'\\Tech_Office_Yt_Xiaomi_Service':'Downloads/Tech_Office_Yt_Xiaomi_Service (Auto)'), 'Extraction does not flash or modify any phone.']),{accept:'Extract Images',danger:false}))return;
 try{const job=await api('/api/images/extract',{path:imgCatalog.source,images:selected,all,destination,scan_token:imgCatalog.scan_token});v09ImageJob=job.id||'';const open=v09$('viewExtractedFiles');if(open){open.disabled=true;delete open.dataset.v095Output;}v09$('v09ImageProgressText').textContent='Extracting selected IMG files — current stage and progress below…';
 const fill=v09$('v09ImageProgressFill');fill.style.width='0%';fill.parentElement.classList.add('indeterminate');
 const pct=v09$('v099ProgressPercent');if(pct)pct.textContent='—';
 const status=v09$('v099JobStatus');if(status)status.textContent='EXTRACTING';
 const log=v09$('v099ExtractLog');if(log)log.textContent='EXTRACT IMG STARTED: '+imgCatalog.source+'\nSelected: '+(all?'All supported':selected.join(', '))+'\nStaging / reconstruction progress will update here.';
 toast('IMG extraction started. Watch the shared log.','info')}
 catch(e){v09$('v09ImageProgressText').textContent='Extraction blocked: '+e.message;toast(e.message,'error')}
}
let v09ImageJob='';
const v09OldLinkROM=linkROMToExtractor;
linkROMToExtractor=function(path){if(!path)return v09OldLinkROM(path);v09OldLinkROM(path);v09LastImageSource=path;v09ResetImages();v09$('v09ImageSource').textContent='Selected ROM: '+v09Name(path)+' — scan required';};
async function v09ManualRootFlash(){const text=v09$('v09ManualFlashCommand').value.trim(),match=/^fastboot\s+flash\s+(init_boot|recovery)(?:\s+(?:\[selected IMG\]|<selected-img>))?$/i.exec(text);
 if(!match){toast('Manual command must be: fastboot flash init_boot (or recovery). Tool automatically uses the selected IMG. Other partitions are not verified for this testing build.','error');return}
 const part=match[1].toLowerCase(),path=v09$('patchedPath').value.trim();if(!path){toast('Choose patched image first.','error');return}
 await v09RootScan();if(device.mode!=='fastboot'||device.bootloader!=='UNLOCKED'){toast('Verified unlocked Fastboot device required.','error');return}
 return flashImage(path,part,'FLASH '+part);
}
async function v09RootScan(){await scanDevice();const e=v09$('v09RootState');if(e)e.textContent='Detected: '+(device.model||'Unknown')+' • '+(device.codename||'Unknown')+' • '+(device.mode||'unknown')+' • Bootloader: '+(device.bootloader||'UNKNOWN')+'. Verified root method depends on exact firmware, not a guess.'}
async function v09RootFlash(){const path=v09$('patchedPath').value.trim(),partition=v09$('rootPartition').value;
 if(!path){toast('Select a patched IMG first.','error');return}
 await v09RootScan();if(device.mode!=='fastboot'||device.bootloader!=='UNLOCKED'){toast('Verify unlocked Fastboot phone first.','error');return}
 // Re-use backend verified, serial-scoped Fastboot flashing path. No manual phrase entry.
 return flashImage(path,partition,'FLASH '+partition);
}
function v09ResetImages(){imgCatalog=null;v09$('imageList').innerHTML='<div class="empty-placeholder">New ROM selected — click Scan Images.</div>';v09$('imageCount').textContent='Scan required';v09$('imageDetails').textContent='';v09$('v09ImageSource').textContent='Source ROM: Not scanned';}
async function v09ScanImages(){const source=v09$('imageSourcePath').value.trim();if(imgCatalog?.source!==source)v09ResetImages();v09$('v09ImageSource').textContent='Scanning source ROM: '+v09Name(source);await discoverImages();if(imgCatalog?.source && imgCatalog.source!==v09$('imageSourcePath').value.trim()){v09ResetImages();return}if(imgCatalog?.source)v09$('v09ImageSource').textContent='Images belong to: '+v09Name(imgCatalog.source)+'  |  Source: '+imgCatalog.source}
function v09Language(){const line=v09$('v09DonationLine');if(line)line.textContent=v09$('languageSelect').value==='hi'?'♥ आपका सहयोग नए उपयोगी टूल, अपडेट और वीडियो गाइड बनाने की प्रेरणा देता है। हर योगदान मायने रखता है। धन्यवाद!':'♥ Your support motivates us to build useful tools, updates and video guides. Every contribution matters. Thank you for supporting Tech Office!'}
document.addEventListener('DOMContentLoaded',()=>{
 v09SyncSources();v09FastbootStatus();document.getElementById('flashExtractImages')?.remove();
 for(const [id,kind,picker] of [['browseROM','tgz','rom'],['browseFolder','folder','directory'],['browseImagesFlash','images','directory'],['browseScript','script','script']])v09$(id).onclick=()=>v09Browse(kind,picker);
 v09$('v092OpenROM').onclick=async()=>{if(!v092StageOutput)return;try{await api('/api/stock/open-stage',{path:v092StageOutput});toast('Windows Explorer was asked to open the extracted ROM folder. Check the taskbar if hidden.','info')}catch(e){toast(e.message,'error')}};
 v09$('v100DeleteROM').onclick=async()=>{
   if(!v09StageJob||!v100StageSource||!v092StageOutput)return;
   if(['extracting','verifying','flashing'].includes(v100Phase))return;
   const ok=await modal('Delete Extracted ROM Files?',warnBody(['Only the output folder from this completed TGZ extraction will be removed.','Original TGZ will NOT be deleted.','Saved ROM folder: '+v092StageOutput,'You cannot restore the extracted files without extracting the TGZ again.']),{accept:'DELETE EXTRACTED FILES',danger:true});
   if(!ok)return;
   try{await api('/api/stock/delete-stage',{stage_id:v09StageJob,archive_path:v100StageSource,confirm:'DELETE EXTRACTED ROM'});v100ResetStage();toast('Extracted folder deleted; original TGZ kept.','success')}
   catch(e){toast('Cleanup denied: '+e.message,'error')}
 };

 v09$('v0912SelectMapped').onclick=()=>{document.querySelectorAll('#v09ImagesSummary input[data-flash-img]').forEach(x=>x.checked=true);v0912UpdateCount()};
 v09$('v0912ClearSelection').onclick=()=>{document.querySelectorAll('#v09ImagesSummary input[data-flash-img]').forEach(x=>x.checked=false);v0912UpdateCount()};
 v09$('v0912FlashSelected').onclick=v0914FlashImages;
 v09$('refreshFastbootDevice').onclick=v09Refresh;v09$('v09MainFlash').onclick=v09Flash;v09$('stageTGZ').onclick=v09Stage;
 document.querySelectorAll('input[name="flashSourceMethod"]').forEach(x=>x.addEventListener('change',()=>{v100ResetStage();v100PhaseUI('select');verifiedFlashPlan=null;v0912UpdateScriptHint()}));v09$('v09GoImages').onclick=()=>linkROMToExtractor(selectedFlashSources[v09FlashRadio()]||v09$('romPath').value.trim());
 v09$('inspectROM').onclick=async()=>{const path=selectedFlashSources[v09FlashRadio()]||'';if(!path){toast('Choose ROM source first.','error');return}v09$('romPath').value=path;return inspectROM()};
 v09$('imageSourcePath').addEventListener('input',()=>{
     if(imgCatalog && imgCatalog.source !== v09$('imageSourcePath').value.trim())v09ResetImages();
 });
 v09$('scanImages').onclick=v09ScanImages;
 for(const id of ['browseImageSource','browseImageFolder']){const old=v09$(id).onclick;v09$(id).onclick=async()=>{if(old)await old();if(v09$('imageSourcePath').value.trim()!==v09LastImageSource){v09LastImageSource=v09$('imageSourcePath').value.trim();v09ResetImages()}}}
 v09$('v09RootRefresh').onclick=v09RootScan;v09$('flashPatched').onclick=v09RootFlash;v09$('v09ManualRootFlash').onclick=v09ManualRootFlash;
 v09$('imgExtractSelected').onclick=()=>v09ExtractImages(false);v09$('imgExtractAll').onclick=()=>v09ExtractImages(true);
 v09$('v09CmdScan').onclick=async()=>{await scanDevice();v09$('v09CmdDevice').textContent=(device.model||'Unknown')+' • '+(device.mode||'Unknown')};
 document.querySelectorAll('input[name="v09CmdMode"]').forEach(x=>x.onchange=v09SetCommandOptions);v09SetCommandOptions();v09$('v09CommandRun').onclick=v09CommandRun;v09$('v09CommandCopy').onclick=()=>{const mode=document.querySelector('input[name="v09CmdMode"]:checked').value;const cmd=v09$('v09CommandChoice').value;const commands={devices:'devices -l',model:'shell getprop ro.product.model',codename:'shell getprop ro.product.device',firmware:'shell getprop ro.build.version.incremental',android:'shell getprop ro.build.version.release',brand:'shell getprop ro.product.brand',battery:'shell dumpsys battery',slot:'shell getprop ro.boot.slot_suffix',hardware:'shell getprop ro.boot.hardware',fingerprint:'shell getprop ro.build.fingerprint',packages:'shell pm list packages'};const fb={devices:'devices',product:'getvar product',slot:'getvar current-slot',unlocked:'getvar unlocked',anti:'getvar anti','is-userspace':'getvar is-userspace','slot-count':'getvar slot-count',secure:'getvar secure','recovery-size':'getvar partition-size:recovery','boot-size':'getvar partition-size:boot','boot-has-slot':'getvar has-slot:boot','system-has-slot':'getvar has-slot:system','super-size':'getvar partition-size:super','super-type':'getvar partition-type:super'};const args=mode==='fastboot'?fb[cmd]:commands[cmd];if(!args){toast('Unsupported read-only command','error');return}const value=mode+' '+args;navigator.clipboard.writeText(value).then(()=>toast('Copied: '+value,'success')).catch(()=>toast('Clipboard unavailable','error'))};
 v09$('v09TelegramRefresh').onclick=v09TelegramPosts;v09$('v09TelegramOpen').onclick=()=>v09TelegramOpen();
 v09$('v09TelegramSelect').onchange=v09TelegramPosts;
 document.querySelectorAll('input[name="v09FlashMode"]').forEach(x=>x.onchange=async()=>{verifiedFlashPlan=null;v100PreparedPlan=null;const method=v09FlashRadio();v0912UpdateScriptHint();if(method==='tgz'&&v09StageJob&&v09ResolvedRoot&&!v0912FlashBusy)v100PhaseUI('ready');if(method==='images'&&selectedFlashSources.images)v09ListImages(selectedFlashSources.images);});
 v100PhaseUI('select');v0912UpdateScriptHint();

 v09$('languageSelect').addEventListener('change',v09Language);v09Language();
 setInterval(v09Jobs,1600);
 // Auto-refresh only while the preview is in use; respect Telegram load and keep the old feed when unchanged.
 setInterval(()=>{
  if(activePage!=='telegram'||document.visibilityState==='hidden'||!v0937TelegramStartedAt||v0937TelegramInFlight)return;
  const interval=v0937TelegramInterval();
  if(Date.now()-v0937TelegramLastAutoAt>=interval)void v09TelegramPosts(true);
 },3000);
});

// Load selected public channel on first opening of the Service Desk preview.
let v092TelegramFirstOpen=false;
const v092PreviousNavigate=navigate;
navigate=function(page){v092PreviousNavigate(page);if(page==='telegram'&&!v092TelegramFirstOpen){v092TelegramFirstOpen=true;v0937TelegramStartedAt=Date.now();v0937TelegramLastAutoAt=Date.now();v09TelegramPosts()}};
