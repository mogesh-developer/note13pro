/* V0.6 read-only OTA/Recovery ZIP safety inspector. This never flashes. */
'use strict';
async function inspectOTAFrom(inputId) {
 const input=document.getElementById(inputId);
 const path=input?.value?.trim();
 if(!path){toast('Choose a Recovery ZIP or payload.bin file first.','error');return;}
 const result=document.getElementById('otaInspectReport');
 if(result) result.textContent='Inspecting recovery package metadata...';
 try {
  const r=await api('/api/ota/inspect',{path});
  const lines=[`Format: ${r.format}`,`Type: ${r.kind}`,`Codename: ${r.codename}`,`Build: ${r.build}`,`Region: ${r.region}`,`OTA type: ${r.ota_type}`,`Contains payload.bin: ${r.has_payload?'YES':'NO'}`,`Payload header version: ${r.payload_version||'N/A'}`,`File entries: ${r.package_count||0}`];
  if(r.metadata){for (const k of ['pre-device','post-build','post-build-incremental','ota-type']) if(r.metadata[k]) lines.push(`${k}: ${r.metadata[k]}`);}
  for (const w of r.warnings||[]) lines.push('⚠ '+w);
  lines.push('⚠ Inspection only. No flash / sideload verification completed.');
  if(result) result.textContent=lines.join('\n');
  if(inputId==='imageSourcePath'){
   const output=document.getElementById('v099ExtractLog');
   if(output)output.textContent='OTA INSPECTION COMPLETE\n'+lines.join('\n');
   const badge=document.getElementById('v099JobStatus');if(badge)badge.textContent='INSPECTED';
   const bar=document.getElementById('v09ImageProgressFill');if(bar){bar.style.width='100%';bar.parentElement.classList.remove('indeterminate')}
   const percent=document.getElementById('v099ProgressPercent');if(percent)percent.textContent='100%';
   const detail=document.getElementById('v09ImageProgressText');if(detail)detail.textContent='Read-only OTA inspection completed. No IMG or phone changed.';
  }
  toast('Read-only OTA inspection complete. Review the report.','info');
  if(typeof refreshEmbeddedLogs==='function') refreshEmbeddedLogs();
 }catch(e){if(result) result.textContent='Inspection failed: '+e.message;
 if(inputId==='imageSourcePath'){
 const detail=document.getElementById('v09ImageProgressText');if(detail)detail.textContent='OTA inspection failed: '+e.message;
 const log=document.getElementById('v099ExtractLog');if(log)log.textContent+='\nINSPECTION FAILED: '+e.message;
 const badge=document.getElementById('v099JobStatus');if(badge)badge.textContent='FAILED';
 const bar=document.getElementById('v09ImageProgressFill');if(bar)bar.parentElement.classList.remove('indeterminate');
 }toast(e.message,'error')}
}
async function runReadOnlyPreflight(){
 const box=document.getElementById('preflightDiagnosticCard'),output=document.getElementById('preflightDiagnosticResult');
 box.hidden=false;output.textContent='Running read-only diagnostics...';
 try {const r=await api('/api/diagnostics/preflight');
  const lines=[`Device: ${r.device||'Unknown'}`,`Time: ${r.at}`];
  for(const c of r.checks||[])lines.push(`${c.status==='PASS'?'✓':c.status==='WARNING'?'⚠':'✕'} [${c.status}] ${c.name}: ${c.detail}`);
  lines.push('⚠ '+r.statement);output.textContent=lines.join('\n');
  toast('Read-only checks completed. See the diagnostic report.','info');
 }catch(e){output.textContent='Diagnostics unavailable: '+e.message;toast(e.message,'error')}
}
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('inspectRecoveryZIP')?.addEventListener('click',()=>inspectOTAFrom('sideloadPath'));
 document.getElementById('inspectImageOTA')?.addEventListener('click',()=>inspectOTAFrom('imageSourcePath'));
 document.getElementById('runReadOnlyPreflight')?.addEventListener('click',runReadOnlyPreflight);
});
