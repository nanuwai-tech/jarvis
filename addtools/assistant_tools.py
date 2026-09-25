"""
Function tools that give Jarvis professional-personal-assistant duties:
managing work tasks and meetings, social relationships and important
dates, and everyday personal-life admin like notes and shopping lists.

Each tool is a thin wrapper around assistant_data.py, translating
between the model's structured calls and natural-language responses it
can speak back to the user. Register all of these in agent.py's tools
list, and see PROMPT_ADDITIONS below for the matching system-prompt
section.
"""

import logging

from livekit.agents import RunContext, function_tool

import assistant_data as store

logger = logging.getLogger("jarvis-assistant-tools")


# ============================================================ WORK =====

@function_tool()
async def add_task(context: RunContext, title: str, due: str = None) -> str:
    """Add a task or to-do item. `due`, if given, should be an ISO date
    (YYYY-MM-DD) or date+time (YYYY-MM-DD HH:MM). Use this whenever the
    user asks you to remember something they need to do."""
    task = store.add_task(title, due)
    logger.info(f"added task: {task}")
    if due:
        return f"Added '{title}' to your tasks, due {due}."
    return f"Added '{title}' to your tasks."


@function_tool()
async def list_tasks(context: RunContext) -> str:
    """List the user's outstanding (not yet completed) tasks. Use this
    when the user asks what they need to do, or for their to-do list."""
    tasks = store.list_tasks(pending_only=True)
    if not tasks:
        return "There are no outstanding tasks."
    lines = [t["title"] + (f" (due {t['due']})" if t["due"] else "") for t in tasks]
    return "Outstanding tasks: " + "; ".join(lines)


@function_tool()
async def complete_task(context: RunContext, title: str) -> str:
    """Mark a task as complete by its title. Use this when the user
    says they've finished or done something that was on their list."""
    ok = store.complete_task(title)
    return f"Marked '{title}' as done." if ok else \
        f"I couldn't find an open task called '{title}'."


@function_tool()
async def schedule_event(context: RunContext, title: str, start: str,
                          end: str = None, location: str = None) -> str:
    """Schedule a meeting or event. `start` and `end` should be ISO
    date+time (YYYY-MM-DD HH:MM); `end` is optional. Use this whenever
    the user asks you to book, schedule, or put something on the
    calendar."""
    store.add_event(title, start, end, location)
    logger.info(f"scheduled event: {title} at {start}")
    where = f" at {location}" if location else ""
    return f"Scheduled '{title}' for {start}{where}."


@function_tool()
async def list_events(context: RunContext, on_date: str = None) -> str:
    """List calendar events. Pass `on_date` as an ISO date (YYYY-MM-DD)
    to filter to a single day, or omit it to list everything upcoming.
    Use this when the user asks what's on their schedule or calendar."""
    events = store.list_events(on_date)
    if not events:
        return "Nothing on the calendar" + (f" for {on_date}." if on_date else ".")
    lines = [
        e["title"] + f" at {e['start']}" + (f" ({e['location']})" if e["location"] else "")
        for e in events
    ]
    return "Calendar: " + "; ".join(lines)


@function_tool()
async def whats_next(context: RunContext) -> str:
    """Tell the user their next upcoming calendar event. Use this when
    they ask what's next, or what they have coming up."""
    event = store.next_event()
    if not event:
        return "There's nothing coming up on the calendar."
    where = f" at {event['location']}" if event["location"] else ""
    return f"Your next event is '{event['title']}' at {event['start']}{where}."


@function_tool()
async def cancel_event(context: RunContext, title: str) -> str:
    """Cancel or remove a calendar event by title. Use this when the
    user asks to cancel, delete, or clear a meeting."""
    ok = store.cancel_event(title)
    return f"Cancelled '{title}'." if ok else f"I couldn't find an event called '{title}'."


# ========================================================== SOCIAL =====

@function_tool()
async def add_contact(context: RunContext, name: str, phone: str = None,
                       email: str = None, relationship: str = None) -> str:
    """Save a new contact. `relationship` is a short label like
    'friend', 'sister', or 'manager'. Use this when the user gives you
    someone's details to remember."""
    store.add_contact(name, phone, email, relationship)
    return f"Saved {name} to your contacts."


@function_tool()
async def find_contact(context: RunContext, name: str) -> str:
    """Look up a saved contact's details by name. Use this when the
    user asks for someone's phone number, email, or who someone is."""
    c = store.find_contact(name)
    if not c:
        return f"I don't have a contact saved for '{name}'."
    parts = [c["name"]]
    if c["relationship"]:
        parts.append(f"({c['relationship']})")
    if c["phone"]:
        parts.append(f"phone {c['phone']}")
    if c["email"]:
        parts.append(f"email {c['email']}")
    return " — ".join(parts)


@function_tool()
async def remember_important_date(context: RunContext, name: str,
                                   on_date: str, occasion: str) -> str:
    """Remember a recurring important date for someone, such as a
    birthday or anniversary. `on_date` should be an ISO date
    (YYYY-MM-DD); the year is ignored and it repeats yearly. Use this
    when the user tells you someone's birthday or a similar date worth
    remembering."""
    store.add_important_date(name, on_date, occasion)
    return f"I'll remember {name}'s {occasion} every year around {on_date[5:]}."


@function_tool()
async def upcoming_important_dates(context: RunContext, days_ahead: int = 30) -> str:
    """List important dates (birthdays, anniversaries) coming up within
    the given number of days (default 30). Use this when the user asks
    if anyone has a birthday coming up, or wants a heads-up on social
    dates."""
    dates = store.upcoming_important_dates(days_ahead)
    if not dates:
        return f"No important dates in the next {days_ahead} days."
    lines = [f"{d['name']}'s {d['occasion']} on {d['next_occurrence']}" for d in dates]
    return "Coming up: " + "; ".join(lines)


@function_tool()
async def draft_message(context: RunContext, recipient: str,
                         occasion_or_context: str, tone: str = "warm") -> str:
    """Draft a short text or social message to a contact for a given
    occasion or context (e.g. 'happy birthday', 'checking in', 'running
    10 minutes late'), in the given tone. This drafts text only — it
    does not send anything. Use this when the user asks you to write or
    suggest a message for someone."""
    return (
        f"Here's a draft for {recipient} ({tone} tone): "
        f"\"Hey {recipient}, {occasion_or_context}. Let me know if you need anything!\""
    )


# ======================================================== PERSONAL =====

@function_tool()
async def add_note(context: RunContext, content: str, tag: str = None) -> str:
    """Save a personal note or thought, optionally tagged with a short
    category (e.g. 'work', 'idea', 'health'). Use this when the user
    asks you to remember or jot something down that isn't a task or
    event."""
    store.add_note(content, tag)
    return "Noted." if not tag else f"Noted, tagged '{tag}'."


@function_tool()
async def search_notes(context: RunContext, query: str) -> str:
    """Search previously saved notes for a keyword. Use this when the
    user asks what they wrote down about something."""
    notes = store.search_notes(query)
    if not notes:
        return f"No notes found about '{query}'."
    return "Found: " + "; ".join(n["content"] for n in notes)


@function_tool()
async def add_to_shopping_list(context: RunContext, item: str, quantity: str = None) -> str:
    """Add an item to the shopping or grocery list. Use this when the
    user says they need to buy or pick up something."""
    store.add_shopping_item(item, quantity)
    return (f"Added {quantity} {item} to the shopping list." if quantity
            else f"Added {item} to the shopping list.")


@function_tool()
async def list_shopping_list(context: RunContext) -> str:
    """Read back the current shopping or grocery list. Use this when
    the user asks what's on their shopping list, or before they go
    shopping."""
    items = store.list_shopping()
    if not items:
        return "The shopping list is empty."
    lines = [i["item"] + (f" ({i['quantity']})" if i["quantity"] else "") for i in items]
    return "Shopping list: " + ", ".join(lines)


@function_tool()
async def clear_shopping_list(context: RunContext) -> str:
    """Clear the entire shopping list. Use this when the user says
    they've finished shopping or wants to start the list over."""
    store.clear_shopping()
    return "Shopping list cleared."


# Every tool that should be registered with the agent, in one place so
# agent.py can do:  from assistant_tools import ASSISTANT_TOOLS
ASSISTANT_TOOLS = [
    add_task, list_tasks, complete_task,
    schedule_event, list_events, whats_next, cancel_event,
    add_contact, find_contact, remember_important_date, upcoming_important_dates, draft_message,
    add_note, search_notes, add_to_shopping_list, list_shopping_list, clear_shopping_list,
]


# Paste this into the system prompt (instructions string) in agent.py,
# alongside the existing tool-usage guidance for search_web / browser.
PROMPT_ADDITIONS = """
PERSONAL ASSISTANT DUTIES
- You manage the user's work, social, and personal life through your
  tools: tasks and the calendar for work, contacts and important dates
  for social life, notes and the shopping list for everyday admin.
- When the user mentions something they need to do, attend, remember,
  or buy, use the matching tool right away rather than only
  acknowledging it verbally.
- When asked what's on their plate, check both tasks and the calendar
  and give a short, spoken-friendly summary — don't read back every
  field, just what matters.
- Convert relative dates and times the user gives ("next Tuesday at 3",
  "tomorrow") into ISO date/time format before calling a tool.
"""
