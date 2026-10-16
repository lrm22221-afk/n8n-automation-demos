# n8n Automation Demos

Three working, importable [n8n](https://n8n.io) workflows for common business requests.
They are demo projects built for a portfolio, not client work.

| # | Workflow | What it does |
|---|----------|--------------|
| 1 | `01_lead_form_to_sheets_slack.json` | Webhook receives a lead form → validates name/email → appends to Google Sheets → posts to Slack → returns 200. Invalid input takes an error branch and returns 400 with the reasons. |
| 2 | `02_website_uptime_monitor.json` | Runs every 15 min (or manually) → checks a list of URLs → marks each UP/DOWN (timeouts and DNS failures count as DOWN instead of crashing) → sends one Slack alert if anything is down. |
| 3 | `03_ai_message_classifier.json` | Webhook receives text → calls an OpenAI-compatible chat API → returns `category` (sales/support/billing/spam/other), `urgency` and a one-line `summary`. Bad model output and API errors are handled; empty input returns 400. |

## Setup
1. Run n8n: `npx n8n` or `docker run -it --rm -p 5678:5678 n8nio/n8n`, then open http://localhost:5678
2. **Workflows → Import from File** and pick a JSON from `workflows/`.
3. Replace the placeholders. The repo contains no real secrets:
   - `YOUR_SPREADSHEET_ID` plus a **Google Sheets OAuth2** credential (sheet tab `Leads` with columns `name, email, phone, message, source, receivedAt, valid, errors`)
   - `https://hooks.slack.com/services/YOUR/WEBHOOK/URL` → your Slack Incoming Webhook URL
   - **Header Auth** credential for the LLM: name `Authorization`, value `Bearer <your API key>`
   - Workflow 2: edit the URL list in the **Sites to Check** node.
4. Activate, then test:
```bash
curl -X POST http://localhost:5678/webhook/lead -H 'Content-Type: application/json' \
  -d '{"name":"Dana Cohen","email":"dana@example.com","message":"Need a quote"}'
curl -X POST http://localhost:5678/webhook/classify -H 'Content-Type: application/json' \
  -d '{"text":"I was charged twice this month, please refund ASAP"}'
```

## How these were tested
Tested locally on n8n 1.90.2. All three were imported through the n8n CLI and run end to end:
- Lead form: valid input returned 200 and the Slack message was delivered. Invalid input returned 400 `["name is required","email is invalid"]`.
- Uptime: 2 real sites came back UP, and a non-existent domain was flagged DOWN and triggered the alert. An earlier run crashed on the DNS failure. That was fixed with `onError: continueRegularOutput`, and both runs are visible in the executions screenshot.
- AI classifier: the full request/response path, including the 400 branch, was exercised.

For transparency: during the test, Slack and the LLM API were replaced by a **local mock HTTP server**, and the Google Sheets node was disabled because no real Google account was used. The live versions of those three steps still need your own credentials.

`python3 validate.py` checks the JSON structure: required fields, and that every connection points to an existing node.

Screenshots are in `screenshots/`.
