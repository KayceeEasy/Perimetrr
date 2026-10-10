/* Generate workspace QR images in the browser. Pairing links are never sent to an image service.
 * qrcode-generator 1.4.4 by Kazuhiko Arase (MIT), loaded only when QR is requested.
 */
let workspaceQrLibraryPromise = null;
async function getWorkspaceQrDataUrl(joinUrl) {
 const url = new URL(joinUrl, window.location.origin);
 if (!['http:','https:'].includes(url.protocol) || ![window.location.origin, 'https://perimetrr.com'].includes(url.origin)) throw new Error('Only Perimetrr workspace links can be shared.');
 if (!window.qrcode) {
  if (!workspaceQrLibraryPromise) workspaceQrLibraryPromise = new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
   script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';
   const timer=setTimeout(()=>{script.remove();reject(new Error('QR generator timed out. You can still share the workspace link.'));},15000);
   script.onload=()=>{clearTimeout(timer);typeof window.qrcode==='function'?resolve():reject(new Error('QR generator unavailable.'));};
   script.onerror=()=>{clearTimeout(timer);reject(new Error('QR generator could not load. Check your connection; you can still share the workspace link.'));};
   document.head.append(script);
  }).catch(error=>{workspaceQrLibraryPromise=null;throw error;});
  await workspaceQrLibraryPromise;
 }
 const qr=window.qrcode(0,'M');qr.addData(url.href,'Byte');qr.make();
 const modules=qr.getModuleCount(),scale=6,border=4;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=(modules+border*2)*scale;
 const context=canvas.getContext('2d');if(!context)throw new Error('QR image rendering is unavailable.');
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#000';
 for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))context.fillRect((col+border)*scale,(row+border)*scale,scale,scale);
 return canvas.toDataURL('image/png');
}
