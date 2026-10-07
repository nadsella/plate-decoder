/* UK number plate decoder — pure logic, no DOM. Works in the browser and in Node. */
(function (root) {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  // ---- Current style (September 2001 onwards): AB12 CDE ----------------------
  // First letter = region. Second letter = the DVLA local office within it.
  const REGIONS = {
    A: { name: 'Anglia', offices: [['A', 'N', 'Peterborough'], ['O', 'U', 'Norwich'], ['V', 'Y', 'Ipswich']] },
    B: { name: 'Birmingham', offices: [['A', 'Y', 'Birmingham']] },
    C: { name: 'Cymru (Wales)', offices: [['A', 'O', 'Cardiff'], ['P', 'V', 'Swansea'], ['W', 'Y', 'Bangor']] },
    D: { name: 'Deeside', offices: [['A', 'K', 'Chester'], ['L', 'Y', 'Shrewsbury']] },
    E: { name: 'Essex', offices: [['A', 'Y', 'Chelmsford']] },
    F: { name: 'Forest and Fens', offices: [['A', 'P', 'Nottingham'], ['R', 'Y', 'Lincoln']] },
    G: { name: 'Garden of England', offices: [['A', 'O', 'Maidstone'], ['P', 'Y', 'Brighton']] },
    H: { name: 'Hampshire and Dorset', offices: [['A', 'J', 'Bournemouth'], ['K', 'Y', 'Portsmouth']] },
    K: { name: 'Luton and Northampton', offices: [['A', 'L', 'Luton'], ['M', 'Y', 'Northampton']] },
    L: { name: 'London', offices: [['A', 'J', 'Wimbledon'], ['K', 'T', 'Stanmore'], ['U', 'Y', 'Sidcup']] },
    M: { name: 'Manchester and Merseyside', offices: [['A', 'Y', 'Manchester']] },
    N: { name: 'North', offices: [['A', 'O', 'Newcastle'], ['P', 'Y', 'Stockton-on-Tees']] },
    O: { name: 'Oxford', offices: [['A', 'Y', 'Oxford']] },
    P: { name: 'Preston', offices: [['A', 'T', 'Preston'], ['U', 'Y', 'Carlisle']] },
    R: { name: 'Reading', offices: [['A', 'Y', 'Reading']] },
    S: { name: 'Scotland', offices: [['A', 'J', 'Glasgow'], ['K', 'O', 'Edinburgh'], ['P', 'T', 'Dundee'], ['U', 'W', 'Aberdeen'], ['X', 'Y', 'Inverness']] },
    V: { name: 'Severn Valley', offices: [['A', 'Y', 'Worcester']] },
    W: { name: 'West of England', offices: [['A', 'J', 'Exeter'], ['K', 'L', 'Truro'], ['M', 'Y', 'Bristol']] },
    X: { name: 'Personal export', offices: [['A', 'F', 'Export']] },
    Y: { name: 'Yorkshire', offices: [['A', 'K', 'Leeds'], ['L', 'U', 'Sheffield'], ['V', 'Y', 'Beverley']] },
  };

  function officeFor(first, second) {
    const region = REGIONS[first];
    if (!region || 'IQZ'.includes(second)) return null;
    const hit = region.offices.find(([lo, hi]) => second >= lo && second <= hi);
    if (!hit) return null;
    let office = hit[2];
    if (first === 'H' && second === 'W') office = 'Portsmouth (Isle of Wight)';
    return { region: region.name, office };
  }

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

  // Age identifier → registration window. 02–50: March–August of 20xx.
  // 51–99: September 20(xx−50) – February the year after. 00: September 2050.
  function agePeriod(code) {
    if (!/^\d{2}$/.test(code)) return null;
    const n = parseInt(code, 10);
    if (n === 0) return { start: new Date(2050, 8, 1), end: new Date(2051, 1, 28) };
    if (n === 1) return null;
    if (n <= 50) return { start: new Date(2000 + n, 2, 1), end: new Date(2000 + n, 7, 31) };
    const y = 2000 + n - 50;
    return { start: new Date(y, 8, 1), end: new Date(y + 1, 1, isLeap(y + 1) ? 29 : 28) };
  }

  function monthYear(d) { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

  function ageText(start, end, now) {
    if (start > now) return null;
    const months = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    const oldest = Math.floor(months(start, now) / 12);
    const newest = Math.floor(months(end > now ? now : end, now) / 12);
    if (oldest === newest) return oldest === 0 ? 'less than a year old' : `about ${oldest} year${oldest === 1 ? '' : 's'} old`;
    if (newest === 0 && oldest === 1) return 'about a year old';
    return `${newest}–${oldest} years old`;
  }

  // ---- Prefix style (August 1983 – August 2001): A123 BCD --------------------
  const PREFIX_YEARS = {
    A: ['August 1983', 'July 1984'], B: ['August 1984', 'July 1985'], C: ['August 1985', 'July 1986'],
    D: ['August 1986', 'July 1987'], E: ['August 1987', 'July 1988'], F: ['August 1988', 'July 1989'],
    G: ['August 1989', 'July 1990'], H: ['August 1990', 'July 1991'], J: ['August 1991', 'July 1992'],
    K: ['August 1992', 'July 1993'], L: ['August 1993', 'July 1994'], M: ['August 1994', 'July 1995'],
    N: ['August 1995', 'July 1996'], P: ['August 1996', 'July 1997'], R: ['August 1997', 'July 1998'],
    S: ['August 1998', 'February 1999'], T: ['March 1999', 'August 1999'], V: ['September 1999', 'February 2000'],
    W: ['March 2000', 'August 2000'], X: ['September 2000', 'February 2001'], Y: ['March 2001', 'August 2001'],
  };

  // ---- Suffix style (1963 – July 1983): ABC 123D -----------------------------
  const SUFFIX_YEARS = {
    A: ['February 1963', 'December 1963'], B: ['January 1964', 'December 1964'], C: ['January 1965', 'December 1965'],
    D: ['January 1966', 'December 1966'], E: ['January 1967', 'July 1967'], F: ['August 1967', 'July 1968'],
    G: ['August 1968', 'July 1969'], H: ['August 1969', 'July 1970'], J: ['August 1970', 'July 1971'],
    K: ['August 1971', 'July 1972'], L: ['August 1972', 'July 1973'], M: ['August 1973', 'July 1974'],
    N: ['August 1974', 'July 1975'], P: ['August 1975', 'July 1976'], R: ['August 1976', 'July 1977'],
    S: ['August 1977', 'July 1978'], T: ['August 1978', 'July 1979'], V: ['August 1979', 'July 1980'],
    W: ['August 1980', 'July 1981'], X: ['August 1981', 'July 1982'], Y: ['August 1982', 'July 1983'],
  };

  // ---- Northern Ireland: area codes always contain I or Z --------------------
  const NI_CODES = {
    AZ: 'Belfast', BZ: 'County Down', CZ: 'Belfast', DZ: 'County Antrim', EZ: 'Belfast', FZ: 'Belfast',
    GZ: 'Belfast', HZ: 'County Tyrone', IA: 'County Antrim', IB: 'County Armagh',
    IJ: 'County Down', IL: 'County Fermanagh', IW: 'County Londonderry', JI: 'County Tyrone', JZ: 'County Down',
    KZ: 'County Antrim', LZ: 'County Armagh', MZ: 'Belfast', NZ: 'County Londonderry', OI: 'Belfast',
    OZ: 'Belfast', PZ: 'Belfast', RZ: 'County Antrim', SZ: 'County Down', TZ: 'Belfast', UI: 'Londonderry (city)',
    UZ: 'Belfast', VZ: 'County Tyrone', WZ: 'Belfast', XI: 'Belfast', XZ: 'County Armagh', YZ: 'County Londonderry',
  };

  const YEAR_LETTER_GAP = '(I, O, Q, U and Z were never used as year letters.)';

  function normalise(input) {
    return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function decode(input, now) {
    now = now || new Date();
    const raw = normalise(input);
    if (!raw) return { ok: false, error: 'Type a number plate to decode it.' };
    if (raw.length > 7) return { ok: false, raw, error: 'UK plates have at most 7 characters.' };
    let m;

    // Current style: AB12 CDE
    if ((m = raw.match(/^([A-Z])([A-Z])(\d{2})([A-Z]{3})$/))) {
      const [, a, b, age, rand] = m;
      const place = officeFor(a, b);
      const period = agePeriod(age);
      const issued = period && period.start <= now;
      const warnings = [];
      if (!place) warnings.push(`“${a}${b}” isn’t a memory tag DVLA issues. I, Q and Z are never used in the first two letters.`);
      if (!period) warnings.push(`“${age}” isn’t a valid age identifier. 01 was never issued.`);
      else if (!issued) warnings.push(`The “${age}” age identifier isn’t released until ${monthYear(period.start)}.`);
      if (/[IQ]/.test(rand)) warnings.push('The last three letters never use I or Q.');
      const age_ = issued ? ageText(period.start, period.end, now) : null;
      return {
        ok: true, raw, display: `${a}${b}${age} ${rand}`, style: 'current', format: 'Current style · 2001 onwards',
        headline: place && issued ? `${place.office}, ${monthYear(period.start)} – ${monthYear(period.end)}` : 'Current-style layout with parts that don’t match a real issue',
        parts: [
          { chars: a + b, label: 'Memory tag', value: place ? `${place.region} · ${place.office}` : 'Not recognised',
            detail: place ? `“${a}” is the region and “${b}” the DVLA local office it was first registered through.` : null },
          { chars: age, label: 'Age identifier', value: period ? `${monthYear(period.start)} – ${monthYear(period.end)}` : 'Not valid',
            detail: issued ? `First registered in this window, so the vehicle is ${age_}.` : null },
          { chars: rand, label: 'Random letters', value: 'Serial', detail: 'Issued in sequence. They don’t mean anything.' },
        ],
        warnings, valid: warnings.length === 0,
      };
    }

    // Q plate: Q123 ABC
    if ((m = raw.match(/^Q(\d{1,3})([A-Z]{3})$/))) {
      return {
        ok: true, raw, display: `Q${m[1]} ${m[2]}`, style: 'q', format: 'Q plate', valid: true,
        headline: 'A vehicle whose age or identity DVLA couldn’t confirm',
        parts: [
          { chars: 'Q', label: 'Q prefix', value: 'Age or identity unknown', detail: 'Used for kit cars, heavily rebuilt vehicles and some imports. Q plates can’t be transferred.' },
          { chars: m[1] + m[2], label: 'Serial', value: 'Sequence', detail: 'A running number with no area or date meaning.' },
        ],
        warnings: [],
      };
    }

    // Prefix style: A123 BCD
    if ((m = raw.match(/^([A-Z])(\d{1,3})([A-Z]{3})$/))) {
      const [, y, num, tail] = m;
      const span = PREFIX_YEARS[y];
      const warnings = [];
      if (!span) warnings.push(`“${y}” was never a year letter. ${YEAR_LETTER_GAP}`);
      if (/^0/.test(num)) warnings.push('Serial numbers never start with 0.');
      return {
        ok: true, raw, display: `${y}${num} ${tail}`, style: 'prefix', format: 'Prefix style · 1983 – 2001',
        headline: span ? `First registered ${span[0]} – ${span[1]}` : 'Prefix layout, but the year letter isn’t valid',
        parts: [
          { chars: y, label: 'Year letter', value: span ? `${span[0]} – ${span[1]}` : 'Not valid', detail: span ? 'When the vehicle was first registered, unless the plate has been transferred.' : null },
          { chars: num, label: 'Serial number', value: '1 – 999', detail: 'Issued in order by the local office.' },
          { chars: tail[0], label: 'Serial letter', value: 'Sequence', detail: 'Part of the local office’s running sequence.' },
          { chars: tail.slice(1), label: 'Area code', value: 'Local licensing office', detail: 'The office that issued the plate.' },
        ],
        warnings, valid: warnings.length === 0,
      };
    }

    // Suffix style: ABC 123D
    if ((m = raw.match(/^([A-Z]{3})(\d{1,3})([A-Z])$/))) {
      const [, head, num, y] = m;
      const span = SUFFIX_YEARS[y];
      const warnings = [];
      if (!span) warnings.push(`“${y}” was never a year letter. ${YEAR_LETTER_GAP}`);
      if (/^0/.test(num)) warnings.push('Serial numbers never start with 0.');
      return {
        ok: true, raw, display: `${head} ${num}${y}`, style: 'suffix', format: 'Suffix style · 1963 – 1983',
        headline: span ? `First registered ${span[0]} – ${span[1]}` : 'Suffix layout, but the year letter isn’t valid',
        parts: [
          { chars: head[0], label: 'Serial letter', value: 'Sequence', detail: 'Part of the local office’s running sequence.' },
          { chars: head.slice(1), label: 'Area code', value: 'Local licensing office', detail: 'The council or office that issued the plate.' },
          { chars: num, label: 'Serial number', value: '1 – 999', detail: 'Issued in order.' },
          { chars: y, label: 'Year letter', value: span ? `${span[0]} – ${span[1]}` : 'Not valid', detail: span ? 'When the vehicle was first registered, unless the plate has been transferred.' : null },
        ],
        warnings, valid: warnings.length === 0,
      };
    }

    // Northern Ireland: optional serial letter + area code with I or Z + up to 4 digits
    if ((m = raw.match(/^([A-Z]?)([A-Z]{2})(\d{1,4})$/)) && NI_CODES[m[2]]) {
      const [, serial, code, num] = m;
      return {
        ok: true, raw, display: `${serial}${code} ${num}`, style: 'ni', format: 'Northern Ireland', valid: true,
        headline: `Northern Irish registration · ${NI_CODES[code]}`,
        parts: [
          ...(serial ? [{ chars: serial, label: 'Serial letter', value: 'Sequence', detail: 'Extends the series once the numbers run out.' }] : []),
          { chars: code, label: 'Area code', value: NI_CODES[code], detail: 'Northern Irish area codes always contain an I or a Z.' },
          { chars: num, label: 'Serial number', value: '1 – 9999', detail: 'Issued in order.' },
        ],
        warnings: [],
        note: 'Northern Irish plates don’t show the vehicle’s age, which makes them popular as private plates.',
      };
    }

    // Dateless (before 1963): 1–3 letters + 1–4 digits, or the reverse
    if ((m = raw.match(/^([A-Z]{1,3})(\d{1,4})$/)) || (m = raw.match(/^(\d{1,4})([A-Z]{1,3})$/))) {
      const lettersFirst = /^[A-Z]/.test(raw);
      const letters = lettersFirst ? m[1] : m[2];
      const digits = lettersFirst ? m[2] : m[1];
      return {
        ok: true, raw, display: `${m[1]} ${m[2]}`, style: 'dateless', format: 'Dateless · before 1963', valid: true,
        headline: 'A dateless plate. It doesn’t show the vehicle’s age.',
        parts: [
          { chars: letters, label: 'Letters', value: 'Area code and serial', detail: 'The last two letters identified the council that issued it.' },
          { chars: digits, label: 'Number', value: 'Sequence', detail: 'Issued in order by the council.' },
        ],
        warnings: [],
        note: 'Most dateless plates are now private registrations moved onto newer vehicles.',
      };
    }

    return { ok: false, raw, error: 'That doesn’t match any UK registration format. Check for typos: O and 0, and I and 1, are easy to mix up.' };
  }

  const api = { decode, normalise, agePeriod, officeFor, REGIONS, PREFIX_YEARS, SUFFIX_YEARS, NI_CODES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlateDecoder = api;
})(typeof self !== 'undefined' ? self : this);
