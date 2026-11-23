/* Public browser compose support; no Cloudflare ticket backend or mailbox secrets. */
(()=>{'use strict';
const $=id=>document.getElementById(id), email='techofficexiaomiservice@gmail.com', telegram='@Techoffice_official';
function getVersion(){return (document.querySelector('.top-title .version')?.textContent||'V0.9.47').trim()}
function body(){return '[TECH OFFICE XIAOMI] [CUSTOMER SUPPORT]\nTool: Tech Office Xiaomi Service\nVersion: '+getVersion()+'\nCustomer: '+$('supportCustomerName').value.trim()+'\nReply Email: '+$('supportCustomerEmail').value.trim()+'\n\nProblem / Payment Details:\n'+($('supportCustomerMessage').value.trim()||'[Enter your problem here]')}
function validate(){const name=$('supportCustomerName'),emailField=$('supportCustomerEmail'),msg=$('supportCustomerMessage'); if(!name.value.trim()){name.focus();status('Enter your name before opening support.');return false}if(!emailField.value.trim()||!emailField.checkValidity()){emailField.focus();status('Enter a valid reply email address.');return false}if(!msg.value.trim()){msg.focus();status('Write your support message first.');return false}return true}
function status(v){$('supportChannelStatus').textContent=v}
async function copy(text,desc){try{await navigator.clipboard.writeText(text);status(desc+' copied to clipboard.')}catch(e){status('Clipboard unavailable. Copy the visible support details manually.')}}
async function open(channel){if(!validate())return;const message=body(),subject='[TECH OFFICE XIAOMI] [CUSTOMER SUPPORT] '+getVersion();
 try{await api('/api/contact/open',{channel,subject,body:message});status((channel==='gmail'?'Gmail Compose opened. Attach files there and press Send.':'Telegram chat opened. Press Send there.')+' This tool does not claim delivery.')}catch(e){status('Cannot open '+channel+': '+e.message+'. Use Copy Support Message and the visible contact address.')}}
document.addEventListener('DOMContentLoaded',()=>{if(!$('supportOpenGmail'))return;
 $('supportOpenGmail').onclick=()=>open('gmail');$('supportOpenTelegram').onclick=()=>open('telegram');
 $('supportCopyMessage').onclick=()=>{if(validate())copy(body(),'Support message')};$('supportCopyEmail').onclick=()=>copy(email,'Email address');$('supportCopyTelegram').onclick=()=>copy(telegram,'Telegram username');
});
})();
