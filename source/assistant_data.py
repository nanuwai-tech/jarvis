"""
Lightweight JSON-backed storage for Jarvis's personal-assistant tools.

A single local JSON file (assistant_data.json) for durable storage of:
- Tasks & To-dos
- Calendar Events & Meetings
- Contacts & Relationships
- Personal Notes & Categorized Thoughts
- Shopping & Grocery Lists
- Recurring Important Dates (Birthdays, Anniversaries)
"""

import json
import os
import threading
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any

_DATA_PATH = os.path.join(os.path.dirname(__file__), "assistant_data.json")
_LOCK = threading.Lock()

_DEFAULT_DATA: Dict[str, Any] = {
    "tasks": [],
    "events": [],
    "contacts": [],
    "notes": [],
    "shopping_list": [],
    "important_dates": [],
}


def _load() -> dict:
    if not os.path.exists(_DATA_PATH):
        return {k: list(v) for k, v in _DEFAULT_DATA.items()}
    try:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for key, default in _DEFAULT_DATA.items():
            data.setdefault(key, list(default))
        return data
    except Exception:
        return {k: list(v) for k, v in _DEFAULT_DATA.items()}


def _save(data: dict) -> None:
    with open(_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


# ---------------------------------------------------------------- tasks --

def add_task(title: str, due: Optional[str] = None) -> dict:
    with _LOCK:
        data = _load()
        task = {
            "title": title,
            "due": due,
            "done": False,
            "created": datetime.now().isoformat(timespec="minutes"),
        }
        data["tasks"].append(task)
        _save(data)
        return task


def list_tasks(pending_only: bool = True) -> list:
    tasks = _load()["tasks"]
    return [t for t in tasks if not t["done"]] if pending_only else tasks


def complete_task(title: str) -> bool:
    with _LOCK:
        data = _load()
        for t in data["tasks"]:
            if t["title"].strip().lower() == title.strip().lower() and not t["done"]:
                t["done"] = True
                _save(data)
                return True
        return False


# --------------------------------------------------------------- events --

def add_event(title: str, start: str, end: Optional[str] = None,
              location: Optional[str] = None) -> dict:
    with _LOCK:
        data = _load()
        event = {"title": title, "start": start, "end": end, "location": location}
        data["events"].append(event)
        data["events"].sort(key=lambda e: e.get("start", ""))
        _save(data)
        return event


def list_events(on_date: Optional[str] = None) -> list:
    events = _load()["events"]
    if on_date:
        events = [e for e in events if e.get("start", "").startswith(on_date)]
    return sorted(events, key=lambda e: e.get("start", ""))


def next_event() -> Optional[dict]:
    now = datetime.now().isoformat(timespec="minutes")
    upcoming = [e for e in list_events() if e.get("start", "") >= now]
    return upcoming[0] if upcoming else None


def cancel_event(title: str) -> bool:
    with _LOCK:
        data = _load()
        before = len(data["events"])
        data["events"] = [
            e for e in data["events"]
            if e.get("title", "").strip().lower() != title.strip().lower()
        ]
        _save(data)
        return len(data["events"]) < before


# ------------------------------------------------------------- contacts --

def add_contact(name: str, phone: Optional[str] = None,
                email: Optional[str] = None,
                relationship: Optional[str] = None) -> dict:
    with _LOCK:
        data = _load()
        contact = {"name": name, "phone": phone, "email": email,
                   "relationship": relationship}
        data["contacts"].append(contact)
        _save(data)
        return contact


def find_contact(name: str) -> Optional[dict]:
    data = _load()
    name_l = name.strip().lower()
    matches = [c for c in data["contacts"] if name_l in c.get("name", "").lower()]
    return matches[0] if matches else None


# ---------------------------------------------------------------- notes --

def add_note(content: str, tag: Optional[str] = None) -> dict:
    with _LOCK:
        data = _load()
        note = {
            "content": content,
            "tag": tag,
            "created": datetime.now().isoformat(timespec="minutes"),
        }
        data["notes"].append(note)
        _save(data)
        return note


def search_notes(query: str) -> list:
    data = _load()
    q = query.strip().lower()
    return [
        n for n in data["notes"]
        if q in n.get("content", "").lower() or (n.get("tag") and q in n.get("tag", "").lower())
    ]


# --------------------------------------------------------- shopping list --

def add_shopping_item(item: str, quantity: Optional[str] = None) -> dict:
    with _LOCK:
        data = _load()
        entry = {"item": item, "quantity": quantity}
        data["shopping_list"].append(entry)
        _save(data)
        return entry


def list_shopping() -> list:
    return _load()["shopping_list"]


def clear_shopping() -> None:
    with _LOCK:
        data = _load()
        data["shopping_list"] = []
        _save(data)


# ------------------------------------------------------- important dates --

def add_important_date(name: str, on_date: str, occasion: str) -> dict:
    with _LOCK:
        data = _load()
        entry = {"name": name, "date": on_date, "occasion": occasion}
        data["important_dates"].append(entry)
        _save(data)
        return entry


def upcoming_important_dates(days_ahead: int = 30) -> list:
    data = _load()
    today = date.today()
    horizon = today + timedelta(days=days_ahead)
    upcoming = []
    for d in data["important_dates"]:
        try:
            parsed = date.fromisoformat(d["date"])
        except ValueError:
            continue
        this_year = date(today.year, parsed.month, parsed.day)
        if this_year < today:
            this_year = date(today.year + 1, parsed.month, parsed.day)
        if today <= this_year <= horizon:
            upcoming.append({**d, "next_occurrence": this_year.isoformat()})
    return sorted(upcoming, key=lambda x: x["next_occurrence"])
