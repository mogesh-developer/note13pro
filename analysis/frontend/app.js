/* Tech Office Yt Xiaomi Service — local-only UI. No external JavaScript dependencies. */
'use strict';
const TOKEN = document.querySelector('meta[name="csrf-token"]').content;
let device = {mode:'disconnected',bootloader:'UNKNOWN',codename:''};
let isPreview = false;
let activePage = 'dashboard';
let cfg = {};
let archiveLink = 'https://mifw.net/devices';
let showSerial = false; let lastSerial = null; let lang = 'en';
const $ = id => document.getElementById(id);
const qsa = sel => [...document.querySelectorAll(sel)];
function setText(id,value){$(id).textContent = value === undefined || value === null || value === '' ? '—' : String(value)}
function status(message){setText('footerStatus',message)}
async function rawAPI(path,payload={}){
 let res;
 try{res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-TechOffice-Token':TOKEN},body:JSON.stringify(payload),cache:'no-store'});}catch(e){throw Error('Local app connection unavailable: '+e.message)}
 let data;try{data=await res.json()}catch(_){throw Error('Unexpected local response (HTTP '+res.status+')')}
 if(!res.ok)throw Error(data.error || 'Request failed ('+res.status+')');return data;
}
// Long read-only requests use the same existing header BACKGROUND; all actual
// flash/extraction jobs are still tracked by the server's /api/jobs endpoint.
let trackedRequestSequence=0;
async function api(path,payload={}){
 const track=/^\/api\/(?:scan$|inspect$|reboot$|commands\/(?:run|manual)$|stock\/(?:plan|staged-plan|stage-roots|script-modes|images-preview|image-batch-plan|stage|flash)$|archive\/inspect$|updates$|firmware\/(?:find|search|live)$)/.test(path);
 if(!track)return rawAPI(path,payload);
 const id=++trackedRequestSequence;
 let started=false;
 const timer=setTimeout(()=>{started=true;window.dispatchEvent(new CustomEvent('tech-office-request-start',{detail:{id,path}}))},450);
 let ok=false;
 try{const result=await rawAPI(path,payload);ok=true;return result}
 finally{clearTimeout(timer);if(started)window.dispatchEvent(new CustomEvent('tech-office-request-end',{detail:{id,path,ok}}))}
}
function toast(message,kind='info'){
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=message; $('toastRoot').append(el);
 setTimeout(()=>el.remove(),6900);
}
function navigate(page){
 if(!$("page-"+page))return;
 activePage=page;qsa('.page').forEach(e=>e.classList.toggle('shown',e.id==='page-'+page));
 qsa('.nav').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
 $('sidebar').classList.remove('mobile-open');window.scrollTo({top:0,behavior:'smooth'});
 if(page==='activity')refreshLogs();if(page==='downloads'&&window.v28RefreshDownloads)window.v28RefreshDownloads();if(page==='root')updateRootRule();if(page==='settings'){fillSettings();refreshLicense()}
}
// Public navigation hook used by the customer activation start gate.
window.navigate = navigate;
function infoDialog(title,text){
 return modal(title, text,{accept:'OK',cancel:null,danger:false});
}
function modal(title,content,options={}){
 return new Promise(resolve=>{
  $('modalTitle').textContent=title;$('modalContent').replaceChildren();
  if(typeof content==='string'){
   const p=document.createElement('p');p.textContent=content;$('modalContent').append(p);
  }else if(content instanceof Node){$('modalContent').append(content)}
  $('modalAccept').textContent=options.accept || 'Continue';
  $('modalAccept').className='btn '+(options.danger===false?'primary':'danger');
  $('modalCancel').style.display=options.cancel===null?'none':'inline-flex';
  $('modalCancel').textContent=options.cancel || 'Cancel';
  $('modalShell').classList.remove('hidden');
  document.querySelector('.modal').classList.toggle('danger-modal',options.danger !== false);
  const finish=v=>{$('modalShell').classList.add('hidden');document.querySelector('.modal').classList.remove('danger-modal');$('modalAccept').onclick=null;$('modalCancel').onclick=null;$('modalClose').onclick=null;resolve(v)};
  $('modalAccept').onclick=()=>finish(true);$('modalCancel').onclick=()=>finish(false);$('modalClose').onclick=()=>finish(false);
 });
}
function warnBody(paragraphs){const node=document.createElement('div');for(const text of paragraphs){const p=document.createElement('p');p.textContent=text;node.append(p)}return node}
function setDevice(d){
 device=d||{};const demo=!!d.demo;isPreview=demo;
 if(lastSerial!==d.serial){showSerial=false;lastSerial=d.serial||null;}
 setText('statConnection',demo?'UI PREVIEW':(d.mode||'disconnected').toUpperCase());
 const boot=String(d.bootloader||'UNKNOWN');const status=boot.startsWith('UNLOCKED')?'UNLOCKED':boot.startsWith('LOCKED')?'LOCKED':'UNKNOWN';
 setText('statBootloader',demo?'DEMO ONLY':status);
 $('statBootloader').className='stat-value boot-status '+(status==='UNLOCKED'?'success':status==='LOCKED'?'failed':'unknown');
 setText('bootVerification',demo?'Demo information':(boot.includes('reported by OS')?'OS-reported • verify with Fastboot':status==='UNKNOWN'?'Not verified • Fastboot scan required':'Fastboot verified'));
 setText('statDevice',d.codename&&d.codename!=='Unknown'?d.codename:'Unknown');
 const connected=!demo&&['device','fastboot','sideload','recovery'].includes(String(d.mode||'').toLowerCase())&&!d.error;const sideName=connected?((d.model&&d.model!=='Fastboot device (ADB info unavailable)'?d.model:d.codename)||'Device detected'):(demo?'Demo / No physical phone':'Not connected');setText('sidebarDetected',(connected?'●  ':demo?'◉  ':'○  ')+sideName);$('sidebarDetected').classList.toggle('device-disconnected',!connected);
 setText('deviceMode',demo?'DEMO':(d.mode||'disconnected').toUpperCase());
 setText('modelName',d.model&&d.model!=='Fastboot device (ADB info unavailable)'?d.model:'Unknown');
 setText('heroDescription',demo?'Sample only • no physical phone connected':(d.authorized?'Connected with device authorization':(d.notes||[])[0]||'No real Android device detected'));
 const regionName=r=>({CNXM:'China',INXM:'India',MIXM:'Global',EUXM:'Europe (EEA)',IDXM:'Indonesia',RUXM:'Russia',TRXM:'Turkey',TWXM:'Taiwan',JPXM:'Japan'})[r]||'Unknown';
 const fields=[['Brand',d.brand],['Codename',d.codename],['Firmware',d.firmware],['Android',d.android],['ROM Region',d.region?regionName(d.region)+' ('+d.region+')':'Unknown'],['Device Serial',d.serial],['Active Slot',d.slot],['Battery',d.battery],['Root Status',d.root],['Battery Temperature',d.battery_temperature||'Not Available'],['Charging Status',d.battery_charging||'Not Available'],['Battery Health',d.battery_health||'Not Available'],['Total RAM',d.ram_total||'Not Available'],['Available RAM',d.ram_available||'Not Available'],['Total Storage',d.storage_total||'Not Available'],['Free Storage',d.storage_available||'Not Available'],['Processor',d.cpu_model||'Not Available'],['Security Patch',d.security_patch||'Not Available'],['HyperOS / MIUI',d.hyperos_version||'Not Available'],['Build Fingerprint',d.fingerprint]];
 $('deviceFields').replaceChildren(...fields.map(([label,val])=>{const div=document.createElement('div');const s=document.createElement('span');s.textContent=label;const b=document.createElement('strong');b.textContent=val||'Unknown';div.append(s,b);
 if(label==='Device Serial'){div.className='serial-field';b.textContent=showSerial?(d.serial||'Unknown'):'••••••••';const button=document.createElement('button');button.className='btn tiny';button.type='button';button.textContent=showSerial?'Hide':'Show';button.setAttribute('aria-label','Toggle device serial visibility');button.onclick=()=>{showSerial=!showSerial;setDevice(device)};div.append(button)}return div}));
 if(d.codename&&d.codename!=='Unknown')$('firmwareCode').value=d.codename;
 if(d.region&&[...$('firmwareRegion').options].some(o=>o.value===d.region))$('firmwareRegion').value=d.region;
 setText('rebootMode',demo?'DEMO ONLY':(d.mode||'not connected').toUpperCase());
 setText('rootDeviceName',d.model&&d.model!=='Fastboot device (ADB info unavailable)'?d.model:'Unknown');
 updateRootRule();
}
async function scanDevice(){status('Scanning ADB / Fastboot...');$('scanDevice').disabled=true;
 try{const response=await api('/api/scan');setDevice(response.device);const x=response.device;if(x.mode==='disconnected')toast('No device found. See USB debugging guide.', 'info');else if(x.mode==='multiple')toast('More than one phone connected: disconnect extras.','error');else toast(x.mode.toUpperCase()+': '+(x.model||x.codename)+' detected','success');if(response.errors&&response.errors.length)toast(response.errors[0],'error');}
 catch(e){toast(e.message,'error')}finally{$('scanDevice').disabled=false;status('Ready • click a feature on the left')}
}
function updateRootRule(){
 const d=device;
 if(d.codename==='onyx'){$('rootRule').textContent=(d.model||'Detected device')+' (onyx): init_boot.img (supported method; matching build required)';$('rootPartition').value='init_boot';}
 else if(d.codename&&d.codename!=='Unknown'){$('rootRule').textContent=(d.model||'Detected device')+' ('+d.codename+'): root image/method NOT VERIFIED — flash blocked until supported';}
 else $('rootRule').textContent='Unknown: connect a phone for root-method guidance';
}
function safeHttpLink(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch(_){return null}}
function newButton(label,fn,cls='btn tiny'){
 const el=document.createElement('button');el.className=cls;el.textContent=label;el.onclick=fn;return el;
}
function versionNums(v){const m=String(v).match(/(?:OS)?(\d+)\.(\d+)\.(\d+)\.(\d+)/);return m?m.slice(1).map(Number):null}
function isVersionGreater(a,b){const x=versionNums(a),y=versionNums(b);if(!x||!y)return false;for(let i=0;i<4;i++){if(x[i]!==y[i])return x[i]>y[i]}return false}
function markIndexedLatest(items){const top=new Map();for(const item of items){const key=item.codename+'|'+item.region+'|'+item.type;if(!top.has(key)||isVersionGreater(item.version,top.get(key)))top.set(key,item.version)}return items.map(i=>({...i,latest_indexed:top.get(i.codename+'|'+i.region+'|'+i.type)===i.version}))}
function regionLong(s){return ({CNXM:'China',INXM:'India',MIXM:'Global',EUXM:'Europe (EEA)',IDXM:'Indonesia',RUXM:'Russia',TRXM:'Turkey',TWXM:'Taiwan',JPXM:'Japan'})[s]||'Unknown'}
function romCard(item){
 const card=document.createElement('div');card.className='rom-row'+(device.codename===item.codename&&device.region===item.region?' match-region':'');const left=document.createElement('div');const heading=document.createElement('strong');heading.textContent=(item.version||'Version unknown')+' • '+(item.type||'?').toUpperCase();left.append(heading);const typeBadge=document.createElement('span');typeBadge.className='rom-type '+(item.type==='fastboot'?'fastboot':'recovery');typeBadge.textContent=(item.type||'ROM').toUpperCase();left.append(typeBadge);if(device.codename===item.codename&&device.region===item.region){const same=document.createElement('span');same.className='rom-badge';same.textContent='SAME ROM REGION';same.title='Software region matches connected phone; hardware region and flashing safety remain unverified';left.append(same)}
 if(item.latest_indexed){const badge=document.createElement('span');badge.className='rom-badge';badge.textContent='LATEST (INDEX)';badge.title='Newest found in current searchable index results for this region and type; not guaranteed to be the absolute latest released';left.append(badge)}
 const meta=document.createElement('div');meta.className='rom-meta';for(const [key,val] of [['Device',item.model&&item.model!=='Xiaomi family'?item.model:''],['Codename',item.codename],['Region',(regionLong(item.region)+' ('+item.region+')')],['Date',item.date]]){if(val){const span=document.createElement('span');span.append(document.createTextNode(key+': '));const b=document.createElement('b');b.textContent=val;span.append(b);meta.append(span)}}left.append(meta);
 if(item.filename){const fname=document.createElement('div');fname.className='rom-path';fname.textContent=item.filename;left.append(fname)}
 const actions=document.createElement('div');actions.className='rom-buttons';
 if(item.url&&safeHttpLink(item.url)&&item.filename){const tag=document.createElement('span');tag.className='rom-badge';tag.textContent='DIRECT LINK';left.append(tag);actions.append(newButton('↓ Download',()=>startFirmwareDownload(item),'btn tiny primary'));actions.append(newButton('Copy Link',()=>copyFirmwareLink(item),'btn tiny'));}
 if(item.source&&safeHttpLink(item.source)&&!/^https:\/\/(?:t\.me|telegram\.org)\//i.test(item.source)){actions.append(newButton('Server Link',()=>GenuiOpenServerLink(item.source),'btn tiny'));}
 card.append(left,actions);return card;
}
function GenuiOpenServerLink(url){const safe=safeHttpLink(url);if(!safe)return;window.open(safe,'_blank','noopener,noreferrer')}
async function copyFirmwareLink(item){const url=safeHttpLink(item.url);if(!url){toast('No direct ROM URL to copy.','error');return}try{await navigator.clipboard.writeText(url);toast('Direct ROM download link copied.','success')}catch(e){toast('Clipboard unavailable.','error')}}
async function browserDownload(item){try{await api('/api/firmware/browser-download',{url:item.url,filename:item.filename});toast('Direct ROM URL opened in default browser.','success')}catch(e){toast('Direct URL unavailable: '+e.message,'error')}}
async function showFirmware(){
 const codename=$('firmwareCode').value.trim().toLowerCase();const region=$('firmwareRegion').value;const rom_type=$('firmwareType').value;
 status('Finding known ROM records...');try{
 const response=await api('/api/firmware',{codename,region,rom_type});archiveLink=response.archive_url;
 $('firmwareResults').replaceChildren();setText('firmwareResultCount',response.items.length+' cached item(s)');
 if(!response.items.length){const p=document.createElement('div');p.className='empty-placeholder';p.textContent='No pre-verified direct links cached for this codename/region yet. Search Live Archive or open the firmware list.';$('firmwareResults').append(p)}
 else markIndexedLatest(response.items).forEach(item=>$('firmwareResults').append(romCard(item)));
 toast(response.items.length+' known source record(s). Not guaranteed to be latest.','info');
 }catch(e){toast(e.message,'error')}finally{status('Ready')}
}
async function showFirmwareOnline(){const codename=$('firmwareCode').value.trim().toLowerCase();status('Searching multiple firmware providers...');
 try{const response=await api('/api/firmware/find',{codename,region:$('firmwareRegion').value,rom_type:$('firmwareType').value});$('firmwareResults').replaceChildren();
 const items=markIndexedLatest(response.items||[]);
 if(!items.length){$('firmwareResults').textContent='No firmware index results for this codename, region and type right now.'}
 else items.forEach(item=>$('firmwareResults').append(romCard(item)));
 setText('firmwareResultCount',items.length+' ROM results');toast(items.length+' firmware records found; direct links marked separately.','info');
 }catch(e){toast(e.message,'error');setText('firmwareResultCount','Online search failed. Cached records still available.')}finally{status('Ready')}
}
async function startFirmwareDownload(item){
 // User explicitly requested one-click start. Downloads do not flash or execute ROMs.
 try{const j=await api('/api/firmware/download',{url:item.url,filename:item.filename,md5:item.md5||''});toast('ROM download started. Open Download Manager for controls.','success');navigate('downloads');window.v28RefreshDownloads?.();}catch(e){toast(e.message,'error')}
}
async function selectFile(kind,input){try{const r=await api('/api/browse',{kind});if(r.path)$(input).value=r.path;else toast('No file selected')}catch(e){toast(e.message,'error')}}
function reportROM(info){$('romReport').replaceChildren();const div=document.createElement('div');div.className='report-box';
 const title=document.createElement('h3');title.textContent='ROM Inspection — '+info.compatible;div.append(title);
 const data=[['Path',info.path],['Format',info.format],['Codename',info.codename],['Firmware',info.version],['ROM Region',info.region],['Installed Firmware',info.current_firmware||'Unknown'],['Cached Reference ROM',info.cached_version||'None'],['Age Assessment',info.version_assessment||'Unknown'],['Scripts',(info.scripts||[]).join(', ')||'Not verified'],['Flash All',info.flash_all_available?'Available':'Disabled in test'],['Flash & Lock','BLOCKED (relock verification incomplete)']];
 for(const [k,v] of data){const p=document.createElement('div');p.textContent=k+': '+v;div.append(p)}
 for(const w of info.warnings||[]){const p=document.createElement('p');p.textContent='⚠ '+w;p.style.color='#ffbac0';div.append(p)}
 $('romReport').append(div);
}
async function inspectROM(){if(!$('romPath').value.trim()){toast('Choose ROM file or folder first.','error');return}try{const info=await api('/api/inspect',{path:$('romPath').value.trim()});reportROM(info);toast('ROM inspected. Full flash disabled until complete safety validation.','info')}catch(e){toast(e.message,'error')}}
async function lockWarning(){
 const isHindi=lang==='hi';
 const title=isHindi?'⚠ गंभीर खतरा — पूरा फ़्लैश और बूटलोडर लॉक':'⚠ DANGER — FLASH ALL & LOCK';
 const body=isHindi?[
 'आपने पूरा सॉफ़्टवेयर फ़्लैश करके बूटलोडर लॉक करने का विकल्प चुना है। पुराने, गलत क्षेत्र के या बदले हुए सॉफ़्टवेयर से आपका फ़ोन स्थायी रूप से खराब हो सकता है।',
 'सलाह: अपने फ़ोन के सही मॉडल, कोडनाम और मूल हार्डवेयर क्षेत्र के लिए नवीनतम संगत आधिकारिक फ़ास्टबूट सॉफ़्टवेयर इस्तेमाल करें। नवीनतम संस्करण भी सुरक्षित बूटलोडर लॉक की गारंटी नहीं देता।',
 'इस परीक्षण संस्करण में पूरा फ़्लैश और बूटलोडर लॉक उपलब्ध नहीं है। गलत मॉडल, क्षेत्र, वापसी-रोधक सीमा या असत्यापित सॉफ़्टवेयर के सुरक्षा प्रतिबंध हटाए नहीं जा सकते।'
 ]:[
 'You selected Flash All & Lock. Flashing an older, mismatched or modified ROM before relocking the bootloader can permanently brick your phone.',
 'Recommendation: Use the latest compatible OFFICIAL STOCK Fastboot ROM for the exact codename and original hardware region. Latest does not guarantee a safe relock.',
 'This test build NEVER executes Flash All & Lock. Critical codename, region, anti-rollback, signed-stock and lock-support mismatches cannot be bypassed.'
 ];await modal(title,warnBody(body),{accept:isHindi?'मैंने चेतावनी समझ ली':'I Understand',cancel:isHindi?'बंद करें':'Close',danger:true});
}
async function extractStock(){const path=$('extractPath').value.trim(),partition=$('extractPartition').value;
 if(!path){toast('Choose a stock TGZ/ZIP first.','error');return}
 try{const j=await api('/api/extract-image',{path,partition});toast('Extraction started; see Operation Logs.','success');navigate('activity');refreshJobs()}catch(e){toast(e.message,'error')}
}
async function flashImage(path,partition,confirmation){
 if(!path){toast('Select a file first.','error');return}
 const paragraphs=['Real Fastboot FLASH operation. Partition: '+partition,'Selected file: '+path,'Requirements: connected '+(device.model||'Unknown')+' ('+(device.codename||'Unknown')+'), UNLOCKED Fastboot, verified existing target partition and exact matching image. Test build currently restricts actual single-image flashing to verified POCO F7 where supported.','Incorrect image may cause bootloop or permanent failure. Back up your data.','Continue only when you understand that the app cannot verify a custom image was prepared for your installed firmware.'];
 const ok=await modal('Confirm Fastboot Image Flash / फ्लैश चेतावनी',warnBody(paragraphs),{accept:'Run Verified Flash'});if(!ok)return;
 try{const j=await api('/api/flash-image',{path,partition,confirm:confirmation});toast('Fastboot flash job started. Watch logs.','success');navigate('activity');refreshJobs();}catch(e){toast(e.message,'error')}
}
async function startSideload(){if(window.__startUSBMultiFlash)return window.__startUSBMultiFlash();toast('Recovery ZIP installer is not ready','error');}
async function rebootTarget(target){
 const targetName={system:'System',recovery:'Recovery',bootloader:'Fastboot Bootloader',fastbootd:'FastbootD'}[target]||target;
 if(device.demo){toast('Cannot reboot a sample device. Scan your real phone.','error');return}
 const ok=await modal('Reboot to '+targetName,warnBody(['Switch the connected device to '+targetName+'?','This changes its active boot mode, but does not itself install firmware. Some modes may not be supported on this model.']),{accept:'Reboot',danger:false});if(!ok)return;
 try{const res=await api('/api/reboot',{target});toast(res.result||'Reboot command sent.','success');setTimeout(scanDevice,4500)}catch(e){toast(e.message,'error')}
}
async function refreshJobs(){try{const resp=await api('/api/jobs');$('jobsArea').replaceChildren();const list=resp.jobs||[];if(!list.length){$('jobsArea').textContent='No jobs yet.';return}
 list.sort((a,b)=>b.started.localeCompare(a.started));for(const x of list.slice(0,12)){
 const row=document.createElement('div');row.className='job';const title=document.createElement('div');title.className='job-row';const name=document.createElement('strong');name.textContent=x.kind;const state=document.createElement('span');state.className='pill '+(x.status==='failed'?'warning':'');state.textContent=x.status;title.append(name,state);row.append(title);
 const detail=document.createElement('small');detail.textContent=x.detail||x.started;row.append(detail);
 if(x.status==='complete'&&x.output_dir){const open=document.createElement('button');open.className='btn tiny';open.textContent='📂 Open Output Folder';open.onclick=async()=>{try{const staged=x.output_dir.toLowerCase().includes('techoffice_staged');const endpoint=staged?'/api/stock/open-stage':'/api/images/view';await api(endpoint,staged?{path:x.output_dir}:{path:x.output_dir,folder:true});toast('Opened output folder in Windows Explorer.','success')}catch(e){toast(e.message,'error')}};row.append(open)}
 if(x.kind==='Xiaomi ROM download'){
  const commands=document.createElement('div');commands.className='action-row';
  const send=async action=>{try{await api('/api/firmware/download-control',{id:x.id,action});toast('Download '+action+' requested.','info');refreshJobs()}catch(e){toast(e.message,'error')}};
  if(x.status==='running')commands.append(newButton('⏸ Pause',()=>send('pause'),'btn tiny'));
  if(x.status==='paused')commands.append(newButton('▶ Resume',()=>send('resume'),'btn tiny primary'));
  if(x.status==='running'||x.status==='paused')commands.append(newButton('✕ Cancel',()=>send('cancel'),'btn tiny'));
  if(x.download_url&&safeHttpLink(x.download_url))commands.append(newButton('⧉ Copy Link',async()=>{try{await navigator.clipboard.writeText(x.download_url);toast('Direct ROM URL copied.','success')}catch(e){toast('Clipboard unavailable: '+e.message,'error')}},'btn tiny'));
  row.append(commands);
 }
 if(x.status==='running'||x.status==='paused'){
 const bar=document.createElement('div');bar.className='progress '+(x.total?'':'indeterminate');const fill=document.createElement('div');fill.style.width=x.total?Math.max(2,Math.min(100,(x.done/x.total)*100))+'%':'';bar.append(fill);row.append(bar);if(x.total){const fraction=document.createElement('small');fraction.textContent=(x.done/(1024*1024)).toFixed(1)+' / '+(x.total/(1024*1024)).toFixed(1)+' MB';row.append(fraction)}if(x.kind==='Xiaomi ROM download'&&x.status==='running'&&x.speed_bytes_per_sec){const speed=document.createElement('small');speed.textContent='Speed: '+(x.speed_bytes_per_sec/(1024*1024)).toFixed(2)+' MB/s';row.append(speed)}
 }
 $('jobsArea').append(row)}
 }catch(e){console.warn(e)}
}
async function refreshLogs(){await refreshJobs();try{const r=await api('/api/logs');$('logConsole').textContent=(r.lines||[]).join('\n')||'No recorded operation output yet.'}catch(e){$('logConsole').textContent=e.message}}
function fillSettings(){setText('settingADB', cfg.adb_path||'');$('settingADB').value=cfg.adb_path||'';$('settingFastboot').value=cfg.fastboot_path||'';$('settingDownloads').value=cfg.download_dir||'';$('settingUpdate').value=cfg.update_manifest||'';$('settingUpdateKey').value=cfg.update_public_key||''}
async function saveSettings(){const payload={adb_path:$('settingADB').value.trim(),fastboot_path:$('settingFastboot').value.trim(),download_dir:$('settingDownloads').value.trim(),update_manifest:$('settingUpdate').value.trim(),update_public_key:$('settingUpdateKey').value.trim(),support_email:cfg.support_email||''};try{await api('/api/settings',payload);cfg=payload;toast('Settings saved locally.','success')}catch(e){toast(e.message,'error')}}
async function refreshLicense(){
 try{const r=await api('/api/license/status');
   const b=$('licenseBadge');b.textContent=r.active?(r.lifetime?'LIFETIME ACTIVE':'ACTIVATED'):'ACTIVATION REQUIRED';
   b.className='pill '+(r.active?'success':'warning');
   setText('licenseMessage',r.message||'No authorization');
   setText('licenseExpiry',r.active?('Email: '+(r.email||'')+' • '+(r.lifetime?'Lifetime access':(r.used_logins+' / '+r.max_logins+' logins used; '+r.remaining_logins+' remaining'))+(r.pending_sync?' • Offline sync pending: '+r.pending_sync:'')):'Enter the email and code from Tech Office to unlock operations.');
   $('licenseActivate').disabled=!!r.active;$('licenseEmail').disabled=!!r.active;$('licenseCode').disabled=!!r.active;$('licenseRenew').disabled=!r.active;
   window.dispatchEvent(new CustomEvent('tech-office-license-state',{detail:r}));
   return r;
 }catch(e){toast('License status error: '+e.message,'error');return {active:false}}
}
async function activateThisPC(){
 if($('licenseActivate').disabled){toast('This PC is already activated. Check activation status for details.','info');return}
 const email=$('licenseEmail').value.trim(),code=$('licenseCode').value.trim();
 if(!email||!code){toast('Enter an account email and activation code.','error');return}
 const ok=await modal('Bind license to this PC',warnBody(['This action activates the current Windows installation for one account.','An irreversible hash of the machine identity is sent to the owner licensing server. Phone data and device serial numbers are not sent.','A second PC will need a separate approved activation or an owner-approved license transfer.']),{accept:'Activate This PC',danger:false});
 if(!ok)return;
 try{const r=await api('/api/license/activate',{email,code});$('licenseCode').value='';toast(r.message||'License activated','success');await refreshLicense();await scanDevice()}
 catch(e){toast('Activation failed: '+e.message,'error')}
}
async function renewThisPC(){try{const r=await api('/api/license/renew');toast(r.message||'License renewed','success');await refreshLicense()}catch(e){toast('Renewal failed: '+e.message,'error')}}
async function checkUpdates(){try{const info=await api('/api/updates');const div=warnBody(['Installed version: '+info.current_version,'Latest available: '+info.latest_version,info.notes||'',info.message||'']);
 const p=document.createElement('p');const link=document.createElement('a');link.href=safeHttpLink(info.download_url)||'#';link.target='_blank';link.rel='noopener noreferrer';link.textContent=info.publisher_verified?'Open signed publisher download URL ↗':'Open UNVERIFIED HTTPS release URL (check publisher) ↗';p.append(link);div.append(p);
 await modal('Tool Update Check',div,{accept:'Close',cancel:null,danger:false});
 }catch(e){toast(e.message,'error');await infoDialog('Update Check',e.message+'\n\nYou can configure your HTTPS update feed from Settings. A version manifest template is in the source ZIP.')}
}
function composeEmail(kind){
 const msg=$(kind==='paid'?'supportPaid':'supportFree').value.trim();if(!msg){toast('Write a support message first.','error');return}
 const subject='Tech Office Xiaomi Service — '+(kind==='paid'?'Paid-test':'Free')+' support request';
 const body='Message:\n'+msg+'\n\nConnected device: '+(device.model||'unknown')+'\nCodename: '+(device.codename||'unknown')+'\n(Note: no phone content was collected automatically.)';
 api('/api/contact/compose',{subject,body}).then(()=>toast('Email compose requested. Send manually from your email application.','info')).catch(e=>toast('Cannot open email app: '+e.message,'error'));
}
async function submitSupportTicket(tier){
 const email=$('supportSenderEmail').value.trim(),msg=$(tier==='paid'?'supportPaid':'supportFree').value.trim();
 if(!email||!msg){toast('Enter your contact email and message.','error');return}
 const ok=await modal('Submit '+(tier==='paid'?'Priority':'Free')+' Support Ticket',warnBody([
 'Your voluntarily entered email and message will be sent to the Tech Office support server.',
 'No connected-device serial, files or phone content is included automatically.',
 tier==='paid'?'Priority messages require a valid activated license.':'Free support may have message limits.'
 ]),{accept:'Send Message',danger:false});if(!ok)return;
 try{const r=await api('/api/support/send',{email,message:msg,tier});toast('Support ticket '+r.ticket_id+' received. Check replies in this tab.','success');await loadSupportReplies()}
 catch(e){toast('Support message not delivered: '+e.message,'error')}
}
async function loadSupportReplies(){try{
 const r=await api('/api/support/check');const area=$('supportReplyList');area.replaceChildren();
 if(!(r.tickets||[]).length){area.textContent='No online support replies available. Check the email support option if server is not configured.';return}
 for(const x of r.tickets){const box=document.createElement('div');box.className='report-box';
  const head=document.createElement('strong');head.textContent='Ticket '+x.ticket_id+' • '+(x.tier||'free');
  const body=document.createElement('p');body.textContent=x.reply?'Owner reply: '+x.reply:'Awaiting owner reply';
  box.append(head,body);area.append(box)
 }
 }catch(e){toast('Support inbox unavailable: '+e.message,'error')}
}
function bindUI(){
 qsa('[data-page]').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));
 qsa('[data-page-jump]').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.pageJump)));
 $('toggleSidebar').onclick=()=>$('sidebar').classList.toggle('mobile-open');$('noticeDismiss').onclick=()=>document.querySelector('.notice-banner').remove();
 $('scanDevice').onclick=scanDevice;$('scanFromReboot').onclick=scanDevice;
 $('goFirmware').onclick=()=>{navigate('firmware');showFirmware()};

 $('firmwareSearch').onclick=showFirmwareOnline;$('firmwareLive').onclick=showFirmware;
 $('firmwareScan').onclick=async()=>{await scanDevice();if(device.codename&&device.codename!=='Unknown'&&!device.demo){navigate('firmware');await showFirmwareOnline()}else toast('Connect and authorize a real device, or enter codename manually.','info')};
 $('firmwareArchive').onclick=()=>{const code=$('firmwareCode').value.trim().toLowerCase();window.open(code&&/^[a-z][a-z0-9_-]{1,30}$/.test(code)?'https://mifw.net/devices/'+encodeURIComponent(code):'https://mifw.net/devices','_blank','noopener,noreferrer')};
 $('browseROM').onclick=()=>selectFile('rom','romPath');$('browseFolder').onclick=()=>selectFile('directory','romPath');$('inspectROM').onclick=inspectROM;/* Bootloader lock preview is wired by v04.js V0.5 */
 $('browseRecovery').onclick=()=>selectFile('img','recoveryPath');$('recoveryFlash').onclick=()=>flashImage($('recoveryPath').value.trim(),$('recoveryPartition').value,'FLASH '+$('recoveryPartition').value);
 $('browseSideload').onclick=async()=>{await selectFile('zip','sideloadPath');if($('sideloadPath').value.trim())await inspectOTAFrom('sideloadPath')};$('startSideload').onclick=startSideload;$('adbRecovery').onclick=()=>rebootTarget('recovery');
 $('browseStockImg').onclick=()=>selectFile('img','stockImgPath');
 $('pushStockImg').onclick=async()=>{const path=$('stockImgPath').value.trim();if(!path){toast('Select original stock IMG first.','error');return}const confirmed=await modal('Send Original IMG to Phone',warnBody(['Transfers selected IMG to /sdcard/Download on your connected '+(device.model||'Unknown')+'. No partitions will be flashed.','Verify that this original image belongs to the EXACT firmware installed on the device.']),{accept:'Push IMG',danger:false});if(!confirmed)return;try{await api('/api/push-stock',{path});toast('ADB push started. See Operation Logs.','success');navigate('activity')}catch(e){toast(e.message,'error')}};
 $('pullPatchedImg').onclick=async()=>{try{await api('/api/pull-patched');toast('Looking for Magisk patched IMG on the phone. See logs.','success');navigate('activity')}catch(e){toast(e.message,'error')}};
 $('browsePatched').onclick=()=>selectFile('img','patchedPath');
 $('flashPatched').onclick=()=>flashImage($('patchedPath').value.trim(),$('rootPartition').value,$('rootConfirm').value.trim());
 qsa('[data-reboot]').forEach(n=>n.onclick=()=>rebootTarget(n.dataset.reboot));
 $('installADB').onclick=async()=>{const okay=await modal('Download Official Google ADB / Fastboot',warnBody(['The tool will download platform-tools-latest-windows.zip from dl.google.com and extract adb.exe, fastboot.exe and related official binaries into your local AppData folder.','Requires an internet connection. The app does not distribute Google binaries and does not install USB drivers.']),{accept:'Install Platform Tools',danger:false});if(!okay)return;try{await api('/api/install-platform-tools');toast('Official Platform Tools setup started. See Operation Logs.','success');navigate('activity')}catch(e){toast(e.message,'error')}};
 qsa('.social').forEach(el=>el.addEventListener('click',async(event)=>{event.preventDefault();const url=el.href;try{await api('/api/open-social',{url});}catch(e){window.open(url,'_blank','noopener,noreferrer');toast('Opened social link in browser fallback.','info')}}));
 $('saveSettings').onclick=saveSettings;$('updateBtn').onclick=async()=>{try{await api('/api/open-social',{url:'https://t.me/TechOfficeXiaomiService'})}catch(e){toast('Cannot open Telegram updates channel: '+e.message,'error')}};
 $('exitApp').onclick=async()=>{const running=!!window.techOfficeRunning?.();const yes=await modal(running?'Running process — Exit options':'Exit Tech Office',warnBody(running?['Running operation detected. Cancel & Exit is not safe for active flashing/unlocking.','Choose Keep Running to protect your device, or confirm Force Close at your own risk.']:['Close Tech Office?']),{accept:running?'Force Close (Risk)':'Exit Tool',danger:running});if(!yes)return;if(running){const confirm=await modal('LAST WARNING — FORCE CLOSE',warnBody(['This terminates the app and interrupts network and local processes.','If a phone is being flashed or unlocked this may brick the device. Never unplug USB during critical operations.','Force Close does NOT guarantee a safe device state.']),{accept:'CONFIRM FORCE CLOSE',danger:true});if(!confirm)return}try{await api('/api/exit',running?{force:true,confirm:'FORCE CLOSE'}:{});document.body.innerHTML='<main style="padding:70px;color:white;font:20px Segoe UI,Arial;background:#0b101c">Tech Office Xiaomi Service stopped. You may close this window.</main>';window.close()}catch(e){toast(e.message,'error')}};
 $('licenseActivate').onclick=activateThisPC;$('licenseRenew').onclick=renewThisPC;$('licenseRefresh').onclick=refreshLicense;
 // V0.9.45: old Cloudflare ticket controls removed; no 404 calls
 // V0.9.45: direct Gmail / Telegram controls own support flow
 $('reloadLogs').onclick=refreshLogs;
 if(typeof bindExtraUI==='function')bindExtraUI();
}
async function init(){bindUI();try{const r=await api('/api/state');cfg=r.settings||{};setDevice(r.device||device);fillSettings()}catch(e){toast(e.message,'error')}
 const license=await refreshLicense();if(license.active)await scanDevice();
 if(cfg.update_manifest){try{const u=await api('/api/updates');const cur=(u.current_version||'').replace(/[^0-9.]/g,'');const latest=(u.latest_version||'').replace(/[^0-9.]/g,'');const A=cur.split('.').map(Number), B=latest.split('.').map(Number);if(B.some((x,i)=>x>(A[i]||0)&&B.slice(0,i).every((y,j)=>y===(A[j]||0))))toast('New tool update available: '+u.latest_version+'. Click Update.', 'info');}catch(_){/* Optional update feed unavailable */}}
 setInterval(()=>{if(activePage==='activity')refreshJobs()},2200);
}
document.addEventListener('DOMContentLoaded',init);
