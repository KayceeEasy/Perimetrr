const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {publicFiles}=require('../tools/public-files.cjs');
const root=path.resolve(__dirname,'..');
test('onboarding shares the permanent production domain, never a hosting preview address',()=>{
  const script=fs.readFileSync(path.join(root,'onboard/onboard.js'),'utf8');
  const success=script.slice(script.indexOf('function showSuccessScreen('),script.indexOf('async function openQrModal('));
  assert.match(success,/const origin = 'https:\/\/perimetrr\.com'/);
  assert.doesNotMatch(success,/window\.location\.origin/);
});
test('Cloudflare receives security headers and the reviewed workspace redirects',()=>{
  const files=publicFiles(root);
  for(const file of ['_headers','_redirects','404.html']) assert.ok(files.includes(file),file);
  const headers=fs.readFileSync(path.join(root,'_headers'),'utf8');
  for(const value of ['X-Content-Type-Options: nosniff','X-Frame-Options: DENY','geolocation=(self)','/sw.js','Cache-Control: no-cache']) assert.ok(headers.includes(value),value);
  const redirects=fs.readFileSync(path.join(root,'_redirects'),'utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#'));
  const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.deepEqual(redirects,vercel.redirects.map(rule=>`${rule.source} ${rule.destination} ${rule.permanent?301:302}`));
  assert.ok(!redirects.some(line=>line.startsWith('/* ')),'Unknown pages must retain real 404 responses');
});
