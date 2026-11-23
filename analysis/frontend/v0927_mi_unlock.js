/* V0.9.35: Single Mi Account Login -> Fastboot -> actual Xiaomi Unlock.
   The installed MiForge CLI performs authentication and authorization through
   a private typed-prompt bridge. No fake OTP delivery, token, wait time or %. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
if(!$('v27LoginForm'))return;
let pendingSetup=false,setupJob='',driverJob='',busy=false,loginSent=false;
let loginVerified=false,connected=false,alreadyUnlocked=false,unsafeToProbe=false;
let awaiting='',lastLog='',lastSession=0,misses=0,phonePending=false,unlockReady=false;
let otpResending=false; // transient UI lock while the real Xiaomi prompt advances

// Credential entry is masked at rest; it is not a verified numeric Xiaomi account ID.
$('v47MiShow').onclick=()=>{const inp=$('v27MiID'),show=inp.type==='password';inp.type=show?'text':'password';$('v47MiShow').textContent=show?'Hide':'Show';$('v47MiShow').setAttribute('aria-pressed',String(show));if(loginVerified)refresh()};
function note(s,kind='info'){toast(s,kind)}
function show(id,on){$(id).hidden=!on}
function updateStatus(s){
  const active=!!s.running, installed=!!s.installed, verified=!!s.login_verified;
  loginVerified=verified;
  window.techOfficeMiRunning=()=>active||!!s.setup_running;
  awaiting=s.awaiting||'';
  unsafeToProbe=!!(s.phase&&/SERVER UNLOCK REQUEST|STAGING|UNLOCK REPORTED|VERIFY DEVICE/i.test(s.phase));
  if(s.unlock_verified_by_fastboot)alreadyUnlocked=true;
  $('v27UnlockState').textContent=s.phase||'NOT STARTED';
  const status=verified?'LOGIN SUCCESS':pendingSetup||s.setup_running?'SETTING UP':active?'LOGIN IN PROGRESS':installed?'READY':'SETUP REQUIRED';
  if($('v27LoginStatus').textContent!==status)$('v27LoginStatus').textContent=status;
  const numericID=verified&&/^\d{6,20}$/.test(s.verified_account_id||'')?s.verified_account_id:'';
  const miIDLabel=$('v47VerifiedMiAccount');miIDLabel.hidden=!verified;
  miIDLabel.textContent=numericID?'Numeric Mi Account ID: '+( $('v27MiID').type==='text'?numericID:'••••'+numericID.slice(-4)):'Numeric Mi Account ID: not provided by Xiaomi (login phone/email kept private)';
  $('v27LoginStart').disabled=busy||pendingSetup||!!s.setup_running||active||verified;
  $('v27LoginCancel').hidden=!(active&&!unsafeToProbe&&!verified);
  $('v47MiLogout').hidden=!(verified||active);
  $('v47MiLogout').disabled=unsafeToProbe||busy;
  if($('v0957RebootNormal'))$('v0957RebootNormal').disabled=!connected||unsafeToProbe||busy; // Never interrupt an actual unlock 
  {const msg=verified?'Login Successful':pendingSetup||s.setup_running?'Preparing…':active?'Login Running':'Log In';if($('v27LoginStart').textContent!==msg)$('v27LoginStart').textContent=msg;}
  $('v27MiID').disabled=active||verified;
  $('v27MiPassword').disabled=active||verified;
  const otpOpen=active&&!verified&&(awaiting==='otp'||!!s.otp_pending);
  show('v27OTPBox',otpOpen);
  show('v27ManualBox',active&&(awaiting==='manual'||awaiting==='account'||awaiting==='password'||awaiting==='resend'));
  const otpReady=awaiting==='otp';
  $('v27VerifyOTP').disabled=!otpReady;
  $('v27ResendOTP').hidden=!otpOpen;
  $('v27ResendOTP').disabled=!otpReady||otpResending;
  $('v27ResendOTP').textContent=otpResending?'Requesting…':'Resend Code';
  const destination=s.otp_delivery==='email'?'Check your email for the Xiaomi verification code.':s.otp_delivery==='phone'?'Check your phone / SMS for the Xiaomi verification code.':'Check your registered email or phone for the Xiaomi verification code.';
  $('v0958OTPDeliveryHint').textContent=otpReady?destination:destination+' Waiting for Xiaomi to request verification input; the OTP box stays open.';
  if(otpReady)otpResending=false;
  let prompt;
  if(verified)prompt='Login Success — Xiaomi account authorized. Connect your phone in Fastboot mode.';
  else if(otpOpen)prompt='Xiaomi OTP verification is still in progress. Keep this panel open after Resend; submit only when Verify OTP is enabled.';
  else if(active)prompt=s.phase||'Authenticating with Xiaomi; waiting for actual server response…';
  else if(s.setup_running||pendingSetup)prompt='Preparing the private login engine; Python 3 and internet needed the first time.';
  else if(s.error)prompt='Login client: '+s.error;
  else prompt=installed?'Enter Mi ID and password, then click Log In.':'Enter credentials and click Log In to prepare the login engine. On first setup, click Log In again after preparation.';
  $('v27LoginPrompt').textContent=prompt;
  if(awaiting==='manual')$('v27ManualMessage').textContent='Xiaomi requested an additional input. Read the Live Operation Log below, then answer here.';
  else if(awaiting==='resend')$('v27ManualMessage').textContent='Xiaomi limited OTP attempts. After the stated waiting time click Continue to request another code.';
  else if(awaiting==='account'||awaiting==='password')$('v27ManualMessage').textContent='Enter the requested Mi Account detail to continue securely.';
  $('v27PhoneStep').classList.toggle('v35-inactive',!verified);
  $('v27UnlockStep').classList.toggle('v35-inactive',!verified);
  $('v27DeviceStatus').textContent=!verified?'LOGIN FIRST':alreadyUnlocked?'ALREADY UNLOCKED':connected?'FASTBOOT CONNECTED':'WAITING FOR FASTBOOT';
  const actual=s.percent_available&&Number.isFinite(Number(s.percent));
  const p=s.unlock_verified_by_fastboot?100:actual?Math.max(0,Math.min(100,Number(s.percent))):0;
  $('v27UnlockFill').style.width=(s.unlock_verified_by_fastboot||actual?p:0)+'%';
  $('v27UnlockProgress').classList.toggle('indeterminate',active&&unsafeToProbe&&!actual&&!s.unlock_verified_by_fastboot);
  $('v27UnlockProgress').setAttribute('aria-valuenow',String(p));
  $('v27ProgressText').textContent=alreadyUnlocked?'Already Unlocked — no need to unlock again':s.unlock_verified_by_fastboot?'Bootloader UNLOCKED — verified with Fastboot':s.unlock_reported_by_cli?'Xiaomi client reported unlocking; verify device state':s.waiting?'Xiaomi reported a waiting period':actual?'Actual client progress: '+p+'%':unsafeToProbe?'Unlocking — waiting for real device/server result':verified?'Waiting for phone and Xiaomi authorization':'Waiting for account login';
  $('v27WaitingTime').textContent=s.waiting?'Xiaomi server waiting period: '+s.waiting:'Waiting time shown only if Xiaomi reports it.';
  $('v27ResultState').textContent=alreadyUnlocked?'ALREADY UNLOCKED':s.waiting?'WAITING PERIOD':s.unlock_verified_by_fastboot?'UNLOCKED':unsafeToProbe?'PROCESSING':awaiting==='unlock'?'READY TO UNLOCK':verified?'WAITING FOR PHONE':'LOGIN FIRST';
  unlockReady=active&&verified&&!!s.ready_to_unlock&&awaiting==='unlock';
  $('v27StartUnlock').disabled=!(unlockReady&&connected&&!alreadyUnlocked&&!busy);
  if($('v0957RebootNormal'))$('v0957RebootNormal').disabled=!connected||unsafeToProbe||busy;
  const log=Array.isArray(s.events)?s.events:[];
  let text=log.length?log.join('\n'):'No unlock session started.';
  if(s.error)text+='\nClient error: '+s.error;
  if(text!==lastLog){let el=$('v27UnlockLog'),follow=el.scrollHeight-el.scrollTop-el.clientHeight<50;el.textContent=text;if(follow)el.scrollTop=el.scrollHeight;lastLog=text}
  if(s.session!==lastSession&&s.session){lastSession=s.session;misses=0;connected=false;alreadyUnlocked=false;otpResending=false}
}
async function refresh(){if(!$('page-mi-unlock').classList.contains('shown'))return;
 try{const s=await api('/api/mi-unlock/cmd/status',{});updateStatus(s);
  if(setupJob){
   const jList=await api('/api/jobs',{});
   const j=(jList.jobs||[]).find(x=>x.id===setupJob);
   if((j&&['complete','failed','cancelled'].includes(j.status))||(s.installed&&!s.setup_running)){
     setupJob='';pendingSetup=false;
     if(s.installed||(j&&j.status==='complete'))note('Login engine ready. Enter your password and click Log In.','success');
     else note('Login setup failed: '+(j?.detail||s.error||'check Python/internet'),'error');
   }
  }
 }catch(e){$('v27LoginPrompt').textContent='Status unavailable: '+e.message}
}
async function login(ev){if(ev)ev.preventDefault();if(busy||pendingSetup)return;busy=true;
 const account=$('v27MiID').value.trim(),password=$('v27MiPassword').value;
 if(!account||!password){note('Enter Mi Account ID and password.','error');busy=false;return}
 $('v27LoginStart').disabled=true;
 try{
  const s=await api('/api/mi-unlock/cmd/status',{});
  if(!s.installed){pendingSetup=true;const j=await api('/api/mi-unlock/cmd/setup',{});setupJob=j.id||'setup';$('v27MiPassword').value='';$('v27LoginPrompt').textContent='First-time setup started. After completion enter password and click Log In again.';note('Preparing login engine; credentials have not been submitted.','info')}
  else{const data=await api('/api/mi-unlock/guided/login',{account,password});$('v27MiPassword').value='';loginSent=true;updateStatus(data);note('Xiaomi login started. OTP will appear if required.','info')}
 }catch(e){$('v27MiPassword').value='';$('v27LoginPrompt').textContent='Login: '+e.message;note(e.message,'error')}
 finally{busy=false;refresh()}
}
$('v27LoginCancel').addEventListener('click',async()=>{const yes=await modal('Cancel Mi Account Login?',warnBody(['Stop only the login/OTP process, not an active phone unlock.','Any partially completed Xiaomi login must be restarted.']),{accept:'Cancel Login',danger:false});if(!yes)return;try{await api('/api/mi-unlock/guided/cancel',{});note('Mi Account login cancelled.','info');await refresh()}catch(e){note('Cannot cancel login: '+e.message,'error')}});
$('v27LoginForm').addEventListener('submit',login);
$('v47MiLogout').addEventListener('click',async()=>{const ok=await modal('Log out of Xiaomi Account?',warnBody(['End the local Xiaomi CLI session and clear login state.','Only safe during authentication/authorization; active bootloader writes cannot be interrupted.']),{accept:'Log Out',danger:false});if(!ok)return;try{await api('/api/mi-unlock/guided/logout',{});loginSent=false;loginVerified=false;awaiting='';$('v27MiID').value='';$('v27MiPassword').value='';$('v27MiID').type='password';$('v47MiShow').textContent='Show';$('v47MiShow').setAttribute('aria-pressed','false');note('Local Xiaomi account session logged out.','success');await refresh()}catch(e){note('Logout not available: '+e.message,'error')}});
async function answer(kind,value){try{await api('/api/mi-unlock/guided/answer',{kind,value});return true}catch(e){note(e.message,'error');return false}}
$('v27OTPForm').addEventListener('submit',async(e)=>{e.preventDefault();const inp=$('v27MiOTP');const code=inp.value.trim();if(!code){note('Enter the code Xiaomi sent.','error');return}if(awaiting!=='otp'){note('Waiting for Xiaomi OTP input prompt; your code is kept in the field.','info');return}if(await answer('otp',code)){inp.value='';note('Verification code submitted to Xiaomi. Awaiting server response.','info');refresh()}});
$('v27ManualForm').addEventListener('submit',async(e)=>{e.preventDefault();const inp=$('v27ManualAnswer');const value=inp.value;inp.value='';if(await answer(awaiting,value)){show('v27ManualBox',false);refresh()}});
$('v27ResendOTP').addEventListener('click',async()=>{
 if(awaiting!=='otp'||otpResending)return;
 otpResending=true;$('v27ResendOTP').disabled=true;
 const ok=await answer('otp','r');
 if(ok){note('Resend requested from Xiaomi. OTP entry stays available; watch the delivery status.','info');await refresh()}
 else{otpResending=false;await refresh()}
});
async function probe(){if(phonePending||unsafeToProbe||!loginVerified||!$('page-mi-unlock').classList.contains('shown'))return;
 phonePending=true;
 try{const o=await api('/api/mi-unlock/phone',{});connected=!!o.connected;alreadyUnlocked=o.lock_state==='UNLOCKED';
  $('v27DeviceStatus').textContent=alreadyUnlocked?'ALREADY UNLOCKED':connected?'FASTBOOT CONNECTED':'WAITING FOR FASTBOOT';
  $('v27PhoneInfo').textContent=connected?'Connected: '+(o.product||'Xiaomi phone')+' · Bootloader: '+(o.lock_state||'UNKNOWN')+' · '+(o.serial_hint||''):'Connect your phone in Fastboot mode (Power + Volume Down). '+(o.note||'Check USB cable / port.');
  misses=connected?0:misses+1;show('v27DriverBox',!connected&&misses>=2);
  if(connected)show('v27ManualDriverHint',false);
  $('v27StartUnlock').disabled=!(unlockReady&&connected&&!alreadyUnlocked&&!busy);
  if($('v0957RebootNormal'))$('v0957RebootNormal').disabled=!connected||unsafeToProbe||busy;
  if(alreadyUnlocked){$('v27ResultState').textContent='ALREADY UNLOCKED';$('v27ProgressText').textContent='Already Unlocked — no need to unlock again'}
 }catch(e){connected=false;misses++;$('v27PhoneInfo').textContent='Fastboot detection failed: '+e.message;show('v27DriverBox',misses>=2)}
 finally{phonePending=false}
}
$('v0957ScanFastboot')?.addEventListener('click',async()=>{await refresh();await probe()});
$('v0957RebootNormal')?.addEventListener('click',async()=>{const b=$('v0957RebootNormal');b.disabled=true;try{const r=await api('/api/reboot',{target:'system'});note(r.result||'Reboot command sent','success');connected=false;await refresh()}catch(e){note('Reboot failed: '+e.message,'error')}finally{b.disabled=false}});
$('v27InstallDriver').addEventListener('click',async()=>{const b=$('v27InstallDriver');b.disabled=true;
 try{const r=await api('/api/mi-unlock/install-driver',{});
  if(r.status==='preparing'){driverJob=r.job?.id||'';$('v27DriverMessage').textContent='Preparing signed Xiaomi driver installer…';note('Driver package preparing.','info')}
  else{$('v27DriverMessage').textContent='Installer opened. Approve Windows prompt, complete setup, reconnect phone.';note('Complete the driver installation, then reconnect phone.','info')}
 }catch(e){$('v27DriverMessage').textContent='Driver: '+e.message;show('v27ManualDriverHint',true);note(e.message,'error')}
 finally{b.disabled=false}
});
async function driverStatus(){if(!driverJob)return;try{const r=await api('/api/jobs',{});const j=(r.jobs||[]).find(x=>x.id===driverJob);if(!j||j.status==='running')return;driverJob='';if(j.status==='complete'){const r=await api('/api/mi-unlock/install-driver',{});$('v27DriverMessage').textContent=r.message||'Driver installer started'}else{$('v27DriverMessage').textContent='Driver preparation failed: '+(j.detail||j.status);show('v27ManualDriverHint',true)}}catch(e){$('v27DriverMessage').textContent=e.message}}
$('v27StartUnlock').addEventListener('click',async()=>{
 if(!(loginVerified&&connected&&!alreadyUnlocked&&awaiting==='unlock')){note('Complete login, connect phone and wait for Xiaomi authorization prompt.','error');return}
 const ok=await modal('Confirm Bootloader Unlock',warnBody(['This usually wipes ALL personal data. Back up photos, files and accounts first.','Your phone must be linked to the same Xiaomi account, and Xiaomi waiting period/server permission must be satisfied.','Proceed with the real Xiaomi unlock request?']),{accept:'Unlock Phone',danger:true});if(!ok)return;
 busy=true;$('v27StartUnlock').disabled=true;
 try{if(await answer('unlock','')){unsafeToProbe=true;$('v27ResultState').textContent='PROCESSING';note('Unlock request authorized; waiting for real Xiaomi server/device result.','info')}}finally{busy=false;refresh()}
});
setInterval(()=>{refresh();probe();driverStatus()},2600);refresh();
})();
