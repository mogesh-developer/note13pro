/* Tech Office v0.9.56: select ZIP -> auto extract -> detect BAT -> choose -> run unchanged original script. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let scripts=[],jobID='',extractID='',polling=false,lastLog='',lastArchive='',promptOpen=false,lastPrompt='',promptCandidate='',promptStable=0;
function status(text){$('hybridAutoStatus').textContent=text;}
function fail(e){const m=e?.message||String(e);toast(m,'error');status('Operation failed: '+m);$('hybridState').textContent='ERROR';}
function selected(){return scripts.find(x=>x.path===$('hybridScripts').value);}
function setReady(){const ready=!!selected()&&!extractID&&!jobID;$('hybridStart').disabled=!ready;$('hybridStop').disabled=!jobID;$('hybridOpenPrompt').disabled=!jobID;}
function choices(){const s=selected(),holder=$('hybridChoices');holder.replaceChildren();if(!s)return;
 const opts=(s.menu||[]).map(item=>{const m=/^\s*([0-9]{1,2})\s*[.):-]?\s*(.+)/.exec(item);return m?{value:m[1],label:item}:null}).filter(Boolean);
 if(opts.length){const heading=document.createElement('span');heading.className='small muted';heading.textContent='BAT menu choice (requested when original script prompts):';holder.append(heading);
  for(const opt of opts){const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='hybridMenuChoice';radio.value=opt.value;label.append(radio,document.createTextNode(opt.label));holder.append(label);}
 }
 $('hybridSummary').textContent='Detected: '+s.name+' • '+s.mode+(s.interactive?' • Interactive BAT':' • No static prompt detected');
}
function showScripts(response){scripts=response?.scripts||[];const sel=$('hybridScripts');sel.replaceChildren();$('hybridDetectedPanel').hidden=!scripts.length;
 if(!scripts.length){status('No BAT/CMD found in this ZIP. No file was flashed. Please check the ROM archive.');setReady();return;}
 scripts.forEach(s=>sel.add(new Option(s.name+' — '+s.mode,s.path)));
 sel.value=scripts[0].path;choices();setReady();status('Detected '+scripts.length+' BAT/CMD installer(s). Choose a method, then press Flash.');
 toast('Hybrid ROM ready: '+scripts.length+' BAT/CMD installer(s).','success');
}
async function inspect(folder){const r=await api('/api/hybrid/inspect',{folder});showScripts(r)}
async function extract(){const zip=$('hybridZIP').value.trim();if(!/\.zip$/i.test(zip)){status('Select a .zip hybrid ROM first.');return;}
 if(extractID||jobID){toast('An extraction or flashing job is already running.','info');return;}
 if(zip===lastArchive&&scripts.length)return;
 scripts=[];$('hybridDetectedPanel').hidden=true;setReady();
 try{const j=await api('/api/hybrid/extract',{archive:zip});lastArchive=zip;extractID=j.id;lastLog='';$('hybridState').textContent='EXTRACTING';status('Extracting ZIP and detecting BAT automatically…');$('hybridOutput').textContent='ROM: '+zip+'\nExtracting and scanning original installation scripts…';setReady();}
 catch(e){lastArchive='';fail(e)}
}
async function browse(){if(extractID||jobID){toast('Wait until the current operation finishes.','info');return;}
 try{const r=await api('/api/browse',{kind:'zip'});if(!r.path)return;$('hybridZIP').value=r.path;lastArchive='';extract();}catch(e){fail(e)}
}
function closePrompt(){promptOpen=false;$('hybridPromptOverlay').hidden=true;}
function openPrompt(text){if(!jobID)return;promptOpen=true;$('hybridPromptOverlay').hidden=false;$('hybridPromptText').textContent=text||'Original BAT is waiting for a response. Check the universal live log.';
 const pick=document.querySelector('input[name="hybridMenuChoice"]:checked');$('hybridPromptAnswer').value=pick?.value||'';$('hybridPromptAnswer').focus();}
async function reply(value){if(!jobID){toast('No active Hybrid BAT process.','error');return;}
 const val=String(value??$('hybridPromptAnswer').value).trim();if(!val||val.length>100||/[\r\n\x00]/.test(val)){toast('Enter one valid response.','error');return;}
 try{await api('/api/hybrid/reply',{job_id:jobID,answer:val});closePrompt();lastPrompt=promptCandidate||lastPrompt;status('Reply sent to original BAT. Follow its universal log.');}
 catch(e){toast('BAT response failed: '+e.message,'error')}
}
function getPrompt(log){const lines=log.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean),tail=lines.slice(-1)[0]||'';
 if(!tail||tail.length>230||/^\[?(?:STATUS|RUNNING|COMPLETE|DONE|ERROR|INFO)\]?/i.test(tail))return '';
 // The original script may produce an unfinished prompt without a newline.
 const sign=/\b(?:y\s*\/\s*n|yes\s*\/\s*no|continue\s*\?|choose\s*(?:a|an|the|your)?\s*(?:option|mode|number)|select\s*(?:a|an|the)?\s*(?:option|mode|number)|enter\s*(?:your|the)?\s*(?:choice|option|number)|press\s+(?:any|[yYnN])\s+key)\b/i;
 const question=/[?:)>\]]\s*$/.test(tail);
 return sign.test(tail)&&(question||/\bpress\b/i.test(tail))?tail:'';
}
function promptWatcher(log){if(!jobID||promptOpen)return;const found=getPrompt(log);
 if(!found){promptCandidate='';promptStable=0;return;}
 if(found===lastPrompt)return;
 if(found===promptCandidate)promptStable++;else{promptCandidate=found;promptStable=1;}
 if(promptStable>=2){lastPrompt=found;openPrompt(found);}
}
async function run(){const s=selected();if(!s){toast('Select a detected BAT first.','error');return;}
 const warnings=['You chose an ORIGINAL third-party script: '+s.name,'Source: '+s.path,'This BAT may write partitions, erase user data, install kernels or run other PC commands.','The tool does not rewrite or emulate commands. Only run ROMs you trust.','Successful process exit does not guarantee a bootable device.'];
 if(!await modal('Hybrid ROM — Review BAT',warnBody(warnings),{accept:'Review & Continue',danger:true}))return;
 const d=typeof device!=='undefined'?device:{};
 if(!await modal('Start Original Hybrid BAT?',warnBody(['Device: '+(d.model||'Unknown')+' • '+(d.mode||'Unknown'),'Original BAT: '+s.name,'Flashing starts only if you confirm. Interactive BAT prompts will appear in a popup when detected.']),{accept:'START ORIGINAL BAT',danger:true}))return;
 try{const j=await api('/api/hybrid/start',{script:s.path,confirm:'RUN ORIGINAL HYBRID BAT'});
 jobID=j.id;lastLog='';lastPrompt='';promptCandidate='';promptStable=0;
 $('hybridOutput').textContent='Executing original BAT: '+s.name+'\nWaiting for live output…';$('hybridState').textContent='RUNNING';setReady();status('Original BAT running. Watch the single live log and reply to prompts.');}
 catch(e){fail(e)}
}
async function stop(){if(!jobID)return;
 if(!await modal('Stop Original BAT?',warnBody(['Stopping does not undo partitions already flashed.','Interrupting an active device write may leave the phone unbootable.']),{accept:'Request Stop',danger:true}))return;
 try{await api('/api/hybrid/cancel',{job_id:jobID});toast('Stop requested.','info')}catch(e){fail(e)}
}
async function poll(){if(polling||!$('page-recovery')?.classList.contains('shown')||$('v40HybridPanel')?.hidden||(!jobID&&!extractID))return;
 polling=true;try{const r=await api('/api/jobs'),jobs=r.jobs||[];
 if(extractID){const j=jobs.find(x=>x.id===extractID);if(j){$('hybridState').textContent=(j.status||'').toUpperCase();status('Extracting: '+(j.detail||'Please wait…'));
 if(j.status==='complete'){extractID='';try{if(!j.output_dir)throw new Error('Extraction completed without an output folder');await inspect(j.output_dir)}catch(e){lastArchive='';fail(e)}setReady();}
 else if(j.status==='failed'||j.status==='canceled'){extractID='';lastArchive='';setReady();fail(j.detail||'Extraction failed');}
 }}
 if(jobID){const j=jobs.find(x=>x.id===jobID);if(j){$('hybridState').textContent=(j.status||'').toUpperCase();const log=(j.lines||[]).join('');
 if(log!==lastLog){lastLog=log;$('hybridOutput').textContent=log||'Waiting for first BAT output…';$('hybridOutput').scrollTop=$('hybridOutput').scrollHeight;}
 if(j.status==='running')promptWatcher(lastLog);
 else{jobID='';closePrompt();setReady();$('hybridOutput').textContent+='\n\nFINAL: '+j.status+'\n'+(j.detail||'')+'\nVerify the ROM boots correctly before concluding success.';status('BAT job: '+j.status);toast('Hybrid BAT: '+j.status,j.status==='failed'?'error':'info');}
 }}
 }catch(e){status('Cannot update job: '+e.message)}finally{polling=false}
}
function init(){if(!$('hybridZIP'))return;
 $('hybridPickZIP').onclick=browse;
 $('hybridZIP').addEventListener('change',()=>{lastArchive='';extract()});
 $('hybridZIP').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lastArchive='';extract()}});
 $('hybridScripts').onchange=()=>{choices();setReady()};$('hybridStart').onclick=run;$('hybridStop').onclick=stop;$('hybridOpenPrompt').onclick=()=>openPrompt(lastLog.slice(-450));
 $('hybridPromptYes').onclick=()=>reply('Y');$('hybridPromptNo').onclick=()=>reply('N');$('hybridPromptSend').onclick=()=>reply();$('hybridPromptDismiss').onclick=closePrompt;
 $('hybridPromptAnswer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();reply()}};
 const guide=$('guidePinnedOpen');if(guide)guide.onclick=async()=>{try{await api('/api/open-social',{url:'https://www.youtube.com/playlist?list=PLeSNLpZckrzo'})}catch(e){toast(e.message,'error')}};
 setInterval(poll,1500);setReady();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
