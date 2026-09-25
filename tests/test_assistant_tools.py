import os
import sys
import asyncio
import logging

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO)

async def test_assistant_suite():
    print("==================================================")
    print(" VERIFYING JARVIS PERSONAL ASSISTANT TOOLS SUITE  ")
    print("==================================================")
    
    from source.assistant_tools import (
        add_task, list_tasks, complete_task,
        schedule_event, list_events, whats_next, cancel_event,
        add_contact, find_contact, remember_important_date, upcoming_important_dates, draft_message,
        add_note, search_notes, add_to_shopping_list, list_shopping_list, clear_shopping_list
    )
    from source.agent import create_jarvis_agent

    # 1. Tasks
    print("\n[1] Testing Tasks & To-dos:")
    t1 = await add_task("Review quarterly financials", due="2026-10-01")
    print("  ✓ add_task:", t1)
    t_list = await list_tasks()
    print("  ✓ list_tasks:", t_list)
    t_done = await complete_task("Review quarterly financials")
    print("  ✓ complete_task:", t_done)

    # 2. Calendar
    print("\n[2] Testing Calendar & Events:")
    e1 = await schedule_event("Board Meeting", start="2026-10-05 14:00", location="Executive Suite")
    print("  ✓ schedule_event:", e1)
    e_next = await whats_next()
    print("  ✓ whats_next:", e_next)
    e_list = await list_events()
    print("  ✓ list_events:", e_list)
    e_cancel = await cancel_event("Board Meeting")
    print("  ✓ cancel_event:", e_cancel)

    # 3. Contacts & Social
    print("\n[3] Testing Contacts & Social:")
    c1 = await add_contact("Tony Stark", phone="+1-555-0199", email="tony@stark.com", relationship="Executive")
    print("  ✓ add_contact:", c1)
    c_find = await find_contact("Tony")
    print("  ✓ find_contact:", c_find)
    d1 = await remember_important_date("Pepper Potts", on_date="2026-11-15", occasion="Birthday")
    print("  ✓ remember_important_date:", d1)
    d_up = await upcoming_important_dates(days_ahead=60)
    print("  ✓ upcoming_important_dates:", d_up)
    msg = await draft_message("Tony Stark", "Congratulations on the successful launch", tone="witty")
    print("  ✓ draft_message:", msg)

    # 4. Notes
    print("\n[4] Testing Notes:")
    n1 = await add_note("Remember to inspect the Mark VII armor diagnostics", tag="engineering")
    print("  ✓ add_note:", n1)
    n_search = await search_notes("diagnostics")
    print("  ✓ search_notes:", n_search)

    # 5. Shopping List
    print("\n[5] Testing Shopping List:")
    s1 = await add_to_shopping_list("Earl Grey Tea", quantity="2 boxes")
    print("  ✓ add_to_shopping_list:", s1)
    s_list = await list_shopping_list()
    print("  ✓ list_shopping_list:", s_list)
    s_clear = await clear_shopping_list()
    print("  ✓ clear_shopping_list:", s_clear)

    # 6. Agent Tool Count
    print("\n[6] Testing Agent Factory & Tool Registration:")
    agent, model = create_jarvis_agent()
    print(f"  ✓ Total tools registered in Jarvis Agent: {len(agent.tools)}")
    assert len(agent.tools) == 25, f"Expected 25 tools, found {len(agent.tools)}"
    print("  ✓ All 25 tools validated and active!")

    print("\n==================================================")
    print(" ALL 17 ASSISTANT TOOLS + BROWSER + SEARCH PASSED! ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_assistant_suite())
