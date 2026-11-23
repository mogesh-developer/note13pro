/* V0.3 feature modules for local Windows GUI — no third-party scripts. */
'use strict';
let imgCatalog = null; let packages = []; let checkedPackages = new Set(); let packageChanges = [];
function issue(message,kind='info'){toast(message,kind)}
function txtNode(label,cls=''){const n=document.createElement('span');n.textContent=label;if(cls)n.className=cls;return n}
async function discoverImages(){const path=$('imageSourcePath').value.trim();if(!path){issue('Select a stock ROM or extracted folder first.','error');return}
 try{imgCatalog=await api('/api/images/list',{path});setText('imageCount',(imgCatalog.entries||[]).length+' archive entries');setText('imageDetails','Device: '+imgCatalog.codename+' • OS: '+imgCatalog.version+' • Region: '+imgCatalog.region_name+(imgCatalog.warnings.length?' • '+imgCatalog.warnings.join('; '):''));
 $('imageList').replaceChildren();for(const x of imgCatalog.entries||[]){const row=document.createElement('label');row.className='image-row';const ch=document.createElement('input');ch.type='checkbox';ch.dataset.image=x.name;ch.disabled=x.type!=='img';const info=document.createElement('div');const name=document.createElement('strong');name.textContent=x.name;const path=document.createElement('div');path.className='pkg-detail';path.textContent=x.path+' • '+(x.size/(1024*1024)).toFixed(2)+' MB';info.append(name,path);row.append(ch,info);$('imageList').append(row)}
 if(!imgCatalog.entries.length){$('imageList').textContent='No IMG files found.'}issue('Archive scan complete. Select images or Extract All.','success')
 }catch(e){issue(e.message,'error')}
}
async function extractImages(all){if(!imgCatalog){issue('Scan a stock ROM first.','error');return}
 const images=all?[]:qsa('#imageList input[type="checkbox"]:checked').map(e=>e.dataset.image);if(!all&&!images.length){issue('Select at least one IMG.','error');return}
 const ok=await modal('Extract Stock Images',warnBody(['Source: '+imgCatalog.source,all?'Extract ALL standalone IMG files.':'Selected: '+images.join(', '),'Output files will include codename, exact OS build and ROM region, with SHA-256 manifest. This does NOT flash anything.','Very large firmware images can require substantial free disk space.']),{accept:'Start Extraction',danger:false});if(!ok)return;
 try{await api('/api/images/extract',{path:imgCatalog.source,images,all});issue('Extraction job started; monitor Operation Logs.','success');navigate('activity')}catch(e){issue(e.message,'error')}
}
async function viewExtracted(){try{const x=await api('/api/extraction/recent');const folders=x.folders||[];if(!folders.length){issue('No extracted IMG folder exists yet.','error');return}
 const latest=folders[folders.length-1];await api('/api/images/view',{path:latest.folder,folder:true});issue('Windows Explorer opened extraction folder.','success')
 }catch(e){issue(e.message,'error')}}
async function previewFlashScript(){const path=$('scriptPath').value.trim();if(!path){issue('Select flash_all.bat/.sh from the extracted ROM first.','error');return}
 try{const r=await api('/api/flash-script/preview',{path});$('scriptReport').replaceChildren();const summary=document.createElement('p');summary.className='danger-text';summary.textContent='READ-ONLY PREVIEW: '+r.steps.length+' steps. Scripts are NEVER run automatically.';$('scriptReport').append(summary);
 for(const x of r.steps){const row=document.createElement('div');row.className='script-step';const code=document.createElement('span');code.className='category '+x.category;code.textContent=x.category;row.append(txtNode(String(x.line)+': '),code,txtNode(x.text+' — '+x.note));$('scriptReport').append(row)}
 }catch(e){issue(e.message,'error')}
}
async function dialerStatus(){try{const x=await api('/api/dialer/status');const wanted=['com.android.contacts','com.android.incallui','com.google.android.dialer','com.google.android.contacts'];$('dialerPackageStatus').textContent=wanted.map(p=>((x.packages||{})[p]?'✓ ':'✕ ')+p).join('\n');issue('Dialer package scan completed. Presence does NOT verify calling functionality.','success')}catch(e){issue(e.message,'error')}}
async function dialerRestore(){
 if(!await modal('Restore Google Dialer',warnBody(['Restore previously uninstalled-for-user Google Dialer if its original system package is still present.','Set it as the default calling app and test both call directions afterward.']),{accept:'Restore',danger:false}))return;
 try{await api('/api/dialer/action',{action:'restore_google',confirm:''});issue('Google Dialer restore started. Check logs.','success');navigate('activity')}catch(e){issue(e.message,'error')}
}
async function bootRecoveryOnce(){const path=$('recoveryPath').value.trim();if(!path){issue('Select a compatible recovery IMG first.','error');return}
 if(!await modal('⚠ Temporarily Boot Recovery Image',warnBody(['This runs fastboot boot <image> if supported; it does not permanently flash the partition.','Wrong or untrusted IMG can still cause boot failure. Requires supported unlocked POCO F7 Fastboot; unsupported devices are blocked.','Device: '+(device.model||'Unknown')+' | Image: '+path]),{accept:'Boot Image Once',danger:true}))return;
 try{await api('/api/boot-once',{path,confirm:'BOOT IMAGE'});issue('Temporary boot job started.','info');navigate('activity')}catch(e){issue(e.message,'error')}
}
async function dialerInstall(){if(!await modal('Install HyperOS Dialer Components',warnBody(['This attempts to enable the Xiaomi Contacts and InCallUI packages already included in the stock firmware.','The tool cannot download or add missing dialer apps and does not remove Google Dialer.']),{accept:'Install Existing',danger:false}))return;
 try{await api('/api/dialer/action',{action:'install',confirm:''});issue('Dialer installation job started. Check logs.','success');navigate('activity')}catch(e){issue(e.message,'error')}
}
async function dialerRemove(){const first=await modal(lang==='hi'?'⚠ गंभीर चेतावनी — फ़ोन सेवा बंद हो सकती है':'⚠ WARNING — YOU MAY LOSE CALLING',warnBody(lang==='hi'?['गूगल डायलर हटाने से पहले शाओमी डायलर पर आने वाली और जाने वाली दोनों कॉल जाँचें।','अगर दूसरा डायलर काम नहीं करता, तो कॉलिंग बंद हो सकती है और फ़ोन रीसेट या मरम्मत की ज़रूरत पड़ सकती है।']:['Before removing Google Dialer, verify both incoming AND outgoing calls work with HyperOS Dialer.','If your alternative dialer does not work, calls may stop working and you may need to restore the app or reset the phone.']),{accept:lang==='hi'?'मैं आगे बढ़ना चाहता हूँ':'Proceed to Second Warning',danger:true});if(!first)return;
 const second=await modal(lang==='hi'?'⚠ अंतिम पुष्टि':'⚠ FINAL CONFIRMATION',warnBody(lang==='hi'?['मैंने दोनों प्रकार की कॉल की जाँच कर ली है। डायलर हटाने के खतरे को समझता हूँ।']:['I have tested BOTH incoming and outgoing calls on the alternative dialer and accept the consequences.']),{accept:lang==='hi'?'जोखिम स्वीकार करें':'Confirm Removal',danger:true});if(!second)return;
 const phrase=prompt(lang==='hi'?'पुष्टि के लिए यह अंग्रेज़ी वाक्य लिखें: I TESTED BOTH CALL DIRECTIONS':'Type exactly: I TESTED BOTH CALL DIRECTIONS');if(phrase!=='I TESTED BOTH CALL DIRECTIONS'){issue('Confirmation phrase not matched. Removal canceled.','error');return}
 try{await api('/api/dialer/action',{action:'remove_google',confirm:phrase});issue('Google Dialer removal started. See Operation Logs.','info');navigate('activity')}catch(e){issue(e.message,'error')}
}
const packageMetaCache = new Map();
let appIconObserver = null, packageMetaBusy = false;
const packageMetaQueue = [];
async function loadPackageMetadataSoon(){
 if(packageMetaBusy)return;packageMetaBusy=true;
 try{while(packageMetaQueue.length){const item=packageMetaQueue.shift();if(packageMetaCache.has(item.pkg))continue;
   try{const m=await api('/api/packages/metadata',{package:item.pkg});packageMetaCache.set(item.pkg,m);
   const row=item.row;if(!row||!row.isConnected)continue;
   const name=row.querySelector('.pkg-friendly');const icon=row.querySelector('.pkg-icon-fallback');if(m.label&&name)name.textContent=m.label;
   if(m.icon_data&&icon){const img=document.createElement('img');img.className='pkg-icon';img.src=m.icon_data;img.alt=m.label||'App icon';icon.replaceWith(img)}
   if(m.label)row.title=m.label+' — '+item.pkg;
   }catch(_){packageMetaCache.set(item.pkg,{label:'',status:'metadata unavailable'})}
 }}finally{packageMetaBusy=false}
}
function renderPackages(){
 const search=$('packageFilter').value.trim().toLowerCase(),category=$('packageCategory').value;
 $('packageList').replaceChildren();if(appIconObserver)appIconObserver.disconnect();
 appIconObserver=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
 for(const e of entries){if(!e.isIntersecting)continue;appIconObserver.unobserve(e.target);
 const pkg=e.target.dataset.pkg;if(!packageMetaCache.has(pkg))packageMetaQueue.push({pkg,row:e.target});else{
 const m=packageMetaCache.get(pkg);if(m.label)e.target.querySelector('.pkg-friendly').textContent=m.label;
 if(m.icon_data){const img=document.createElement('img');img.className='pkg-icon';img.src=m.icon_data;img.alt=m.label||'App icon';e.target.querySelector('.pkg-icon-fallback')?.replaceWith(img)}
 } }loadPackageMetadataSoon();
 },{root:$('packageList'),rootMargin:'90px'}):null;
 const visible=packages.filter(p=>{
   const name=(packageMetaCache.get(p.package)?.label||'').toLowerCase();
   return (!search||p.package.toLowerCase().includes(search)||name.includes(search))&&(category==='all'||p.risk===category)
 });
 setText('packageCount',visible.length+' shown / '+packages.length+' scanned');
 for(const p of visible){
  const row=document.createElement('label');row.className='package-row';row.dataset.pkg=p.package;
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=checkedPackages.has(p.package);cb.disabled=p.risk==='protected'||p.status==='removed_for_user';cb.onchange=()=>{if(cb.checked)checkedPackages.add(p.package);else checkedPackages.delete(p.package)};
  const icon=document.createElement('span');icon.className='pkg-icon-fallback';icon.textContent='▣';icon.title='App icon will appear if readable from installed APK';
  const body=document.createElement('div');body.style.flex='1';body.style.minWidth='0';
  const label=document.createElement('div');label.className='pkg-friendly';label.textContent=packageMetaCache.get(p.package)?.label||'System package (name unavailable)';
  const pkg=document.createElement('div');pkg.className='pkg-id';pkg.textContent=p.package;
  const d=document.createElement('div');d.className='pkg-detail';d.textContent=(p.status||'Unknown')+' • '+p.reason;
  body.append(label,pkg,d);const risk=txtNode(p.risk,p.risk+' risk');row.append(cb,icon,body,risk);$('packageList').append(row);
  if(appIconObserver)appIconObserver.observe(row);
 }
 if(!visible.length)$('packageList').textContent='No packages in this filter.'
}

async function scanBloatware(){try{const r=await api('/api/packages');packages=r.packages||[];checkedPackages.clear();renderPackages();issue('System app scan completed: '+packages.length+' known system packages and states.','success')}catch(e){issue(e.message,'error')}}
async function changePackages(action,list){if(!list.length){issue('No packages selected.','error');return}if(list.length>80){issue('Maximum 80 packages per batch.','error');return}
 let protectedCount=list.filter(p=>packages.find(x=>x.package===p)?.risk==='protected').length;if(protectedCount){issue('Protected packages cannot be changed.','error');return}
 const ok=await modal('⚠ ADB Package '+action.toUpperCase(),warnBody(['Connected phone: '+(device.model||'Unknown')+' • codename '+(device.codename||'Unknown'),'Packages: '+list.join(', '),'Removing or disabling apps may break features or make Android unstable. Restore is only possible when the package remains on the device and this tool recorded the change.','The tool only permits eligible safe-candidate removals; other reviewed apps can only be disabled.']),{accept:'I Understand • Continue',danger:true});if(!ok)return;
 const second=await modal('Confirm Package Changes',warnBody(['Last check: '+action.toUpperCase()+' '+list.length+' package(s)?','Only one connected real ADB device is allowed.']),{accept:'Confirm Changes',danger:true});if(!second)return;
 try{await api('/api/packages/change',{action,packages:list,confirm:'CONFIRM PACKAGE CHANGES'});issue('Package operation started; see logs.','success');navigate('activity')}catch(e){issue(e.message,'error')}
}
async function loadPackageHistory(){try{const r=await api('/api/packages/history');packageChanges=r.history||[];$('packageHistory').replaceChildren();const latest=new Map();for(const x of packageChanges)latest.set(x.package,x);for(const entry of latest.values()){const row=document.createElement('div');row.className='package-row';const name=document.createElement('div');name.style.flex='1';name.textContent=entry.package+' • '+entry.action;const btn=newButton('Restore',()=>changePackages('restore',[entry.package]),'btn tiny');btn.disabled=entry.action==='restore';row.append(name,btn);$('packageHistory').append(row)}if(!latest.size)$('packageHistory').textContent='No package changes recorded by this tool on the connected device.'}catch(e){issue(e.message,'error')}}
async function restoreAllPackages(){if(!packageChanges.length){await loadPackageHistory();if(!packageChanges.length)return}
 const latest=new Map();for(const r of packageChanges)latest.set(r.package,r.action);const list=[...latest.entries()].filter(([p,a])=>a!=='restore').map(x=>x[0]);await changePackages('restore',list)}
async function manualAction(action){const raw=$('manualPackage').value.trim();const recognized=raw.match(/^(?:(?:adb\s+shell\s+)?pm\s+(?:uninstall|disable-user|enable|install-existing)\s+--user\s+0\s+)?([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)$/i);const p=recognized?recognized[1]:'';if(!p){issue('Enter a package ID only (no raw CMD/shell commands).','error');return}
 try{const x=await api('/api/manual-command/preview',{package:p,action});setText('manualPackageInfo','Risk: '+x.risk+' | '+x.reason+' | Preview: '+x.supported_command);if(action!=='preview')await changePackages(action,[p]);}catch(e){issue(e.message,'error')}
}
async function startWipe(){if(device.mode!=='fastboot'||!String(device.bootloader).startsWith('UNLOCKED')){issue('Fastboot + verified UNLOCKED bootloader required.','error');return}
 const first=await modal('⚠ DATA DESTRUCTION / FACTORY RESET',warnBody(['This permanently erases user apps, photos, messages, and personal data on the connected phone.','Operation: fastboot -w. Only Xiaomi/Redmi/POCO with UNLOCKED bootloader and freshly checked identity.','Google FRP / Mi Account security locks are NOT removed.']),{accept:'Read & Continue',danger:true});if(!first)return;
 const second=await modal('⚠ FINAL DATA WIPE CONFIRMATION',warnBody(['All personal data may be permanently lost. Confirm that backups are complete and the target device is correct.']),{accept:'Open Final Confirmation',danger:true});if(!second)return;
 const phrase=prompt('Type exactly: ERASE ALL USER DATA');if(phrase!=='ERASE ALL USER DATA'){issue('Wipe canceled; confirmation phrase mismatch.','error');return}
 try{const job=await api('/api/wipe/fastboot',{confirm:phrase});issue('Verified wipe request accepted. Check Device Actions output and Operations & Logs.','info');const result=$('v09CommandResult');if(result)result.textContent='USER DATA WIPE • '+(job.id||'job queued')+'\nCommand: fastboot -w\nStatus: operation started; monitor progress in Operations & Logs.\nThis DOES NOT erase FRP or Mi Account locks.'}catch(e){issue(e.message,'error');const result=$('v09CommandResult');if(result)result.textContent='WIPE NOT STARTED: '+e.message}
}
let youtubeLoading=false, youtubeLastResultAt=0, youtubeLoaded=false;
async function latestYoutube(){if(youtubeLoading)return; youtubeLoading=true; if(!youtubeLoaded)setText('youtubeStatus','Checking Tech Office public YouTube feed...');try{const r=await api('/api/youtube/latest');const videos=r.videos||[];if(!videos.length&&youtubeLoaded){setText('youtubeStatus','YouTube feed currently unavailable — showing previous videos.');return} $('youtubeVideos').replaceChildren();for(const v of videos){const card=document.createElement('button');card.className='video-card';const img=document.createElement('img');img.src=v.thumbnail;img.loading='lazy';img.alt='Thumbnail — '+v.title;const name=document.createElement('strong');name.textContent=v.title;const date=document.createElement('span');date.textContent=v.published?v.published.slice(0,10):'';card.append(img,name,date);card.onclick=async()=>{try{await api('/api/youtube/open',{video_id:v.id})}catch(e){issue(e.message,'error')}};$('youtubeVideos').append(card)}
 setText('youtubeStatus',videos.length+' recent public videos • '+(r.cached?'cached/offline':'online')+(r.warning?' — '+r.warning:''));youtubeLoaded=videos.length>0;if(!videos.length)issue('No public videos found. Use Open Channel.','info')
 }catch(e){setText('youtubeStatus',(youtubeLoaded?'Showing previously loaded videos • ':'')+'Latest feed unavailable: '+e.message);if(!youtubeLoaded)issue(e.message,'error')}finally{youtubeLoading=false}
}
// First 10 minutes: every 5 sec; thereafter every 60 sec, no overlapping requests.
// Start immediately on load and retry automatically when the Internet returns.
let youtubeAutoStarted=0, youtubeAutoTimer=null;
function startYoutubeAuto(){if(youtubeAutoStarted)return;youtubeAutoStarted=Date.now();latestYoutube();const tick=()=>{latestYoutube();const interval=Date.now()-youtubeAutoStarted<600000?5000:60000;youtubeAutoTimer=setTimeout(tick,interval)};youtubeAutoTimer=setTimeout(tick,5000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startYoutubeAuto);else startYoutubeAuto();
async function listAndPullRootImage(){
 try{const r=await api('/api/root/images');const list=r.images||[];if(!list.length){issue('No IMG found in the connected phone Downloads folder.','error');return}
 const div=document.createElement('div');const p=document.createElement('p');p.textContent='Choose the actual patched IMG generated by your selected compatible root application on '+(device.model||'Unknown')+'.';div.append(p);const select=document.createElement('select');for(const file of list){const o=document.createElement('option');o.value=file;o.textContent=file;select.append(o)}div.append(select);
 const ok=await modal('Retrieve Patched Root Image',div,{accept:'Pull Selected IMG',danger:false});if(!ok)return;
 await api('/api/root/pull',{remote:select.value});issue('Image transfer started; check logs and the saved SHA-256 hash.','success');navigate('activity')
 }catch(e){issue(e.message,'error')}
}
function selectRootMethod(){const method=$('rootMethodSelect').value;const notes={magisk:'Magisk: image patching uses supported boot/init_boot/recovery image, depending on firmware and device.',kernelsu:'KernelSU: requires compatible kernel/device and supported installation path; do not assume a Magisk-patched IMG is interchangeable.',apatch:'APatch: requires method-specific boot image patching and compatible Android/kernel; do not reuse unsupported partition instructions.'};setText('rootMethodNotes',notes[method]);}
function bindExtraUI(){
 $('verifyRecoveryMethod').onclick=async()=>{try{const r=await api('/api/recovery/method',{});$('recoveryMethodStatus').textContent=r.summary+'\n'+(r.notes||[]).join('\n');issue('Device-specific recovery support check completed; unknown methods remain blocked.','info')}catch(e){$('recoveryMethodStatus').textContent=e.message;issue(e.message,'error')}};

 $('openYoutubeTab').onclick=()=>{navigate('youtube');latestYoutube()};$('openYoutubeChannel').onclick=async()=>{try{await api('/api/open-social',{url:'https://youtube.com/@TechOfficee'})}catch(e){issue(e.message,'error')}};
 $('refreshYoutube').onclick=latestYoutube; $('recoveryBootOnce').onclick=bootRecoveryOnce;
 $('rootMethodSelect').onchange=selectRootMethod;selectRootMethod();$('pullPatchedImg').onclick=listAndPullRootImage;
 $('browseImageSource').onclick=()=>selectFile('rom','imageSourcePath');$('browseImageFolder').onclick=()=>selectFile('directory','imageSourcePath');$('scanImages').onclick=discoverImages;
 $('imgSelectAll').onclick=()=>qsa('#imageList input[type="checkbox"]:not(:disabled)').forEach(el=>el.checked=true);$('imgClearAll').onclick=()=>qsa('#imageList input[type="checkbox"]').forEach(el=>el.checked=false);
 $('imgExtractSelected').onclick=()=>extractImages(false);$('imgExtractAll').onclick=()=>extractImages(true);$('viewExtractedFiles').onclick=viewExtracted;
 $('browseScript').onclick=async()=>{await selectFile('script','scriptPath');const f=$('scriptPath').value.trim();if(f){$('romPath').value=f.replace(/[\\/][^\\/]+$/, '');}};$('inspectScript').onclick=previewFlashScript;
 $('scanDialer').onclick=dialerStatus;$('installDialer').onclick=dialerInstall;$('removeGoogleDialer').onclick=dialerRemove;$('restoreGoogleDialer').onclick=dialerRestore;
 $('scanBloatware').onclick=scanBloatware;$('packageFilter').oninput=renderPackages;$('packageCategory').onchange=renderPackages;
 $('selectSafePackages').onclick=()=>{checkedPackages=new Set(packages.filter(p=>p.risk==='candidate'&&p.status!=='removed_for_user').map(p=>p.package));renderPackages()};$('clearPackageSelection').onclick=()=>{checkedPackages.clear();renderPackages()};
 $('disablePackages').onclick=()=>changePackages('disable',[...checkedPackages]);$('removePackages').onclick=()=>changePackages('remove',[...checkedPackages]);$('removeAllSafe').onclick=()=>changePackages('remove',packages.filter(p=>p.risk==='candidate'&&p.status!=='removed_for_user').map(p=>p.package));
 $('manualPackagePreview').onclick=()=>manualAction('preview');$('manualPackageDisable').onclick=()=>manualAction('disable');$('manualPackageRemove').onclick=()=>manualAction('remove');
 $('scanPackageHistory').onclick=loadPackageHistory;$('restoreAllPackages').onclick=restoreAllPackages;/* Wipe is bound only in Device Actions; no duplicate Wipe page. */
 $('languageSelect').onchange=ev=>{lang=ev.target.value;try{localStorage.setItem('techOfficeLang',lang)}catch(_){}applyLanguage()};
 let storedLang='en';try{storedLang=localStorage.getItem('techOfficeLang')||'en'}catch(_){}lang=storedLang==='hi'?'hi':'en';$('languageSelect').value=lang;applyLanguage();
}

/* Two distinct language modes. Technical IDs, firmware names and paths remain untranslated. */
const hindiUI={
 'WORKSPACE':'कार्य क्षेत्र','SERVICE DESK':'सहायता केंद्र','Dashboard':'डैशबोर्ड','Firmware Finder':'फ़र्मवेयर खोज','Official AOSP ROMs':'आधिकारिक AOSP ROM','Fastboot Flash':'फ़ास्टबूट फ़्लैश','Recovery Flashing':'रिकवरी फ़्लैशिंग','Extract Stock IMG':'स्टॉक इमेज निकालें','Extract Stock IMG Files':'स्टॉक इमेज फ़ाइलें निकालें',
 'Root / Unroot':'रूट / अनरूट','Wipe & Reset':'डेटा मिटाएँ और रीसेट','Reboot Manager':'रीबूट प्रबंधक','Install Hyper Dialer':'हाइपर डायलर स्थापित करें','Bloatware Remover':'अनावश्यक ऐप हटाएँ','Tech Office YouTube':'टेक ऑफिस यूट्यूब','Support Messages':'सहायता संदेश','Operation Logs':'कार्यवाही विवरण','Settings':'सेटिंग्स',
 'CONNECTED DEVICE':'कनेक्ट किया गया उपकरण','Update':'अपडेट','Device safety notice.':'विकास परीक्षण संस्करण।','DEVICE WORKSPACE / START HERE':'डिवाइस कार्य क्षेत्र / यहाँ से शुरू करें','Device Dashboard':'डिवाइस डैशबोर्ड','Connect your Xiaomi, Redmi or POCO device to begin.':'शुरू करने के लिए अपना शाओमी, रेडमी या पोको डिवाइस जोड़ें।',
 '↻   Scan Device':'↻   डिवाइस स्कैन करें','↻ Scan Device':'↻ डिवाइस स्कैन करें','USB CONNECTION':'यूएसबी कनेक्शन','Not connected':'कनेक्ट नहीं है','BOOTLOADER':'बूटलोडर','Unknown':'अज्ञात','Verified before flashing':'फ़्लैश से पहले सत्यापन','DEVICE FAMILY':'डिवाइस परिवार','ACTIVATION':'सक्रियण','TEST MODE':'परीक्षण मोड','Connected Device':'कनेक्ट किया गया डिवाइस','DISCONNECTED':'कनेक्शन नहीं','DEVICE MODEL':'डिवाइस मॉडल','Waiting for connection...':'कनेक्शन की प्रतीक्षा है...','No real Android device detected.':'कोई वास्तविक एंड्रॉइड डिवाइस नहीं मिला।','Codename':'कोडनाम','Firmware':'फ़र्मवेयर','Android':'एंड्रॉइड','ROM Region':'फ़र्मवेयर क्षेत्र','Device Serial':'डिवाइस सीरियल','Active Slot':'सक्रिय स्लॉट','Battery':'बैटरी','Root Status':'रूट स्थिति','Build Fingerprint':'बिल्ड फ़िंगरप्रिंट','Connection Assistant':'कनेक्शन सहायक',
 'STEP BY STEP':'चरण दर चरण','Enable Developer Options':'डेवलपर विकल्प चालू करें','Enable USB Debugging':'यूएसबी डिबगिंग चालू करें','Authorize the PC':'कंप्यूटर को अनुमति दें','Fastboot devices':'फ़ास्टबूट डिवाइस','Firmware Finder →':'फ़र्मवेयर खोज →',
 'XIAOMI OFFICIAL ROM SEARCH':'शाओमी आधिकारिक फ़र्मवेयर खोज','Find Matching Firmware':'मेल खाने वाला फ़र्मवेयर खोजें','DIRECT LINK SUPPORT':'सीधे डाउनलोड का विकल्प','Device Codename':'डिवाइस कोडनाम','Package Type':'पैकेज प्रकार','India (INXM)':'भारत (INXM)','Global (MIXM)':'वैश्विक (MIXM)','China (CNXM)':'चीन (CNXM)','EEA (EUXM)':'यूरोप (EUXM)','All (view only)':'सभी (केवल देखें)','Fastboot ROM (.tgz)':'फ़ास्टबूट फ़र्मवेयर (.tgz)','Recovery ROM (.zip)':'रिकवरी फ़र्मवेयर (.zip)','Both':'दोनों','Find Available Downloads':'उपलब्ध डाउनलोड खोजें','Search Live Archive':'इंटरनेट से खोजें','Open Full Firmware List ↗':'संपूर्ण सूची खोलें ↗','Firmware Results':'फ़र्मवेयर परिणाम','Choose search options':'खोज विकल्प चुनें','Search for firmware to see downloads.':'डाउनलोड देखने के लिए फ़र्मवेयर खोजें।',
 'STOCK FIRMWARE MANAGEMENT':'स्टॉक फ़र्मवेयर प्रबंधन','Inspect selected ROM, check device identity and review flashing risks.':'चुने गए फ़र्मवेयर, डिवाइस पहचान और फ़्लैशिंग जोखिम की जाँच करें।','FULL ROM FLASH: PREVIEW':'पूरा फ़र्मवेयर फ़्लैश: केवल पूर्वावलोकन','Select Stock Fastboot ROM':'स्टॉक फ़ास्टबूट फ़र्मवेयर चुनें','Browse File...':'फ़ाइल चुनें...','Browse Folder...':'फ़ोल्डर चुनें...','Inspect ROM & Safety Check':'फ़र्मवेयर एवं सुरक्षा जाँच','Get Firmware ↗':'फ़र्मवेयर प्राप्त करें ↗','ROM Flash Script Preview':'फ़्लैश स्क्रिप्ट पूर्वावलोकन','READ-ONLY':'केवल पढ़ने के लिए','Browse Script':'स्क्रिप्ट चुनें','Preview Script Steps':'स्क्रिप्ट के चरण देखें','Flash Modes':'फ़्लैश विकल्प','NOT EXECUTABLE IN TEST V0.3':'परीक्षण संस्करण में निष्क्रिय','Flash All':'पूरा फ़र्मवेयर फ़्लैश','Save User Data':'उपयोगकर्ता डेटा बचाएँ','Flash All & Lock':'पूरा फ़्लैश और बूटलोडर लॉक','Preview only':'केवल पूर्वावलोकन','View Safety Warning':'सुरक्षा चेतावनी देखें',
 'CUSTOM RECOVERY & ROM INSTALLATION':'कस्टम रिकवरी एवं फ़र्मवेयर स्थापना','Custom Recovery IMG':'कस्टम रिकवरी इमेज','Recovery image path':'रिकवरी इमेज का स्थान','Browse':'चुनें','Destination partition (verified by tool)':'लक्ष्य विभाजन (टूल से सत्यापित)','Verify & Flash IMG':'जाँचें और इमेज फ़्लैश करें','ADB Sideload':'एडीबी साइडलोड','ZIP package path':'ज़िप पैकेज का स्थान','Start Sideload':'साइडलोड शुरू करें','Reboot to Recovery':'रिकवरी में रीबूट करें','Recovery Compatibility Rules':'रिकवरी की संगतता के नियम','1. Same codename':'1. समान कोडनाम','2. Partition layout':'2. विभाजन संरचना','3. Backup first':'3. पहले बैकअप लें',
 'STOCK IMAGE EXTRACTION':'स्टॉक इमेज निकालना','LOCAL ONLY':'केवल स्थानीय फ़ाइल','1. Select Stock ROM / Folder':'1. स्टॉक फ़र्मवेयर / फ़ोल्डर चुनें','Browse ROM':'फ़र्मवेयर चुनें','Browse Folder':'फ़ोल्डर चुनें','Scan Images':'इमेज स्कैन करें','View Files / Open Folder':'फ़ाइलें देखें / फ़ोल्डर खोलें','2. Available Stock Images':'2. उपलब्ध स्टॉक इमेज','Scan a firmware archive first':'पहले फ़र्मवेयर स्कैन करें','Select All':'सभी चुनें','Clear':'हटाएँ','Extract Selected':'चुने हुए निकालें','Extract All':'सभी निकालें','No ROM inspected.':'अभी फ़र्मवेयर जाँचा नहीं गया।',
 'ROOT SERVICE':'रूट सेवा','Root Method Finder':'रूट विधि खोज','AUTO METHOD CHECK':'स्वचालित विधि जाँच','Extract Stock Images':'स्टॉक इमेज निकालें','Open Stock IMG Extractor →':'स्टॉक इमेज निकालने वाला विकल्प खोलें →','Root Image File Handover':'रूट इमेज फ़ाइल स्थानांतरण','Original stock IMG (same as installed firmware)':'मूल स्टॉक इमेज (स्थापित फ़र्मवेयर के समान)','Browse IMG':'इमेज चुनें','1. Push Original IMG → Phone':'1. मूल इमेज फ़ोन में भेजें','2. Pull Patched IMG → PC':'2. पैच की हुई इमेज कंप्यूटर पर लाएँ','Flash Patched Image':'पैच की हुई इमेज फ़्लैश करें','UNLOCKED BOOTLOADER ONLY':'बूटलोडर खुला होना अनिवार्य','Patched root .img file':'पैच की हुई रूट इमेज','Target Partition':'लक्ष्य विभाजन','Confirm phrase':'पुष्टि वाक्य','Verify & Flash Patched IMG':'जाँचकर पैच इमेज फ़्लैश करें','Unroot':'रूट हटाएँ','GUIDED':'मार्गदर्शित',
 'DATA RESET SERVICE':'डेटा रीसेट सेवा','DANGER: DATA LOSS':'खतरा: डेटा मिटेगा','Normal Factory Reset':'सामान्य फ़ैक्टरी रीसेट','Full User Data Wipe':'पूरा उपयोगकर्ता डेटा मिटाएँ','FRP / Owner Verification':'खाते के मालिक का सत्यापन','Account Recovery ↗':'खाता पुनर्प्राप्ति ↗','Fastboot User Data Wipe':'फ़ास्टबूट से उपयोगकर्ता डेटा मिटाएँ','IRREVERSIBLE':'वापस नहीं हो सकता','⚠ Fastboot Wipe Data (Advanced)':'⚠ फ़ास्टबूट डेटा मिटाएँ (उन्नत)','Requires verification':'सत्यापन आवश्यक',
 'ADB / FASTBOOT CONTROLS':'एडीबी / फ़ास्टबूट नियंत्रण','Change boot mode with supported real ADB or Fastboot commands.':'समर्थित एडीबी या फ़ास्टबूट कमांड से बूट मोड बदलें।','↻ Refresh Connection':'↻ कनेक्शन दोबारा जाँचें','Choose Destination':'कहाँ रीबूट करना है चुनें','No device':'डिवाइस नहीं मिला','Reboot System':'सिस्टम में रीबूट','Recovery Mode':'रिकवरी मोड','Fastboot Mode':'फ़ास्टबूट मोड','Normal Android OS':'सामान्य एंड्रॉइड प्रणाली','Stock / custom recovery':'स्टॉक / कस्टम रिकवरी','Bootloader fastboot':'बूटलोडर फ़ास्टबूट',
 'DEVICE APP MANAGEMENT':'डिवाइस ऐप प्रबंधन','Scan Packages':'पैकेज स्कैन करें','Dialer Package Availability':'डायलर पैकेज उपलब्धता','ADB REQUIRED':'एडीबी आवश्यक','Click Scan Packages to check the actual device.':'वास्तविक डिवाइस जाँचने के लिए पैकेज स्कैन करें।','Install HyperOS Dialer':'हाइपरओएस डायलर स्थापित करें','Install Existing Components':'मौजूदा घटक स्थापित करें','⚠ Uninstall Google Dialer':'⚠ गूगल डायलर हटाएँ','Uninstall with Double Warning':'दो चेतावनियों के बाद हटाएँ',
 'ADB APP MANAGEMENT':'एडीबी ऐप प्रबंधन','↻ Scan Apps':'↻ ऐप स्कैन करें','Installed System Packages':'स्थापित सिस्टम पैकेज','No packages scanned':'पैकेज स्कैन नहीं हुए','All categories':'सभी श्रेणियाँ','Safe candidates':'सुरक्षित माने गए विकल्प','Needs review':'जाँच आवश्यक','Protected':'सुरक्षित रखा गया','Select All Candidates':'सभी उम्मीदवार चुनें','Remove All Safe':'सभी सुरक्षित ऐप हटाएँ','Restore Google Dialer':'गूगल डायलर वापस लाएँ','Boot Once (No Flash)':'एक बार बूट करें (बिना फ़्लैश)','Disable Selected':'चुने हुए निष्क्रिय करें','Remove Selected Safe':'चुने हुए सुरक्षित ऐप हटाएँ','Connect an authorized phone and scan.':'अनुमत फ़ोन कनेक्ट करके स्कैन करें।','Manual Package Manager':'मैनुअल पैकेज प्रबंधन','Preview':'पूर्वावलोकन','Disable Package':'पैकेज निष्क्रिय करें','Remove Eligible Package':'अनुमत पैकेज हटाएँ','Restore Apps':'ऐप वापस लाएँ','Load History':'इतिहास देखें','Restore All Eligible':'सभी योग्य ऐप वापस लाएँ',
 'TECH OFFICE CHANNEL':'टेक ऑफिस चैनल','↻ Refresh Videos':'↻ वीडियो सूची अपडेट करें','Official YouTube channel':'आधिकारिक यूट्यूब चैनल','▶ Open Channel in Browser':'▶ ब्राउज़र में चैनल खोलें','Recent 10 Videos':'हाल के 10 वीडियो','Click Refresh Videos to retrieve public channel uploads.':'सार्वजनिक वीडियो देखने के लिए सूची अपडेट करें।',
 'TECH OFFICE SERVICE DESK':'टेक ऑफिस सहायता केंद्र','Free Support':'मुफ़्त सहायता','ALL USERS':'सभी उपयोगकर्ता','Message':'संदेश','Compose Email':'ईमेल लिखें','Paid Support':'सशुल्क सहायता','ACTIVATION PENDING':'सक्रियण बाकी है','Priority request':'प्राथमिक अनुरोध','Compose Email (Test)':'ईमेल लिखें (परीक्षण)',
 'LOCAL AUDIT TRAIL':'स्थानीय कार्यवाही विवरण','Operations & Logs':'कार्यवाही और लॉग','Refresh Logs':'लॉग अपडेट करें','Current Jobs':'वर्तमान कार्य','No operations yet.':'अभी कोई कार्य नहीं।','Session Events':'सत्र घटनाएँ','No analytics uploaded':'कोई उपयोग डेटा अपलोड नहीं','Waiting for activity...':'कार्य की प्रतीक्षा है...',
 'LOCAL CONFIGURATION':'स्थानीय सेटिंग्स','ADB Executable (optional)':'एडीबी प्रोग्राम (वैकल्पिक)','Fastboot Executable (optional)':'फ़ास्टबूट प्रोग्राम (वैकल्पिक)','Firmware Download Folder':'फ़र्मवेयर डाउनलोड फ़ोल्डर','Service Support Email':'सहायता ईमेल','Update Manifest URL (HTTPS)':'अपडेट सर्वर का पता (HTTPS)','Save Settings':'सेटिंग्स सहेजें','Install Official Platform Tools':'आधिकारिक प्लेटफ़ॉर्म टूल स्थापित करें','Official Platform Tools ↗':'आधिकारिक प्लेटफ़ॉर्म टूल ↗','Portable EXE':'बिना इंस्टॉल चलने वाला प्रोग्राम','Activation / Admin Gateway':'सक्रियण / व्यवस्थापक प्रवेश','NOT IMPLEMENTED IN THIS TEST':'इस परीक्षण में उपलब्ध नहीं','Confirm Action':'कार्य की पुष्टि','Cancel':'रद्द करें','Continue':'आगे बढ़ें','Close':'बंद करें','Show':'दिखाएँ','Hide':'छिपाएँ'
};
const englishNodes=new WeakMap();
function applyLanguage(){
 document.documentElement.lang=lang;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest('script,style,pre,code,.video-card,.rom-row,.package-row,.image-row'))continue;
  if(!englishNodes.has(node))englishNodes.set(node,node.textContent);
  const original=englishNodes.get(node),trimmed=original.trim();if(!trimmed)continue;
  const t=lang==='hi'?hindiUI[trimmed]:null;
  if(t){node.textContent=original.replace(trimmed,t)}else if(lang==='en'){node.textContent=original}
 }
 for(const inp of document.querySelectorAll('input[placeholder],textarea[placeholder]')){
  if(!inp.dataset.originalPlaceholder)inp.dataset.originalPlaceholder=inp.placeholder;
  const eng=inp.dataset.originalPlaceholder;inp.placeholder=lang==='hi'?({
   'e.g. onyx':'उदाहरण: onyx','Search by package ID':'पैकेज आईडी से खोजें','Your question / device problem...':'अपना सवाल या फ़ोन की समस्या लिखें...',
   'Paid support message...':'सशुल्क सहायता का संदेश...','com.example.app':'com.example.app'
  }[eng]||eng):eng;
 }
}


Object.assign(hindiUI,{
'Official Root Manager Downloads':'आधिकारिक रूट प्रबंधक डाउनलोड',
'OFFICIAL PROJECT LINKS':'आधिकारिक परियोजना लिंक',
'Live Process Log / Activity Monitor':'लाइव कार्यवाही विवरण',
'Copy':'कॉपी करें','Save Log':'लॉग सहेजें','Full Logs':'पूरा लॉग',
'Check / Flash All':'जाँचें / पूरा फ़्लैश','Check Compatibility':'संगतता जाँचें',
'ROM Flash Script Analyzer':'फ़र्मवेयर फ़्लैश स्क्रिप्ट विश्लेषक',
'Prepare Safe Flash Plan':'सुरक्षित फ़्लैश योजना तैयार करें',
'Verify Device Recovery Method':'रिकवरी विधि जाँचें',
'Search app name or package ID':'ऐप का नाम या पैकेज आईडी खोजें',
'FULL ROM FLASH: VERIFICATION REQUIRED':'पूरा फ़्लैश: सत्यापन ज़रूरी',
'MODEL & PACKAGE VERIFICATION REQUIRED':'मॉडल और पैकेज जाँच आवश्यक',
'WAITING':'प्रतीक्षा है', 'RUNNING':'चल रहा है','SUCCESS':'सफल','FAILED':'असफल',
'Extract Stock IMG Files':'स्टॉक इमेज निकालें'
});

/* V0.8 new licensing and support labels: the language toggle never translates
   device identifiers, email addresses, keys or firmware names. */
Object.assign(hindiUI,{
 'Activation / One-PC License':'सक्रियण / एक कंप्यूटर का लाइसेंस',
 'Account Email':'खाते का ईमेल',
 'Activation Code':'सक्रियण कोड',
 'Activate This PC':'इस कंप्यूटर को सक्रिय करें',
 'Renew Online Check':'ऑनलाइन लाइसेंस दोबारा जाँचें',
 'Check Activation Status':'सक्रियण स्थिति जाँचें',
 'CHECKING':'जाँच चल रही है',
 'EVALUATION':'परीक्षण संस्करण',
 'ACTIVATED':'सक्रिय',
 'ACTIVATION REQUIRED':'सक्रियण आवश्यक',
 'Send to Support Server':'सहायता सर्वर पर भेजें',
 'Send Priority Ticket':'प्राथमिक सहायता संदेश भेजें',
 'Support Ticket Inbox':'सहायता संदेश इनबॉक्स',
 'Check Replies':'जवाब देखें',
 'Email used for support tickets':'सहायता संदेशों के लिए ईमेल',
 'No support tickets checked yet. Tickets are sent only after you click Send.':'अभी सहायता संदेश नहीं जाँचे गए। संदेश केवल भेजें दबाने पर ही भेजे जाते हैं।',
 'License server not configured in evaluation builds.':'परीक्षण संस्करण में लाइसेंस सर्वर सेट नहीं है।',
 'Checking the local signed license status…':'स्थानीय हस्ताक्षरित लाइसेंस की जाँच की जा रही है…',
 'No payment is collected by this app. Phone serial numbers and phone contents are not transmitted to activation services.':'यह ऐप भुगतान नहीं लेता। फ़ोन का सीरियल नंबर और सामग्री सक्रियण सेवा को नहीं भेजी जाती।'
});
