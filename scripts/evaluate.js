#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.EVAL_BASE_URL || 'http://127.0.0.1:3000';
const START_SERVER = process.env.EVAL_START_SERVER !== 'false';
const serverCommand = process.env.EVAL_SERVER_CMD || 'npm run dev';
const routes = [
  '/',
  '/stays',
  '/stays/south-yarra-skyline-residence',
  '/destinations/melbourne',
  '/host-with-us',
  '/how-it-works',
  '/about',
  '/journal',
  '/journal/best-suburbs-for-a-weekend-stay-in-melbourne',
  '/contact',
  '/concierge',
  '/faq',
  '/trust',
  '/book',
  '/thank-you?type=owner',
  '/owner-application',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

async function waitForServer(url, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetchUrl(url);
      if (res.status && res.status < 500) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function scorePage(path, body) {
  const checks = [];
  const add = (name, pass, note = '') => checks.push({ name, pass, note });

  add('has html document', /<html/i.test(body));
  add('has title or h1', /<title>|<h1/i.test(body));

  if (path === '/') {
    add('guest flow present', /Why guests book with La Maison Homes|For guests/i.test(body));
    add('owner transition present', /For property owners/i.test(body));
    add('owner flow present', /Why owners partner with La Maison Homes|Why host with us/i.test(body));
    add('concierge block present', /Concierge/i.test(body));
    add('final CTA split cues present', /Book direct with confidence|Stronger returns/i.test(body));
  }

  if (path.startsWith('/stays/')) {
    add('property detail content present', /Why guests love this home|Amenities|House rules/i.test(body));
    add('booking CTA present', /Check Availability|Enquire About This Stay/i.test(body));
  }

  if (path === '/book') {
    add('hostaway wrapper language present', /Hostaway|booking wrapper|handoff/i.test(body));
  }

  if (path === '/host-with-us') {
    add('owner assessment CTA present', /Request an Assessment/i.test(body));
    add('owner application CTA present', /Full Owner Application/i.test(body));
  }

  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, checks };
}

(async () => {
  let child = null;
  try {
    console.log('== Build check ==');
    execSync('npm run build', { stdio: 'inherit' });

    if (START_SERVER) {
      console.log(`\n== Starting local server: ${serverCommand} ==`);
      child = spawn(serverCommand, { shell: true, stdio: 'inherit' });
      const ready = await waitForServer(BASE_URL);
      if (!ready) throw new Error(`Server did not become ready at ${BASE_URL}`);
    }

    console.log(`\n== Route evaluation: ${BASE_URL} ==`);
    let failures = 0;
    for (const path of routes) {
      const url = `${BASE_URL}${path}`;
      const res = await fetchUrl(url);
      const ok = res.status >= 200 && res.status < 400;
      const score = scorePage(path, res.body);
      const passedAll = score.passed === score.total;
      if (!ok || !passedAll) failures++;
      console.log(`\n[${ok ? 'OK' : 'FAIL'}] ${path} -> HTTP ${res.status}`);
      for (const check of score.checks) {
        console.log(`  - ${check.pass ? 'PASS' : 'FAIL'}: ${check.name}${check.note ? ` (${check.note})` : ''}`);
      }
    }

    console.log('\n== Summary ==');
    if (failures > 0) {
      console.error(`Evaluation completed with ${failures} failing route(s).`);
      process.exitCode = 1;
    } else {
      console.log('All routes passed baseline evaluation.');
    }
  } catch (error) {
    console.error('\nEvaluation failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (child) child.kill('SIGTERM');
  }
})();
