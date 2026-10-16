// Unit tests for the JavaScript inside every n8n Code node (run: node --test tests/)
// Each node's jsCode is extracted from the workflow JSON and executed with mocked $input / $().
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const wf = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflows', f), 'utf8'));
const code = (f, name) => wf(f).nodes.find((n) => n.name === name).parameters.jsCode;
function run(js, items, refs = {}) {
  const $input = { first: () => items[0], all: () => items };
  const $ = (n) => ({ all: () => refs[n] });
  return new Function('$input', '$', js)($input, $);
}
const j = (o) => ({ json: o });

test('lead: valid lead is normalised', () => {
  const [out] = run(code('01_lead_form_to_sheets_slack.json', 'Validate Lead'), [j({ body: { name: ' Dana ', email: 'DANA@Example.com' } })]);
  assert.equal(out.json.valid, true);
  assert.equal(out.json.email, 'dana@example.com');
  assert.equal(out.json.name, 'Dana');
  assert.equal(out.json.source, 'website');
});
test('lead: missing name and bad email are rejected with reasons', () => {
  const [out] = run(code('01_lead_form_to_sheets_slack.json', 'Validate Lead'), [j({ body: { email: 'nope' } })]);
  assert.equal(out.json.valid, false);
  assert.deepEqual(out.json.errors, ['name is required', 'email is invalid']);
});
test('lead: empty body does not crash', () => {
  const [out] = run(code('01_lead_form_to_sheets_slack.json', 'Validate Lead'), [j({})]);
  assert.equal(out.json.valid, false);
});
test('uptime: marks 2xx/3xx UP and failures DOWN', () => {
  const sites = [j({ url: 'https://a' }), j({ url: 'https://b' }), j({ url: 'https://c' })];
  const [out] = run(code('02_website_uptime_monitor.json', 'Evaluate Results'),
    [j({ statusCode: 200 }), j({ statusCode: 301 }), j({ error: 'ENOTFOUND' })], { 'Sites to Check': sites });
  assert.equal(out.json.downCount, 1);
  assert.equal(out.json.hasDown, true);
  assert.match(out.json.alertText, /DOWN: https:\/\/c \(status no response\)/);
});
test('classifier: empty and oversized text are invalid', () => {
  const js = code('03_ai_message_classifier.json', 'Prepare Text');
  assert.equal(run(js, [j({ body: { text: '  ' } })])[0].json.valid, false);
  assert.equal(run(js, [j({ body: { text: 'x'.repeat(8001) } })])[0].json.valid, false);
  assert.equal(run(js, [j({ body: { text: 'refund please' } })])[0].json.valid, true);
});
const llm = (content, statusCode = 200) => j({ statusCode, body: { choices: [{ message: { content } }] } });
test('classifier: parses a valid model reply', () => {
  const [out] = run(code('03_ai_message_classifier.json', 'Parse & Validate'), [llm('{"category":"billing","urgency":"high","summary":"double charge"}')]);
  assert.deepEqual(out.json, { ok: true, category: 'billing', urgency: 'high', summary: 'double charge' });
});
test('classifier: unknown category falls back to other', () => {
  const [out] = run(code('03_ai_message_classifier.json', 'Parse & Validate'), [llm('{"category":"hack"}')]);
  assert.equal(out.json.category, 'other');
});
test('classifier: non-JSON reply and API errors are handled', () => {
  const js = code('03_ai_message_classifier.json', 'Parse & Validate');
  assert.equal(run(js, [llm('sure! here you go')])[0].json.error, 'Model reply was not valid JSON');
  assert.equal(run(js, [llm('', 429)])[0].json.error, 'LLM API returned 429');
});
test('error handler: formats alert from Error Trigger payload', () => {
  const [out] = run(code('00_global_error_handler.json', 'Format Alert'), [j({
    workflow: { name: 'Lead Form' }, execution: { id: '42', mode: 'webhook', lastNodeExecuted: 'Append to Google Sheet', error: { message: 'Quota exceeded' } },
  })]);
  assert.match(out.json.text, /Lead Form/);
  assert.match(out.json.text, /Append to Google Sheet/);
  assert.match(out.json.text, /Quota exceeded/);
  assert.equal(out.json.executionId, '42');
});
test('error handler: tolerates a minimal payload', () => {
  const [out] = run(code('00_global_error_handler.json', 'Format Alert'), [j({})]);
  assert.match(out.json.text, /unknown workflow/);
});
