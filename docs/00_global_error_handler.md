# 00 · Global Error Handler

**Use case:** any production workflow fails (API quota, expired credential, bad data) → the team gets one Slack message with the workflow name, failed node, error and a link to the execution.

**Flow:** Error Trigger → Format Alert (Code) → Send Slack Alert (HTTP, 3 retries, never crashes itself)

**Connect it:** import, replace the Slack webhook URL, then in each workflow open **Settings → Error workflow** and pick *00 Global Error Handler*.

**Tested:** imports cleanly into n8n 1.90.2; the Format Alert code is unit-tested (`tests/code_nodes.test.js`) with a full and a minimal error payload. It was not triggered by a live failure in n8n.
