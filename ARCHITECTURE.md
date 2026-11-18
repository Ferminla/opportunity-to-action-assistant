# Architecture

## Runtime

Telegram → n8n command router → fixed-host Jina Reader retrieval (or pasted evidence) → OpenAI Responses API → deterministic evidence validation → n8n Data Tables → Telegram. The schedule branch reads from the same table. No separate vector store, background agent or browser automation is required.

### Intake and retrieval

The parser requires the configured numeric owner in a private chat and accepts HTTP(S) public-looking hostnames. It removes tracking parameters and fragments, blocks obvious non-public or malformed hosts, then builds an owner-scoped dedupe key. It is not a comprehensive SSRF defense; the workflow sends retrieval requests to Jina Reader rather than fetching arbitrary target URLs directly from the local network. Use only public, non-sensitive links. `/paste` creates its own record. Source planning ranks rules, submission forms and dates on the same hostname and limits supporting pages to two. Devpost event homepages additionally probe `/rules` and `/details/dates`. Source compilation flags rejected, duplicated or truncated pages; maximum 18,000 characters per source are supplied to AI. The pasted input also has a bounded source window. The landing page can be requested twice in the current branch.

### Extraction and validation

The Responses API uses `gpt-5-mini`, low reasoning effort, `store: false`, strict JSON Schema and a 10,000 output-token ceiling (including reasoning). It asks for tasks with evidence quotes, conditionality, required status, eligibility, deadline and submission details. Pages are untrusted input, not instructions. No model tools are enabled.

The validator checks that quotations appear in the named retrieved source after Unicode/case/whitespace normalization. Limited recovery for abbreviated quotes and number-word equivalence attempts to recover an original source span uniquely; unsupported or ambiguous evidence is rejected. This is text matching, **not proof of semantic entailment or completeness**. Deadline validation checks calendar dates, evidence, and supported times/timezones; interpretation still depends on the model. Unsupported URLs are removed. Warnings are attached to the record. An incomplete, refused or unusable extraction is not saved.

### Persistence

One row per opportunity stores the owner, dedupe key, eight-hex-character display ID, metadata, deadline evidence, task/eligibility/warning/source JSON and reminder state. The add path checks duplicates before extraction. After insertion an independent Get verifies the matching row and exact task JSON; task updates are similarly read back. Done/undo mutate checklist JSON. The short ID is a non-cryptographic hash, not an access token. The owner check is the authorization boundary.

The check-then-insert and read-modify-write operations are not transactional. Concurrent requests can race; avoid simultaneous commands. A hash collision is theoretically possible. Source quotes and URL metadata are saved; the entire retrieved source is not part of the table record, although execution history may retain it.

### Reminders

An hourly cron scans the configured owner's rows. Date-based stages are 7, 3, 1 and 0 days; a scan selects the current applicable stage within seven days, and skips past or unconfirmed dates. The calendar is Africa/Lagos by default. A reminder includes outstanding core tasks (up to eight) plus a count of outstanding conditional required tasks; optional actions are excluded. A marker `deadline_date|stage` is written after successful Telegram delivery. This suppresses normal sequential duplicate sends; failures between send and marker write or simultaneous executions can cause repeats. Exact cutoff time is displayed when evidenced, but scheduling is calendar-date based (not an exact instant countdown); a due-day reminder can occur after the published cutoff. Completion is manual; conditional requirements are not automatically selected.

## Scope and non-goals

No login-wall bypass, broad web search, automatic application submission, applicant verification, auto-refresh/merge, track selection engine, or multi-user hosting. The paid API is only used for extraction; status/progress/reminders do not call it. See [SECURITY.md](SECURITY.md) for deployment considerations.
