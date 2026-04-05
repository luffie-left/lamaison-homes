#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

const targets = [
  'docs/ARCHITECTURE.md',
  'docs/SUPABASE_SCHEMA.sql',
  'src/app/book/page.tsx',
  'src/app/stays/[slug]/page.tsx',
  'src/app/page.tsx',
  'src/data/mock-data.ts',
  'README.md',
];

const requiredSignals = [
  {
    name: 'Hostaway feature-flag strategy documented',
    test: (text) => /feature flag|feature-flag|ENABLE_HOSTAWAY/i.test(text),
  },
  {
    name: 'Booking wrapper / handoff language exists',
    test: (text) => /booking wrapper|handoff|Hostaway later|Hostaway/i.test(text),
  },
  {
    name: 'Availability concept exists',
    test: (text) => /availability/i.test(text),
  },
  {
    name: 'Rates concept exists',
    test: (text) => /rate|pricing/i.test(text),
  },
];

const desiredSchemaSignals = [
  'hostaway_listing_id',
  'hostaway_checkout_url',
  'hostaway_booking_mode',
  'hostaway_enabled',
  'hostaway_last_synced_at',
];

function readSafe(relativePath) {
  const full = path.join(projectRoot, relativePath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function report(label, pass, note = '') {
  console.log(`- ${pass ? 'PASS' : 'FAIL'}: ${label}${note ? ` — ${note}` : ''}`);
}

let failed = 0;

console.log('== Hostaway consistency audit ==');
const combined = targets.map(readSafe).join('\n\n');

for (const signal of requiredSignals) {
  const pass = signal.test(combined);
  report(signal.name, pass);
  if (!pass) failed++;
}

const schemaText = readSafe('docs/SUPABASE_SCHEMA.sql');
console.log('\n== Hostaway schema readiness ==');
for (const field of desiredSchemaSignals) {
  const pass = schemaText.includes(field);
  report(`Schema contains ${field}`, pass, pass ? '' : 'recommended for future Hostaway alignment');
  if (!pass) failed++;
}

console.log('\n== Book page mode audit ==');
const bookText = readSafe('src/app/book/page.tsx');
report('Book page mentions Hostaway or handoff', /Hostaway|handoff/i.test(bookText));
report('Book page currently behaves as wrapper/enquiry, not fake live checkout', /enquiry|wrapper/i.test(bookText));
report('Book page has explicit booking mode controls', /mode|instant book|inquiry/i.test(bookText), 'informational only');

console.log('\n== Summary ==');
if (failed > 0) {
  console.log(`Hostaway audit found ${failed} gap(s).`);
  process.exitCode = 1;
} else {
  console.log('Hostaway baseline audit passed.');
}
