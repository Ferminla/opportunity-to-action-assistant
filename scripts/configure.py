"""Create a local import file. Never commit the configured copy."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def configure(owner_id, table_id):
    if not re.fullmatch(r"[1-9][0-9]{0,19}", owner_id):
        raise ValueError("Use your positive numeric Telegram user ID.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", table_id):
        raise ValueError("Use the ID of the existing n8n data table, not its URL.")
    raw = (ROOT / "workflow.json").read_text(encoding="utf-8")
    return json.loads(raw.replace("REPLACE_WITH_TELEGRAM_USER_ID", owner_id)
                          .replace("REPLACE_WITH_DATA_TABLE_ID", table_id))

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--owner-id", help="Telegram user ID (optional; prompted if absent)")
    p.add_argument("--table-id", help="n8n table ID (optional; prompted if absent)")
    args = p.parse_args()
    try:
        workflow = configure(args.owner_id or input("Telegram user ID: ").strip(),
                             args.table_id or input("n8n Data Table ID: ").strip())
    except ValueError as exc:
        p.error(str(exc))
    path = ROOT / "workflow.local.json"
    path.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Created {path}. Import it in n8n; assign credentials there. Do not publish this file.")
