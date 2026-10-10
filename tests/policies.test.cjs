const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('policies are published and signup acceptance is explicit, not bundled marketing',()=>{
 for(const slug of ['privacy','terms','cookies','refunds']){
  assert.match(read(`${slug}/index.html`),/<h1>/);
  assert.ok(read('sitemap.xml').includes(`https://perimetrr.com/${slug}/`));
  assert.ok(read('onboard/index.html').includes(`href="/${slug}/"`));
 }
 assert.match(read('privacy/index.html'),/Kenneth Omeh/);
 assert.match(read('privacy/index.html'),/Chevron Drive, Lekki, Lagos, Nigeria/);
 assert.match(read('terms/index.html'),/support@perimetrr.com/);
 assert.doesNotMatch(read('onboard/index.html'),/id="onboard-terms"[^>]*checked/);
 assert.match(read('onboard/onboard.js'),/if \(!agreement\?\.checked\)/);
 assert.match(read('enterprise/enterprise.js'),/if\(!agreement.checked\)/);
 assert.doesNotMatch(read('common.js')+read('script.js'),/logAnalyticsEvent|mode: 'log-analytics'/);
});
test('legal reading colours meet normal-text contrast and have keyboard focus',()=>{
 const linear=n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;};
 const lum=hex=>{const c=hex.match(/\w\w/g).map(v=>linear(parseInt(v,16)));return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 for(const colour of ['edf3f9','b8c5d6','27fb8a'])assert.ok(ratio(colour,'0f1b2d')>=4.5);
 assert.ok(ratio('526174','f4f6f5')>=4.5);
 assert.match(read('legal.css'),/:focus-visible/);
});
