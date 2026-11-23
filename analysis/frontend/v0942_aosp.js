/* V0.9.42: customer-safe curated AOSP project directory (no ROM downloads/flashing). */
'use strict';
(() => {
const byId = id => document.getElementById(id);
let entries = [];
const statuses = {
 downloads: ['Download catalog','downloads','Open Downloads ↗'],
 paid: ['Some paid releases','paid','Open Downloads ↗'],
 source: ['Project source only','source','Open Project Source ↗'],
 legacy: ['Legacy / check dates','legacy','Open Project Site ↗'],
 closed: ['Discontinued / closed','closed','Open Archive / Site ↗']
};
function render() {
 const grid=byId('aospGrid');if(!grid)return;
 const shown=entries;
 grid.replaceChildren();
 byId('aospCount').textContent=entries.length+' official project links';
 if(!shown.length){const e=document.createElement('div');e.className='aosp-empty';e.textContent='No projects match this search.';grid.append(e);return}
 for(const item of shown){
  const [status,kind,action]=statuses[item.kind]||statuses.source;
  const card=document.createElement('article');card.className='aosp-entry';
  const head=document.createElement('div');head.className='aosp-entry-header';
  const name=document.createElement('strong');name.className='aosp-entry-title';name.textContent=item.name;
  const flag=document.createElement('span');flag.className='aosp-status '+kind;flag.textContent=status;
  const desc=document.createElement('div');desc.className='aosp-entry-note';desc.textContent=item.note;
  const btn=document.createElement('button');btn.type='button';btn.className='btn primary tiny';btn.textContent=action;
  btn.setAttribute('aria-label',action+' - '+item.name);
  const open=async()=>{
   btn.disabled=true;const old=btn.textContent;btn.textContent='Opening…';
   try{await api('/api/aosp-roms/open',{id:item.id});}
   catch(e){toast('Could not open '+item.name+': '+e.message,'error')}
   finally{btn.disabled=false;btn.textContent=old}
  };
  btn.addEventListener('click',open);
  card.setAttribute('role','button');card.tabIndex=0;card.addEventListener('click',e=>{if(e.target!==btn)open()});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  head.append(name,flag);card.append(head,desc,btn);grid.append(card);
 }
}
async function start(){
 const grid=byId('aospGrid');if(!grid)return;
 byId('aospSearch')?.addEventListener('input',render);
 byId('aospFilter')?.addEventListener('change',render);
 try{
  const response=await fetch('/api/aosp-roms',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.projects)||data.projects.length!==23)throw Error('incomplete official ROM directory');
  entries=data.projects;render();
 }catch(e){byId('aospCount').textContent='Unavailable';grid.textContent='ROM project list could not be loaded: '+e.message}
}
document.addEventListener('DOMContentLoaded', start);
})();
