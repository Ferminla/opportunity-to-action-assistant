# Testing and release status

## Offline smoke tests (public template)

Run from the repository root with Node.js (tested with Node 22):

```sh
node tests/smoke.mjs
```

No network, API credentials, database or npm install are needed. The code uses synthetic records and a mocked n8n Code node context; it is not an n8n execution engine. The 14 checks passed when this package was built. The optional Python configuration helper was also run with dummy settings and its output verified and removed. Tests cover node/connection integrity, syntax, redaction shape, configuration, owner authorization, URL and duplicate handling, read-back confirmation, progress/task changes, reminders and source quote recovery/rejection, cutoff normalization, incomplete AI output and storage schema.

## Developer integration evidence

The upstream V0.4 installation was tested interactively, as reported by the developer. These are scenario-level observations rather than an automated accuracy benchmark.

| Scenario | Observed result |
| --- | --- |
| Developer grant (NLnet) | Initial extraction, saved state, list/status and done/undo worked; some requirements were missed in early extraction. |
| Hackathon (Devpost) | Multi-source retrieval recovered a deadline; official rules remained unavailable. A demo video task was dropped by an earlier validator; bounded recovery was exercised locally later. |
| Bounty (Superteam Earn) | Shared and track-specific requirements captured; deadline missing from retrieved text, one required task rejected in V0.3. Numeric quote recovery was added in V0.4. Track selection remains manual. |
| V0.4 backward compatibility | Existing rows and completed tasks remained available; split progress displayed. |
| Manual `/paste` | Fictional grant extracted with exact cutoff, required/conditional/optional tasks, unknown portal warning and user-supplied evidence warning. |
| Invalid URL | Input rejected before retrieval. |
| Nonexistent webpage | No grounded requirements saved; paste fallback offered. |
| Reminder delivery | Manually triggered reminder contained outstanding core tasks, excluded a completed task and optional action, and noted conditional requirements. |
| Sequential reminder deduplication | Repeated scan in same stage reportedly did not resend. |
| Restart recovery | All four test records and task state were reported accessible after the restart test, and duplicate protection returned the saved ID. |

Neither full mandatory requirement recall nor zero hallucinations are established. Local replays do not certify all source content or live model behavior. A new extraction is needed to apply prompt changes to old rows; do not delete real records casually.

## Fresh installation smoke test (run before relying on this release)

- [ ] Create a fresh Data Table from `setup-storage.json`, configure the public template, assign credentials, save/publish, and confirm an authorized `hello` response without a manual execution.
- [ ] Use `/list`; add a real official opportunity. Inspect official requirements and cutoff separately. Verify `/status ID`, `/done ID:1`, repeat `/done`, `/undo ID:1`, then resend the same URL. Confirm stored state and matching table row.
- [ ] Send the synthetic paste case below. Check date/time, eligibility, required tasks, condition and optional action, and absence of a fabricated portal URL.
- [ ] Submit `/add https://example.invalid/opportunity` and `/add https://example.com/ota-nonexistent-opportunity-987654`; confirm no invalid records saved and a helpful response. The second case may reach OpenAI and incur a small charge.
- [ ] For the fictional record only, use a source date one day ahead or temporarily set its `deadline_date` to one day ahead and clear `last_reminder_key`. Mark one core task done. Run the entire reminder branch manually. Check Telegram output and marker, then run again; no duplicate should arrive in the same stage. Remove the fictional row afterwards (a manual override can make its stored deadline disagree with evidence).
- [ ] Verify the *published* hourly trigger runs automatically and records a successful execution; manual trigger tests do not establish this. Keep n8n and Telegram webhook connectivity available. Check a no-deadline record never receives a dated reminder.
- [ ] Restart the host/container and reconnect the tunnel, if applicable. Send `/list` and `/status` directly to Telegram and verify existing progress. Remove the fictional test row, preserving real records.

### Synthetic paste case

```
/paste

Example Open Source Grant — fictional test only
Applications close on December 10, 2026, at 11:59 PM UTC.
Applicants must be 18 or older and reside in the eligible region.
Submit a 500-word maximum proposal, a public repository, a demo under 3 minutes and a roadmap with estimated budget. Teams must list all members. A recommendation letter is optional. Only one application per applicant is allowed. Submit through the official portal; the link has not been announced.
```

For testing after that date, use a future date in the pasted text. Do not treat this example as a real opportunity. No API calls are required to read/update saved tasks or test reminders.

## Known release limitations

- Inaccessible pages, dynamic deadlines, off-domain official sources and truncated material may leave missing requirements. No broad search or browser fallback. `/paste` is user-supplied evidence, not independent verification.
- The model can omit items, misclassify them, quote the wrong section, or misinterpret conflicting requirements even when a quotation exists. Maximum number of extracted tasks is bounded. Check original rules before submitting.
- Manual path selection, no per-track completion target, no automatic refresh. The current list view shows up to 15 records. Telegram message length and evidence previews are bounded.
- Date-based reminders are not exact-instant alerts; normal same-stage suppression is not exactly-once delivery. Host downtime, overlapping operations or failed sends/writes can affect delivery.
- Single-owner only. Concurrent database updates are not transactional. Fresh-install compatibility across n8n versions is not yet certified.
