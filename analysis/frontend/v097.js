/* V0.9.7 — additional safeguards and truthful inline status. */
(()=>{'use strict';
function init(){
 const source=document.getElementById('imageSourcePath'),scan=document.getElementById('scanImages');
 if(source&&scan){source.setAttribute('aria-label','Current ROM archive or image source; changing it requires a fresh scan');}
 const message=document.getElementById('v09ImageProgressText');
 if(message)message.setAttribute('aria-live','polite');
 const tg=document.getElementById('v09TelegramStatus');if(tg)tg.setAttribute('aria-live','polite');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
