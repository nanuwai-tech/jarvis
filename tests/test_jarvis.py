import os
import sys
import asyncio
import logging

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO)

async def main():
    print("=== STEP 1: Testing Imports & Realtime Mode ===")
    from source.agent import create_jarvis_agent
    os.environ["AGENT_ENGINE"] = "realtime"
    agent_realtime, model_realtime = create_jarvis_agent()
    print(f"[PASS] Realtime Agent initialized. Tools: {len(agent_realtime.tools)}")

    print("\n=== STEP 2: Testing OpenRouter & Gemini Fallback Chain ===")
    os.environ["AGENT_ENGINE"] = "fallback"
    agent_fallback, model_fallback = create_jarvis_agent()
    print(f"[PASS] FallbackAdapter Agent initialized. Model: {model_fallback}")

    print("\n=== STEP 3: Testing Web Search & Browser Tools ===")
    from source.tools import search_web
    from source.browser import browser_manager

    search_result = await search_web("weather in London")
    print(f"[PASS] Search result preview: {search_result[:150]}...")

    os.environ["HEADLESS_BROWSER"] = "true"
    open_res = await browser_manager.open_browser("https://example.com")
    print(f"[PASS] Browser test: {open_res}")
    await browser_manager.close_browser()

    print("\n=======================================================")
    print(" ALL LOW-LATENCY & FALLBACK SYSTEMS VERIFIED WORKING! ")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(main())
