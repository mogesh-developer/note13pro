/* V0.9.28: inline Manual Command; existing back-end, no modal/console window. */
(()=>{
'use strict';
const id=n=>document.getElementById(n);
function init(){
 const manualTab=id('v0927ManualTab'),panel=id('v28ManualPanel'),form=id('v28ManualForm'),input=id('v28ManualInput'),status=id('v28ManualStatus'),run=id('v28ManualGo');
 if(!manualTab||!panel||!form||!input||!status||!run)return;
 let currentJob='',working=false;
 manualTab.addEventListener('click',()=>{
  document.querySelectorAll('[data-v093-cmd-tab]').forEach(b=>b.classList.remove('primary'));
  manualTab.classList.add('primary');id('v093InfoPanel').hidden=true;id('v093ActionsPanel').hidden=true;
  panel.hidden=false;input.focus();
 });
 document.querySelectorAll('[data-v093-cmd-tab]').forEach(b=>b.addEventListener('click',()=>{
  manualTab.classList.remove('primary');panel.hidden=true;
 }));
 async function runCommand(command,label='Manual'){
  if(working)return;
  command=String(command||'').trim();if(!command){status.textContent='Enter a command first.';input.focus();return;}
  working=true;run.disabled=true;status.textContent='Submitting '+label+' command...';
  try{
   const job=await api('/api/commands/manual',{command,confirm:true});
   currentJob=job.id;
   id('v09CommandResult').textContent=label+' command submitted. Waiting for device output...';
   status.textContent='Running '+label+' command. See Command Output / Results.';
   if(label==='Manual')input.value='';
   toast(label+' command running. Output appears below.','info');
  }catch(err){
   id('v09CommandResult').textContent=label+' command failed: '+err.message;
   status.textContent='Command not started: '+err.message;toast(err.message,'error');
  }finally{working=false;run.disabled=false;}
 }
 form.addEventListener('submit',async e=>{e.preventDefault();await runCommand(input.value.trim())});
 // Saved named commands use the SAME backend job and shared output. No new tab,
 // log, shell, or command execution path is introduced.
 const create=id('v0957CreateAction'),dlg=id('v0957ActionDialog'),dlgForm=id('v0957ActionForm'),list=id('v0957SavedActions');
 if(create&&dlg&&dlgForm&&list){
  const close=()=>{dlg.hidden=true};
  const show=()=>{id('v0957ActionName').value='';id('v0957ActionCommand').value=input.value.trim();dlg.hidden=false;id('v0957ActionName').focus()};
  id('v0957CloseAction').onclick=close;id('v0957CancelAction').onclick=close;
  create.onclick=show;
  function render(actions){
   list.replaceChildren();
   for(const a of actions){
    const group=document.createElement('span');group.className='v0957-saved-group';
    const play=document.createElement('button');play.type='button';play.className='btn tiny';play.textContent=a.name;play.title=a.command;
    play.onclick=()=>runCommand(a.command,a.name);
    const del=document.createElement('button');del.type='button';del.className='v0957-delete-action';del.textContent='×';del.title='Delete '+a.name;
    del.onclick=async()=>{try{const r=await api('/api/actions/delete',{name:a.name});render(r.actions||[]);toast('Saved action removed','info')}catch(err){toast(err.message,'error')}};
    group.append(play,del);list.append(group);
   }
  }
  async function reload(){try{const r=await api('/api/actions/list',{});render(r.actions||[])}catch(err){status.textContent='Saved actions unavailable: '+err.message}}
  dlgForm.addEventListener('submit',async e=>{
   e.preventDefault();const name=id('v0957ActionName').value.trim(),command=id('v0957ActionCommand').value.trim();
   try{const r=await api('/api/actions/save',{name,command});render(r.actions||[]);close();toast('Custom action saved; no command executed','success')}
   catch(err){toast('Cannot save action: '+err.message,'error')}
  });
  reload();
  manualTab.addEventListener('click',reload);
 }
 let polling=false;
 setInterval(async()=>{
  if(polling||!currentJob||!id('page-commands').classList.contains('shown'))return;
  polling=true;
  try{
   const resp=await api('/api/jobs'),job=(resp.jobs||[]).find(j=>j.id===currentJob);if(!job)return;
   id('v09CommandResult').textContent=[job.kind,job.status.toUpperCase(),job.detail||'',...(job.lines||[])].join('\n');
   if(job.status!=='running'){
    status.textContent='Last command: '+job.status+'. Enter another command when ready.';
    currentJob='';
   }
  }catch(err){status.textContent='Unable to refresh output: '+err.message;}
  finally{polling=false;}
 },900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
