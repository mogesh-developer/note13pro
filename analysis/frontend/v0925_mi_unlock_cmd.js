/* Tech Office V0.9.25 — independent GitHub CMD Mi Unlock tab.
   Observes *real* MiForge CLI stdout/stderr; does not fabricate progress. */
(()=>{
 'use strict';
 const get=id=>document.getElementById(id);
 const cmdTab=get('miuCmdTab'),screen=get('miuCmdScreen'),integrated=get('miuIntegratedScreen'),original=get('miuOriginalScreen');
 if(!cmdTab||!screen||!integrated||!original)return;
 function activate(which){
  const on=which==='cmd';
  screen.hidden=!on;
  if(on){integrated.hidden=true;original.hidden=true}
  cmdTab.classList.toggle('primary',on);
  cmdTab.setAttribute('aria-pressed',String(on));
  if(on){for(const id of ['miuIntegratedTab','miuOriginalTab']){get(id).classList.remove('primary');get(id).setAttribute('aria-pressed','false')}}
 }
 cmdTab.addEventListener('click',()=>{activate('cmd');refresh()});
 for(const id of ['miuIntegratedTab','miuOriginalTab'])get(id).addEventListener('click',()=>activate('other'));
 let pendingSetup=false;
 let lastEvents='';
 function render(s){
  const active=!!s.running,ready=!!s.installed;
  get('miuCmdState').textContent=s.phase|| (ready?'READY':'SETUP REQUIRED');
  get('miuCmdInstallStatus').textContent=ready?`MiForge MiUnlockTool ${s.provider_version||''} prepared`:(s.python||'Python and CLI setup needed');
  get('miuCmdSetup').disabled=active||!!s.setup_running||pendingSetup||ready;
  get('miuCmdStart').disabled=!ready||active||!!s.setup_running;
  get('miuCmdSend').disabled=!active;
  get('miuCmdAnswer').disabled=!active;
  get('miuCmdVerify').disabled=active;
  const actual=s.percent_available&&Number.isFinite(Number(s.percent));
  const done=!!s.unlock_verified_by_fastboot;
  const bar=get('miuCmdProgressFill'),track=get('miuCmdProgressTrack');
  bar.classList.toggle('miu-cmd-indeterminate',active&&!actual);
  bar.style.width=done?'100%':actual?`${Math.min(100,Math.max(0,Number(s.percent)))}%`:(active?'38%':'0%');
  track.setAttribute('aria-valuenow',done?'100':actual?String(s.percent):'0');
  get('miuCmdProgressText').textContent=done?'100% · Fastboot verified':actual?`${s.percent}% · CLI reported`:active?'In progress · Waiting for actual CLI output':(s.waiting?'Xiaomi server waiting period':'No active unlock progress');
  get('miuCmdWaiting').textContent=s.waiting?`Server waiting period: ${s.waiting}`:'Waiting time: only displayed when Xiaomi reports it';
  const note=s.error?` · ${s.error}`:'';
  get('miuCmdResult').textContent=done?'UNLOCKED · Verified by Fastboot':s.unlock_reported_by_cli?'CLI reported unlock — verify device':(s.phase||'Not started')+note;
  const events=Array.isArray(s.events)?s.events:[];
  const content=events.length?events.join('\n'):'No CMD session yet. Prepare MiForge CLI first, then start.';
  if(lastEvents!==content){const el=get('miuCmdLog');const follow=(el.scrollHeight-el.scrollTop-el.clientHeight)<48;el.textContent=content; if(follow)el.scrollTop=el.scrollHeight;lastEvents=content}
 }
 async function refresh(){
  if(screen.hidden)return;
  try{render(await api('/api/mi-unlock/cmd/status',{}))}catch(e){get('miuCmdResult').textContent='CMD status: '+e.message}
 }
 async function setup(){
  pendingSetup=true;get('miuCmdSetup').disabled=true;
  try{await api('/api/mi-unlock/cmd/setup',{});get('miuCmdInstallStatus').textContent='One-time Python CLI installation started. Check Jobs / Logs while it runs.';}
  catch(e){get('miuCmdInstallStatus').textContent='Setup: '+e.message}
  finally{pendingSetup=false;setTimeout(refresh,800)}
 }
 async function start(){
  try{render(await api('/api/mi-unlock/cmd/start',{}));get('miuCmdResult').textContent='Actual MiUnlockTool CMD session started'}
  catch(e){get('miuCmdResult').textContent='Start failed: '+e.message}
 }
 async function submit(){
  const input=get('miuCmdAnswer');const value=input.value;
  try{await api('/api/mi-unlock/cmd/input',{value});input.value='';input.focus();get('miuCmdResult').textContent='Answer forwarded to CMD; not stored in logs.'}
  catch(e){get('miuCmdResult').textContent='Input: '+e.message}
 }
 async function verify(){
  try{const r=await api('/api/mi-unlock/cmd/verify',{});render(r.workflow);const d=r.device||{};get('miuCmdResult').textContent=d.connected?`Device ${d.product||''} · Bootloader: ${d.lock_state||'UNKNOWN'}`:(d.note||'Fastboot device not found')}
  catch(e){get('miuCmdResult').textContent='Verify: '+e.message}
 }
 get('miuCmdSetup').addEventListener('click',setup);
 get('miuCmdStart').addEventListener('click',start);
 get('miuCmdSend').addEventListener('click',submit);
 get('miuCmdAnswer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
 get('miuCmdVerify').addEventListener('click',verify);
 get('miuCmdDrivers').addEventListener('click',()=>{get('miuOriginalTab').click();get('miuInstallDriver').click()});
 setInterval(()=>{if(!get('page-mi-unlock').classList.contains('shown')||screen.hidden)return;refresh()},1900);
 refresh();
})();
