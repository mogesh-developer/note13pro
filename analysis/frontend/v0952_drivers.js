/* V0.9.52 driver/status UI: no background driver installation. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const row=(label,value,good)=>{const r=document.createElement('div');r.className='v52-driver-line';
 const l=document.createElement('strong');l.textContent=label;const v=document.createElement('span');v.className=good?'v52-driver-good':'v52-driver-warn';v.textContent=value;r.append(l,v);return r};
async function refresh(){const btn=$('v52RefreshDrivers'),tools=$('v52DriverToolsStatus'),usb=$('v52USBDeviceList');if(!btn||!tools||!usb)return;
 btn.disabled=true;tools.textContent='Scanning installed tools…';usb.textContent='Checking Windows Plug-and-Play…';
 try{const r=await api('/api/drivers/status',{});tools.replaceChildren(row('ADB',r.adb?.present?'Found • '+r.adb.source:'Not found',r.adb?.present),row('Fastboot',r.fastboot?.present?'Found • '+r.fastboot.source:'Not found',r.fastboot?.present));
 const badge=$('v52DriverToolsBadge');if(badge)badge.textContent=(r.adb?.present&&r.fastboot?.present)?'TOOLS FOUND':'CHECK INSTALL';
 const devices=Array.isArray(r.devices)?r.devices:[];usb.replaceChildren(...(devices.length?devices.map(d=>row(d.name||'Android device',(d.class||'USB')+' · '+(d.status||'Unknown'),d.status==='OK')):[row('Android USB / Fastboot','No recognized connected driver entry',false)]));
 const count=$('v52USBCount');if(count)count.textContent=devices.length+' entries';if(r.note){const note=document.createElement('p');note.className='small muted';note.textContent=r.note;usb.append(note)}
 }catch(e){tools.textContent='Cannot scan: '+e.message;usb.textContent='Driver status unavailable. Verify tool activation and local session.'}
 finally{btn.disabled=false}
}
async function openGuide(guide){try{const res=await api('/api/drivers/open',{guide});toast(res.detail||'Opened','success')}catch(e){toast('Cannot open: '+e.message,'error')}}
async function install(){if(!confirm('Download official Android Platform Tools and safely replace the local tool set after extraction? Existing working installation is kept until verified.'))return;
 const b=$('v52InstallTools');b.disabled=true;try{await api('/api/install-platform-tools',{});toast('Installation queued. See Operations & Logs for actual progress or Cancel.','info')}catch(e){toast(e.message,'error')}finally{b.disabled=false}}
async function copy(id){const v=$(id)?.textContent||'';if(!v)return;
 try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(v);else{const t=document.createElement('textarea');t.value=v;document.body.append(t);t.select();if(!document.execCommand('copy'))throw Error('Clipboard not available');t.remove()};toast('Copied','success')}catch(e){toast('Copy failed: '+e.message,'error')}}
let verifiedINF=null;
async function chooseINF(){verifiedINF=null;const install=$('v52InstallINF');if(install)install.disabled=true;
 try{const out=await api('/api/drivers/browse-inf',{});if(out.status==='cancelled')return;
 if(!out.signature_valid)throw Error('Windows did not accept this driver catalog signature');
 verifiedINF=out.path;const area=$('v52INFStatus');if(area)area.textContent=(out.provider||'Unknown publisher')+' • '+(out.class||'Unspecified class')+' • Windows signature: valid. Hardware compatibility is NOT verified.';
 if(install)install.disabled=false;
 }catch(e){const area=$('v52INFStatus');if(area)area.textContent='Cannot use this driver: '+e.message;}}
async function installINF(){if(!verifiedINF)return;
 if(!confirm('Install this Windows-signed driver package using PnPUtil? Only proceed with a package from a trusted vendor for your exact device. Requires administrator permissions.'))return;
 const btn=$('v52InstallINF');btn.disabled=true;
 try{await api('/api/drivers/install-signed-inf',{path:verifiedINF,confirm:true});toast('Driver install job started. Watch Operations & Logs, then reconnect and scan your device.','info')}
 catch(e){toast('Driver install not started: '+e.message,'error')}finally{btn.disabled=false}}
function init(){const click=(id,fn)=>$(id)?.addEventListener('click',fn);
 click('v52ChooseINF',chooseINF);click('v52InstallINF',installINF);
 click('v52BrowseCommandFile',async()=>{try{const r=await api('/api/browse',{kind:'command-file'});if(!r.path)return;
  const input=$('v28ManualInput');if(!input)return;
  // Insert quoted argument; no command is executed by this browsing action.
  const quoted='"'+String(r.path).replaceAll('"','')+'"';input.value=(input.value.trim()?input.value.trim()+' ':'')+quoted;input.focus();
 }catch(e){toast('Cannot browse file: '+e.message,'error')}});
 click('v52RefreshDrivers',refresh);click('v52InstallTools',install);click('v52PlatformDocs',()=>openGuide('platform-tools'));
 click('v52DeviceManager',()=>openGuide('device-manager'));click('v52GoogleGuide',()=>openGuide('google-usb'));click('v52OEMGuide',()=>openGuide('oem-usb'));
 click('v52WindowsGuide',()=>openGuide('windows-update'));
 click('v52ScanDevice',()=>document.querySelector('[data-page="dashboard"]')?.click());
 click('v52CopyTelegram',()=>copy('v52TelegramText'));click('v52CopyEmail',()=>copy('v52EmailText'));
 document.querySelector('[data-page="drivers"]')?.addEventListener('click',()=>refresh());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
