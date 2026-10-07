const test = require('node:test');
const assert = require('node:assert');
const { decode, agePeriod } = require('../decoder.js');

const NOW = new Date(2026, 9, 7); // 7 October 2026

test('current style: region, office and window', () => {
  const r = decode('LV75 ZXM', NOW);
  assert.ok(r.ok && r.valid);
  assert.equal(r.display, 'LV75 ZXM');
  assert.match(r.parts[0].value, /London · Sidcup/);
  assert.equal(r.parts[1].value, 'September 2025 – February 2026');
});

test('current style: March identifier and office ranges', () => {
  assert.match(decode('sk09fhr', NOW).parts[0].value, /Edinburgh/);
  assert.equal(decode('SK09FHR', NOW).parts[1].value, 'March 2009 – August 2009');
  assert.match(decode('HW12ABC', NOW).parts[0].value, /Isle of Wight/);
  assert.match(decode('YV20ABC', NOW).parts[0].value, /Beverley/);
});

test('current style: invalid and future parts are flagged', () => {
  assert.equal(decode('AB01CDE', NOW).valid, false);
  assert.equal(decode('ZZ12ABC', NOW).valid, false);
  assert.equal(decode('AB12CDQ', NOW).valid, false);
  const future = decode('AB27CDE', NOW);
  assert.equal(future.valid, false);
  assert.match(future.warnings[0], /March 2027/);
  assert.equal(decode('AB76CDE', NOW).valid, true);
});

test('age identifiers', () => {
  assert.equal(agePeriod('01'), null);
  assert.equal(agePeriod('51').start.getFullYear(), 2001);
  assert.equal(agePeriod('00').start.getFullYear(), 2050);
  assert.equal(agePeriod('53').end.getDate(), 29); // Feb 2004 was a leap year
});

test('prefix, suffix, Q plate', () => {
  assert.equal(decode('P472 KLD', NOW).headline, 'First registered August 1996 – July 1997');
  assert.equal(decode('GHN 418T', NOW).headline, 'First registered August 1978 – July 1979');
  assert.equal(decode('I123ABC', NOW).valid, false);
  assert.equal(decode('Q123ABC', NOW).style, 'q');
});

test('Northern Ireland and dateless', () => {
  const ni = decode('BXI 4821', NOW);
  assert.equal(ni.style, 'ni');
  assert.match(ni.headline, /Belfast/);
  assert.equal(decode('ABC 1', NOW).style, 'dateless');
  assert.equal(decode('1 A', NOW).style, 'dateless');
});

test('rejects nonsense', () => {
  assert.equal(decode('', NOW).ok, false);
  assert.equal(decode('ABCDEFGH', NOW).ok, false);
  assert.equal(decode('12AB34', NOW).ok, false);
});
