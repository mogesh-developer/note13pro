/* V0.7 foreground workflows, scoped flash method selection, donations.
   Never execute third-party scripts directly or bypass device preflight. */
'use strict';
const selectedFlashSources={tgz:'',folder:'',images:'',script:''};
function selectedPath(kind){return selectedFlashSources[kind]||''}
async function chooseWindowsPath(kind){
 try{const r=await api('/api/browse',{kind});if(!r.path){toast('Selection cancelled. No action started.','info');return ''}return r.path}
 catch(e){toast('Could not open file picker: '+e.message,'error');return ''}
}
function flashFileName(path){return String(path||'').split(/[\\/]/).pop()}
async function stageWithDestination(path){
 if(!/\.(?:tgz|tar\.gz)$/i.test(path)){toast('Select a complete stock Fastboot TGZ/TAR.GZ archive first.','error');return null}
 const folder=await chooseWindowsPath('directory');if(!folder)return null;
 const ok=await modal('Choose Fastboot ROM extraction destination',warnBody([
 'Selected ROM: '+path,'Extract into: '+folder,
 'A single new ROM subfolder will be created in this location. Check available disk space (Fastboot ROMs may require many GB).',
 'No phone partitions will be changed. Extraction will only begin after you confirm.'
 ]),{accept:'Extract Here',danger:false});if(!ok)return null;
 try{const job=await api('/api/stock/stage',{path,destination:folder});toast('ROM extraction started in the chosen location. Check Fastboot Activity below.','info');refreshEmbeddedLogs();return job}
 catch(e){toast('Extraction failed: '+e.message,'error');return null}
}
function setSourceBadge(){
 const n=document.getElementById('flashSelectedSources');if(!n)return;
 const entries=Object.entries(selectedFlashSources).filter(([,path])=>path);
 n.textContent=entries.length?entries.map(([kind,path])=>kind.toUpperCase()+': '+flashFileName(path)).join('  •  '):'No ROM source selected yet.';
}
async function chooseFlashInput(kind,picker){
 const path=await chooseWindowsPath(picker);if(!path)return;
 selectedFlashSources[kind]=path;
 if(kind==='script')$('scriptPath').value=path;
 else $('romPath').value=path;
 setSourceBadge();verifiedFlashPlan=null;
 
 toast(kind.toUpperCase()+' source selected: '+flashFileName(path),'success');
}
function sourceChoices(){
 const p=$('romPath').value.trim();let candidates={...selectedFlashSources};
 if(p&&!Object.values(candidates).includes(p)){
  if(/\.(?:tgz|tar\.gz)$/i.test(p))candidates.tgz=p;
  else if(/[\\/]images$/i.test(p))candidates.images=p;
  else candidates.folder=p;
 }
 if($('scriptPath').value.trim())candidates.script=$('scriptPath').value.trim();
 return Object.entries(candidates).filter(([,v])=>v)
}
async function finalFlashMethodChoice(mode){
 const choices=sourceChoices();if(!choices.length){toast('Select an original TGZ, extracted folder, images folder or flash script.','error');return false}
 const dialog=document.createElement('div');
 const lead=document.createElement('p');lead.className='danger-text';lead.textContent='Select exactly ONE flashing method. Other selected sources will NOT be executed.';dialog.append(lead);
 const devicePara=document.createElement('p');devicePara.textContent='Connected device: '+(device.model||'Unknown')+' / '+(device.codename||'Unknown')+' • Firmware region: '+(device.region||'Unknown')+' • Flash mode: '+mode;dialog.append(devicePara);
 const names={tgz:'ROM archive (TGZ / ZIP) — ZIP requires method analysis',folder:'Extracted Fastboot ROM Folder — verified ROM script',images:'IMG Files Folder — validated script/partition plan required',script:'Selected Flash Script — restricted safe-command parser'};
 let choice='';
 for(const [kind,path] of choices){const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;padding:9px;margin:6px 0;background:#222e47;border-radius:7px;align-items:flex-start';
  const input=document.createElement('input');input.type='radio';input.name='flashMethodFinal';input.value=kind;if(!choice){choice=kind;input.checked=true}input.onchange=()=>choice=kind;
  const block=document.createElement('div');const title=document.createElement('strong');title.textContent=names[kind]||kind;const item=document.createElement('small');item.style.cssText='display:block;overflow-wrap:anywhere;color:#b7cae5';item.textContent=path;block.append(title,item);label.append(input,block);dialog.append(label);
 }
 const caution=document.createElement('p');caution.textContent='Final flashing still requires device codename, firmware region, partition, bootloader and rollback verification. Flash All & Lock is blocked unless independently proven safe.';dialog.append(caution);
 const ok=await modal('⚠ Choose ONE flashing method',dialog,{accept:'Use Selected Method',danger:true});if(!ok)return false;
 const target=Object.fromEntries(choices)[choice];if(!target){toast('No valid flashing method selected.','error');return false}
 if(choice==='tgz'){if(/\.zip$/i.test(target)){toast('This Fastboot source needs a TGZ archive, not a Recovery ZIP.','error');return false}$('romPath').value=target;$('scriptPath').value='';await stageWithDestination(target);return false}
 if(choice==='script'){$('scriptPath').value=target;$('romPath').value=target.replace(/[\\/][^\\/]+$/,'')}
 else {$('romPath').value=target;$('scriptPath').value=''}
 verifiedFlashPlan=null;toast('Selected '+choice+' method only; preparing verified flash plan.','info');return true;
}
function linkROMToExtractor(path){if(!path){toast('Select ROM file first.','error');return}
 $('imageSourcePath').value=path;imgCatalog=null;navigate('images');$('imageDetails').textContent='ROM handover: '+path+' — click Scan Images to inspect direct and payload partitions.';toast('ROM transferred to image extractor. No extraction or flash was started.','info')}

// Override archive enumeration after V0.6 startup; payload entries are now selectable when supported.
const legacyDiscover=discoverImages;
discoverImages=async function(){const path=$('imageSourcePath').value.trim();if(!path){toast('Select ZIP/TGZ/payload.bin or extracted ROM folder first.','error');return}
 try{imgCatalog=await api('/api/images/list',{path});const entries=imgCatalog.entries||[];
  const supported=entries.filter(e=>e.type==='img'||e.type==='payload-partition');
  setText('imageCount',supported.length+' extractable image(s) / '+entries.length+' entries');
  setText('imageDetails','Device: '+imgCatalog.codename+' • OS: '+imgCatalog.version+' • Region: '+imgCatalog.region_name+'\n'+(imgCatalog.warnings||[]).join('\n'));
  $('imageList').replaceChildren();for(const entry of entries){const row=document.createElement('label');row.className='image-row';const box=document.createElement('input');box.type='checkbox';box.dataset.image=entry.name;box.disabled=!(entry.type==='img'||entry.type==='payload-partition');
   const desc=document.createElement('div');const title=document.createElement('strong');title.textContent=entry.name;const sub=document.createElement('div');sub.className='pkg-detail';sub.textContent=entry.type+' • '+entry.path+' • '+(entry.size/1048576).toFixed(2)+' MB';desc.append(title,sub);row.append(box,desc);$('imageList').append(row)}
  if(!entries.length)$('imageList').textContent='No matching partition images or payload entries found.';
  toast('Detected '+supported.length+' extractable image(s). Unsupported/delta operations remain disabled.','info');
 }catch(e){toast('IMG scan: '+e.message,'error')}
};
extractImages=async function(all){if(!imgCatalog){toast('Scan selected ROM first.','error');return}
 const names=all?[]:qsa('#imageList input[type="checkbox"]:checked').map(x=>x.dataset.image);if(!all&&!names.length){toast('Select supported images first.','error');return}
 const destination=await chooseWindowsPath('directory');if(!destination)return;
 const msg=warnBody(['ROM source: '+imgCatalog.source,'Output parent folder: '+destination,all?'Extract ALL SUPPORTED available partitions. Unsupported incremental/XZ images will be excluded.':'Selected images: '+names.join(', '),'A single device/build/region folder will be created. Files are never flashed during extraction.']);
 if(!await modal('Confirm Extract Stock IMG Files',msg,{accept:'Start Extraction',danger:false}))return;
 try{await api('/api/images/extract',{path:imgCatalog.source,images:names,all,destination});setText('imageOutputNote','Extraction started in '+destination+' (see this tab\'s activity log).');toast('Extraction started. Output shown here when complete.','success');refreshEmbeddedLogs()}
 catch(e){toast('Extraction could not start: '+e.message,'error')}
};
viewExtracted=async function(){try{
 const data=await api('/api/jobs');const latest=(data.jobs||[]).filter(j=>j.kind==='Extract selected stock images'&&j.status==='complete'&&j.output_dir).sort((a,b)=>b.started.localeCompare(a.started))[0];
 if(!latest){toast('No completed image extraction in this session.','info');return}
 await api('/api/images/view',{path:latest.output_dir,folder:true});toast('Requested Windows Explorer to open the completed output folder.','info')
 }catch(e){toast(e.message,'error')}
};

// Never expose unrelated session logs on flash/recovery operation cards.
document.addEventListener('DOMContentLoaded',()=>{
 const flashParent=$('romPath').closest('.panel');const helper=document.createElement('div');helper.id='flashSelectedSources';helper.className='footnote';helper.textContent='No ROM source selected yet.';flashParent?.append(helper);
 const description=document.createElement('div');description.className='footnote';description.textContent='Archive = original .tgz; ROM folder = extracted package root; IMG folder = images subfolder; script = a .bat/.sh with verified device-specific steps. Multiple selected inputs are never flashed together.';flashParent?.append(description);
 $('browseROM').onclick=()=>chooseFlashInput('tgz','rom');
 $('browseFolder').onclick=()=>chooseFlashInput('folder','directory');
 $('browseImagesFlash').onclick=()=>chooseFlashInput('images','directory');
 $('browseScript').onclick=()=>chooseFlashInput('script','script');
 $('refreshFastbootDevice').onclick=async()=>{await scanDevice();verifiedFlashPlan=null;setText('selectedFlashMode','Device refreshed — recheck compatibility');toast('Device details refreshed. Rebuild the flash plan before flashing.','info')};
 const transfer=document.createElement('button');transfer.className='btn';transfer.id='flashExtractImages';transfer.textContent='▤ Extract Images →';$('stageTGZ').after(transfer);
 transfer.onclick=()=>linkROMToExtractor($('romPath').value.trim()||selectedFlashSources.tgz||selectedFlashSources.folder);
 $('stageTGZ').onclick=()=>stageWithDestination(selectedFlashSources.tgz||$('romPath').value.trim());
 const oldPlan=makeFlashPlan;
 makeFlashPlan=async function(mode=selectedStockMode){const p=$('romPath').value.trim();if(/\.(?:tgz|tar\.gz)$/i.test(p)){await stageWithDestination(p);return null}const result=await oldPlan(mode);if(result){$('flashPlanReport').hidden=false}return result};
 const oldBegin=beginFlashAll;
 beginFlashAll=async function(mode='clean'){const selected=await finalFlashMethodChoice(mode);if(!selected)return;return oldBegin(mode)};
 $('prepareFlashPlan').onclick=async()=>{if(!$('flashPlanReport').hidden){$('flashPlanReport').hidden=true;toast('Flash plan hidden; validation state preserved.','info')}else{await makeFlashPlan(selectedStockMode)}};
 let scriptOpen=false;$('inspectScript').onclick=async()=>{if(scriptOpen){$('scriptReport').hidden=true;scriptOpen=false;$('inspectScript').textContent='Show Script Steps ▾';return}
 await previewFlashScript();$('scriptReport').hidden=false;scriptOpen=true;$('inspectScript').textContent='Hide Script Steps ▴'};
 $('telegramMenu').onclick=()=>{const box=$('telegramChannelMenu');box.hidden=!box.hidden;$('telegramMenu').setAttribute('aria-expanded',String(!box.hidden))};
 document.addEventListener('click',evt=>{if(!evt.target.closest('.channel-dropdown')){$('telegramChannelMenu').hidden=true;$('telegramMenu').setAttribute('aria-expanded','false')}});
 document.querySelectorAll('.social-menu-link').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer'});
 $('copyUPI').onclick=async()=>{try{await navigator.clipboard.writeText('techofficee@apl');toast('UPI ID copied.','success')}catch(e){toast('Clipboard unavailable — copy manually.','error')}};
 $('copyBinance').onclick=async()=>{try{await navigator.clipboard.writeText('1135611756');toast('Binance ID copied.','success')}catch(e){toast('Clipboard unavailable — copy manually.','error')}};
});
