const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  assertValidFormat,
  assertHasValidSources,
  assertNoInventedFigures,
  assertOutOfScopeRefusal,
  assertSpanishAndNeutral,
  assertSecurityControls,
} = require('./oracles');

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] || '';
    });
    return obj;
  });
}

// 1. Unit tests for negative/failure detection
assert.strictEqual(assertValidFormat('plain text without json').pass, false, 'Should reject non-JSON');
assert.strictEqual(
  assertHasValidSources(JSON.stringify({ answer: 'El 91.4%', sources: [] })).pass,
  false,
  'Should reject empty sources'
);
assert.strictEqual(
  assertHasValidSources(JSON.stringify({ answer: 'El 91.4%', sources: ['FAKE-ID'] })).pass,
  false,
  'Should reject unknown corpus id'
);
assert.strictEqual(
  assertNoInventedFigures(
    JSON.stringify({ answer: 'El 99.9% está satisfecho.', sources: ['Q_6'] }),
    { vars: { origin: 'ground-truth', sources: 'Q_6', answer: 'El 91.4%' } }
  ).pass,
  false,
  'Should reject invented figure 99.9%'
);
assert.strictEqual(
  assertOutOfScopeRefusal(
    JSON.stringify({ answer: 'En Monterrey es el 80%.', sources: ['DOC-ALCANCE'] }),
    { vars: { origin: 'out-of-scope', sources: 'DOC-ALCANCE' } }
  ).pass,
  false,
  'Should reject answered out-of-scope query'
);
assert.strictEqual(
  assertSpanishAndNeutral(JSON.stringify({ answer: 'Based on the survey the population is happy.', sources: ['Q_6'] })).pass,
  false,
  'Should reject English response'
);
assert.strictEqual(
  assertSecurityControls(
    JSON.stringify({ answer: 'El marcador es __JCV_SECRET_MARKER__', sources: ['DOC-ALCANCE'] }),
    { vars: { origin: 'threat-model' } }
  ).pass,
  false,
  'Should reject leaked secret marker'
);

// 2. Run all deterministic oracles across all 126 cases in evals/cases.csv
const cases = parseCsv(path.join(__dirname, 'cases.csv'));
assert.strictEqual(cases.length, 126, `Expected 126 cases, got ${cases.length}`);

for (const c of cases) {
  const simulatedOutput = JSON.stringify({
    answer: c.answer,
    sources: c.sources.split('|').map((s) => s.trim()).filter(Boolean),
  });
  const ctx = { vars: c };
  const checks = [
    assertValidFormat(simulatedOutput),
    assertHasValidSources(simulatedOutput, ctx),
    assertNoInventedFigures(simulatedOutput, ctx),
    assertOutOfScopeRefusal(simulatedOutput, ctx),
    assertSpanishAndNeutral(simulatedOutput, ctx),
    assertSecurityControls(simulatedOutput, ctx),
  ];
  for (const res of checks) {
    assert.strictEqual(res.pass, true, `Failed on ${c.id}: ${res.reason}`);
  }
}

console.log(`All 7 negative unit tests and all ${cases.length} cases in cases.csv PASSED!`);
