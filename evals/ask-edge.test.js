const assert = require('assert');
const fs = require('fs');
const path = require('path');

const edgeSrc = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'functions', 'ask', 'index.ts'),
  'utf8'
);

// 1. Verify D1 controls in supabase/functions/ask/index.ts
assert.ok(edgeSrc.includes('auth.getUser()'), 'D1: must validate Supabase JWT');
assert.ok(edgeSrc.includes('question.length > 500') && edgeSrc.includes('413'), 'D1: must enforce 500-char limit with 413');
assert.ok(edgeSrc.includes('RATE_LIMIT_MAX = 30') && edgeSrc.includes('429'), 'D1: must enforce 30 req/min with 429');
assert.ok(edgeSrc.includes('DAILY_REQUEST_CAP') && edgeSrc.includes('503'), 'D1: must enforce daily cap with 503');

// 2. Verify D2 controls (secret marker & DOC-ALCANCE refusal)
assert.ok(edgeSrc.includes("const SECRET_MARKER = '__JCV_SECRET_MARKER__'"), 'D2: must define secret marker');
assert.ok(edgeSrc.includes('answer.includes(SECRET_MARKER)'), 'D2: must block leaked secret marker');
assert.ok(edgeSrc.includes('DOC-ALCANCE'), 'D2: must use DOC-ALCANCE refusal');

// 3. Verify D3 controls (DB retrieval + figure verification)
assert.ok(edgeSrc.includes(".from('indicators')") && edgeSrc.includes(".from('indicator_summaries')"), 'D3: must query Supabase tables');
assert.ok(edgeSrc.includes('extractNumbers(answer)'), 'D3: must verify figures against retrieved rows');

// 4. Verify T7 privacy logging (no question text stored)
assert.ok(edgeSrc.includes(".from('assistant_logs').insert("), 'T7: must log metadata to assistant_logs');
assert.ok(!edgeSrc.includes('question_text: question'), 'T7: must never store raw question text in logs');

console.log('All Edge Function /ask security & contract unit tests PASSED!');
