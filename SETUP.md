# Installation

This release is a **single-owner** private Telegram bot. Do not expose it as a public multi-user service. It is a template, not a hosted bot.

## 1. Prerequisites

- An n8n instance with Data Tables and the nodes used by `workflow.json` (see node versions in the JSON). An exact minimum n8n version has not been certified; use a current installation supporting those node versions.
- A Telegram bot created through @BotFather and its bot token.
- Your numeric Telegram user ID. To obtain it without a third-party bot, create a temporary n8n workflow with a Telegram Trigger, assign your bot credential, listen for a test event and message the bot from your private chat. Read `message.from.id` from the output. Stop the temporary listener and remove/deactivate that workflow before using the OTA bot.
- An OpenAI API key, billing access and access to `gpt-5-mini` in the Responses API. ChatGPT subscriptions do not pay for API usage.
- Internet access to Telegram, Jina Reader (`r.jina.ai`) and `api.openai.com`. Jina rate limits, availability and pricing may vary. A publicly reachable HTTPS n8n webhook URL is required for Telegram; for local installations configure `WEBHOOK_URL` before starting n8n and keep the tunnel running. Protect your n8n editor and use a persistent n8n data volume.
- Optional Python 3 for the configuration helper; Node.js for offline smoke tests.

## 2. Create or reuse the storage table

For a fresh installation, import `setup-storage.json` into a separate n8n workflow. Run the Manual Trigger once. Open Data Tables and locate `ota_opportunities`; copy its unique table ID from the UI/URL or creation output. Do not publish the storage setup workflow.

If reusing a compatible existing table, skip creation. Never delete the existing table to install an update. Ensure the following 22 columns exist as **String** fields (in addition to n8n's built-in ID/timestamps):

```
opportunity_id, owner_id, dedupe_key, source_url, title, category, summary,
deadline_date, deadline_raw, deadline_time, deadline_timezone,
deadline_source_id, deadline_quote, submission_url, submission_instructions,
tasks_json, eligibility_json, warnings_json, sources_json, last_reminder_key,
created_at, updated_at
```

## 3. Configure the workflow

From the extracted repo folder run:

```sh
python scripts/configure.py
```

On Windows `py scripts/configure.py` may be appropriate. Supply your Telegram user ID and table ID at the prompts. The helper creates `workflow.local.json`; that file is personal, gitignored and must not be shared. Import it into a new n8n workflow. The untouched public `workflow.json` will not work until configured.

**Manual alternative:** Import `workflow.json`; replace the owner placeholder in `Validate Telegram Input1`, `Choose Reminders`, and the `DB Scan Opportunities` owner filter. Set the Data Table selector to **By ID** using your table ID on all ten Data Table nodes (DB Find Duplicate, DB Save Opportunity, DB List Owner, DB Find Status, DB Find Task, DB Update Tasks, DB Scan Opportunities, DB Mark Reminder Sent, DB Verify Saved Opportunity, DB Verify Task Update). Do not change mappings or filters otherwise.

Assign your Telegram credential to the trigger and every Telegram send node (11 nodes in total). On `OpenAI - Extract Opportunity`, create/select an HTTP Bearer Auth credential using your OpenAI API key. Keep secrets in n8n credentials, not Code nodes, URLs or repository files. If the model is unavailable to your API project, review the model configuration in `Prepare AI Request` and retest the strict schema.

## 4. Enable and verify

- Keep only one active/published workflow per Telegram bot. Save and publish/activate the configured workflow. Workflow timezone defaults to `Africa/Lagos`; the reminder date calculation uses UTC+1. If changing timezones, update both the workflow setting and the calendar-date calculation in `Choose Reminders` (use a proper timezone-aware date calculation for DST zones).
- Send `hello` directly in Telegram; the help response should arrive. Unauthorized users and group chats receive no response.
- Run `/list`, add an official public link, then test `/status`, `/done` and `/undo`. See [TESTING.md](TESTING.md).
- Keep n8n running and confirm an automatic hourly execution occurs. If hosting locally, restart the container and webhook tunnel as necessary following a computer restart. A persistent volume preserves the database and credentials. Back up your data and encryption key securely; do not commit them.

## Upgrades and rollback

Export the working workflow and back up the table before upgrading. Deactivate the old workflow without deleting it. Configure the new import with the same owner/table and credentials, then publish it. Check `/list` and `/status` before doing any fresh AI extraction. If necessary, deactivate the new workflow and reactivate the old one. New extraction logic does not retroactively modify previously saved rows. Delete only explicitly identified test records after testing.
