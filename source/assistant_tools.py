"""
Function tools providing Jarvis with professional personal assistant capabilities:
- Tasks & To-dos (add, list, complete)
- Calendar & Meetings (schedule, list, next, cancel)
- Contacts & Social network (add, lookup, draft messages)
- Recurring Important Dates (birthdays, anniversaries)
- Everyday notes & Categorized thoughts
- Shopping & Grocery lists
"""

import logging
from typing import Optional
from livekit.agents import function_tool
from source import assistant_data as store

logger = logging.getLogger("jarvis-assistant-tools")


# ============================================================ WORK & TASKS =====

@function_tool
async def add_task(title: str, due: Optional[str] = None) -> str:
    """Add a task or to-do item. `due`, if given, should be an ISO date
    (YYYY-MM-DD) or date+time (YYYY-MM-DD HH:MM). Use this whenever the
    user asks you to remember something they need to do."""
    task = store.add_task(title, due)
    logger.info(f"Added task: {task}")
    if due:
        return f"Added '{title}' to your tasks, due {due}, sir."
    return f"Added '{title}' to your tasks, sir."


@function_tool
async def list_tasks() -> str:
    """List the user's outstanding (not yet completed) tasks. Use this
    when the user asks what they need to do, or for their to-do list."""
    tasks = store.list_tasks(pending_only=True)
    if not tasks:
        return "You have no outstanding tasks, sir."
    lines = [t["title"] + (f" (due {t['due']})" if t.get("due") else "") for t in tasks]
    return "Outstanding tasks: " + "; ".join(lines)


@function_tool
async def complete_task(title: str) -> str:
    """Mark a task as complete by its title. Use this when the user
    says they've finished or done something that was on their list."""
    ok = store.complete_task(title)
    return f"Marked '{title}' as completed, sir." if ok else \
        f"I couldn't find an open task called '{title}', sir."


@function_tool
async def schedule_event(title: str, start: str, end: Optional[str] = None, location: Optional[str] = None) -> str:
    """Schedule a meeting or event. `start` and `end` should be ISO
    date+time (YYYY-MM-DD HH:MM); `end` is optional. Use this whenever
    the user asks you to book, schedule, or put something on the calendar."""
    store.add_event(title, start, end, location)
    logger.info(f"Scheduled event: {title} at {start}")
    where = f" at {location}" if location else ""
    return f"Scheduled '{title}' for {start}{where}, sir."


@function_tool
async def list_events(on_date: Optional[str] = None) -> str:
    """List calendar events. Pass `on_date` as an ISO date (YYYY-MM-DD)
    to filter to a single day, or omit it to list everything upcoming.
    Use this when the user asks what's on their schedule or calendar."""
    events = store.list_events(on_date)
    if not events:
        return "Nothing on the calendar" + (f" for {on_date}, sir." if on_date else ", sir.")
    lines = [
        e["title"] + f" at {e['start']}" + (f" ({e['location']})" if e.get("location") else "")
        for e in events
    ]
    return "Calendar: " + "; ".join(lines)


@function_tool
async def whats_next() -> str:
    """Tell the user their next upcoming calendar event. Use this when
    they ask what's next, or what they have coming up."""
    event = store.next_event()
    if not event:
        return "There is nothing upcoming on your calendar, sir."
    where = f" at {event['location']}" if event.get("location") else ""
    return f"Your next event is '{event['title']}' at {event['start']}{where}, sir."


@function_tool
async def cancel_event(title: str) -> str:
    """Cancel or remove a calendar event by title. Use this when the
    user asks to cancel, delete, or clear a meeting."""
    ok = store.cancel_event(title)
    return f"Cancelled '{title}', sir." if ok else f"I couldn't find an event called '{title}', sir."


# ========================================================== SOCIAL & CONTACTS =====

@function_tool
async def add_contact(name: str, phone: Optional[str] = None, email: Optional[str] = None, relationship: Optional[str] = None) -> str:
    """Save a new contact. `relationship` is a short label like
    'friend', 'colleague', or 'manager'. Use this when the user gives you
    someone's details to remember."""
    store.add_contact(name, phone, email, relationship)
    return f"Saved {name} to your contacts, sir."


@function_tool
async def find_contact(name: str) -> str:
    """Look up a saved contact's details by name. Use this when the
    user asks for someone's phone number, email, or who someone is."""
    c = store.find_contact(name)
    if not c:
        return f"I don't have a contact saved for '{name}', sir."
    parts = [c["name"]]
    if c.get("relationship"):
        parts.append(f"({c['relationship']})")
    if c.get("phone"):
        parts.append(f"phone: {c['phone']}")
    if c.get("email"):
        parts.append(f"email: {c['email']}")
    return " — ".join(parts)


@function_tool
async def remember_important_date(name: str, on_date: str, occasion: str) -> str:
    """Remember a recurring important date for someone, such as a
    birthday or anniversary. `on_date` should be an ISO date
    (YYYY-MM-DD); the year is ignored and it repeats yearly."""
    store.add_important_date(name, on_date, occasion)
    return f"I will remember {name}'s {occasion} every year around {on_date[5:]}, sir."


@function_tool
async def upcoming_important_dates(days_ahead: int = 30) -> str:
    """List important dates (birthdays, anniversaries) coming up within
    the given number of days (default 30)."""
    dates = store.upcoming_important_dates(days_ahead)
    if not dates:
        return f"No important dates found in the next {days_ahead} days, sir."
    lines = [f"{d['name']}'s {d['occasion']} on {d['next_occurrence']}" for d in dates]
    return "Upcoming dates: " + "; ".join(lines)


@function_tool
async def draft_message(recipient: str, occasion_or_context: str, tone: str = "polite") -> str:
    """Draft a short message to a contact for a given occasion or context
    (e.g. 'happy birthday', 'confirming our meeting', 'running 10 minutes late').
    Drafts text only — does not send."""
    return (
        f"Here is a draft for {recipient} ({tone} tone): "
        f"\"Dear {recipient}, {occasion_or_context}. Please let me know if you need anything further.\""
    )


# ======================================================== PERSONAL & SHOPPING =====

@function_tool
async def add_note(content: str, tag: Optional[str] = None) -> str:
    """Save a personal note or thought, optionally tagged with a category
    (e.g. 'work', 'idea', 'project'). Use this when the user asks to jot something down."""
    store.add_note(content, tag)
    return "Noted, sir." if not tag else f"Noted and tagged '{tag}', sir."


@function_tool
async def search_notes(query: str) -> str:
    """Search previously saved notes for a keyword. Use this when the
    user asks what they wrote down about something."""
    notes = store.search_notes(query)
    if not notes:
        return f"No notes found matching '{query}', sir."
    return "Found notes: " + "; ".join(n["content"] for n in notes)


@function_tool
async def add_to_shopping_list(item: str, quantity: Optional[str] = None) -> str:
    """Add an item to the shopping list. Use this when the user says
    they need to buy or pick up something."""
    store.add_shopping_item(item, quantity)
    return (f"Added {quantity} {item} to your shopping list, sir." if quantity
            else f"Added '{item}' to your shopping list, sir.")


@function_tool
async def list_shopping_list() -> str:
    """Read back the current shopping list. Use this when the user asks
    what's on their shopping list, or before they go shopping."""
    items = store.list_shopping()
    if not items:
        return "Your shopping list is currently empty, sir."
    lines = [i["item"] + (f" ({i['quantity']})" if i.get("quantity") else "") for i in items]
    return "Shopping list: " + ", ".join(lines)


@function_tool
async def clear_shopping_list() -> str:
    """Clear the entire shopping list. Use this when the user says
    they have finished shopping or want to reset the list."""
    store.clear_shopping()
    return "Shopping list cleared, sir."


# Consolidated list of all assistant function tools
ASSISTANT_TOOLS = [
    add_task,
    list_tasks,
    complete_task,
    schedule_event,
    list_events,
    whats_next,
    cancel_event,
    add_contact,
    find_contact,
    remember_important_date,
    upcoming_important_dates,
    draft_message,
    add_note,
    search_notes,
    add_to_shopping_list,
    list_shopping_list,
    clear_shopping_list,
]
