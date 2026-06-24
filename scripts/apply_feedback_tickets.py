#!/usr/bin/env python3
"""Feedback ticket UI: email field copy + success message with ticket id."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

CONTACT_OLD = """      <label for="feedbackContact">Contact (optional)</label>
      <input type="text" id="feedbackContact" name="contact" placeholder="Name or email if you want a reply" maxlength="200" autocomplete="email">"""

CONTACT_NEW = """      <label for="feedbackContact">Email (optional — for ticket updates)</label>
      <input type="text" id="feedbackContact" name="contact" placeholder="your@email.com — we'll email when received and when fixed" maxlength="200" autocomplete="email">"""

SUCCESS_OLD = """        if(!res.ok)throw new Error((data&&data.error)||('Request failed ('+res.status+')'));
        setStatus('Thank you — your feedback was saved.','ok');"""

SUCCESS_NEW = """        if(!res.ok)throw new Error((data&&data.error)||('Request failed ('+res.status+')'));
        var okMsg='Thank you — your feedback was saved.';
        if(data&&data.id)okMsg+=' Ticket '+data.id+'.';
        if(data&&data.ticketEmail)okMsg+=' Check your email for updates.';
        setStatus(okMsg,'ok');"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    before = len(text.encode("utf-8"))
    if CONTACT_NEW in text and "okMsg+=' Ticket '" in text:
        print("Feedback tickets already applied.")
        return
    if CONTACT_OLD in text:
        text = replace_once(text, CONTACT_OLD, CONTACT_NEW, "contact field")
    elif CONTACT_NEW not in text:
        raise SystemExit("contact field: expected old or new markup")
    if SUCCESS_OLD in text:
        text = replace_once(text, SUCCESS_OLD, SUCCESS_NEW, "success message")
    elif "okMsg+=' Ticket '" not in text:
        raise SystemExit("success message: expected old or new handler")
    INDEX.write_text(text, encoding="utf-8")
    after = len(text.encode("utf-8"))
    print(f"Patched index.html: {before} -> {after} bytes")


if __name__ == "__main__":
    main()
