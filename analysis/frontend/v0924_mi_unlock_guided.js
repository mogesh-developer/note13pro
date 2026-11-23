/* V0.9.24 -- Integrated local Xiaomi unlock session (TEST).
   The original Mi Unlock owns the secure account, token exchange,
   permission check, signed unlock command and real progress percentage. */
(()=>{
 'use strict';
 const get=id=>document.getElementById(id);
 const integrated=get('miuIntegratedScreen'),original=get('miuOriginalScreen');
 if(!integrated||!original)return;
 let lastStage='';
 function tab(which){
  const on=which==='integrated';
  integrated.hidden=!on;original.hidden=on;
  get('miuIntegratedTab').classList.toggle('primary',on);
  get('miuOriginalTab').classList.toggle('primary',!on);
  get('miuIntegratedTab').setAttribute('aria-pressed',String(on));
  get('miuOriginalTab').setAttribute('aria-pressed',String(!on));
 }
 function statusNote(msg,type='info'){
  if(typeof toast==='function')toast(msg,type);
  get('miuIntCurrent').textContent=msg;
 }
 function updateStep(id,detail,ready){
  get(id).querySelector('span').textContent=detail;
  get(id).classList.toggle('miu-step-ready',!!ready);
 }
 function render(r){
  const d=r.observation||{};
  const running=!!r.native_running;
  const p=r.phase||'NOT STARTED';
  get('miuIntegratedState').textContent=p;
  get('miuIntCurrent').textContent=r.active?(running?'Original Xiaomi Mi Unlock is running. Complete sign-in and Unlock in its window.':(r.native_message||'Xiaomi client is closed. Check the device result.')):'Integrated session not started. Prepare ZIP, then start.';
  get('miuIntDeviceDetails').textContent=d.connected?`Fastboot: ${d.serial_hint||'connected'} · Product: ${d.product||'unknown'} · Bootloader: ${d.lock_state||'UNKNOWN'}`:(d.note||'Fastboot device status not checked');
  get('miuIntServer').textContent='Mi Account / server authorization / genuine unlock %: only in the Xiaomi window (not exposed by the OEM program).';
  updateStep('miuIntStep1',get('miuStatusBadge').textContent==='PACKAGE READY'?'Original package ready':'Prepare original ZIP first',get('miuStatusBadge').textContent==='PACKAGE READY');
  updateStep('miuIntStep2',running?'Xiaomi account window running — server permission not observable':(r.active?'Xiaomi program closed — server result unknown':'Sign in in the original Xiaomi window'),running);
  updateStep('miuIntStep3',d.connected?`${d.product||'Fastboot phone'} · ${d.serial_hint||''}`:'Waiting for Fastboot phone',!!d.connected);
  const unlocked=d.connected&&d.lock_state==='UNLOCKED';
  updateStep('miuIntStep4',unlocked?(r.observed_lock_transition?'LOCKED → UNLOCKED confirmed by Fastboot':'UNLOCKED reported by Fastboot'):'Not verified; Xiaomi app has true progress',unlocked);
  get('miuIntStart').disabled=running;
  get('miuIntProbe').disabled=running;
  const events=Array.isArray(r.events)?r.events:[];
  get('miuIntLog').textContent=events.length?events.join('\n'):'No integrated workflow events yet.';
  if(r.phase!==lastStage)lastStage=r.phase;
 }
 async function refresh(){try{const r=await api('/api/mi-unlock/integrated/status',{});render(r)}catch(e){get('miuIntegratedState').textContent='STATUS ERROR';get('miuIntLog').textContent=e.message}}
 async function start(){
  try{
   const r=await api('/api/mi-unlock/integrated/start',{});
   render(r);statusNote('Original Xiaomi client opened. Login, server token and unlock % are inside its native window.','success');
  }catch(e){statusNote(e.message,'error')}
 }
 async function probe(){
  get('miuIntProbe').disabled=true;
  try{
   const r=await api('/api/mi-unlock/integrated/probe',{});render(r.workflow);
   const d=r.device||{};
   if(d.connected)statusNote(`Fastboot ${d.serial_hint||'connected'} · ${d.lock_state||'UNKNOWN'}`,d.lock_state==='UNLOCKED'?'success':'info');
   else statusNote(d.note||'Phone not detected in Fastboot mode');
  }catch(e){statusNote('Fastboot check: '+e.message,'error')}
  finally{get('miuIntProbe').disabled=false}
 }
 async function reset(){
  try{const r=await api('/api/mi-unlock/integrated/reset',{});render(r);statusNote('Test view reset. Xiaomi program, if running, was not interrupted.')}catch(e){statusNote(e.message,'error')}
 }
 get('miuIntegratedTab').addEventListener('click',()=>tab('integrated'));
 get('miuOriginalTab').addEventListener('click',()=>tab('original'));
 get('miuIntStart').addEventListener('click',start);
 get('miuIntProbe').addEventListener('click',probe);
 get('miuIntReset').addEventListener('click',reset);
 get('miuIntDriver').addEventListener('click',()=>{
  // Existing official installer workflow, not a new driver process.
  tab('original');get('miuInstallDriver').click();
 });
 tab('integrated');
 setInterval(()=>{if(!get('page-mi-unlock').classList.contains('shown'))return;refresh()},2400);
 refresh();
})();
