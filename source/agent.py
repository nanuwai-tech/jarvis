import os
import logging
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    Agent,
    AgentSession,
    EndpointingOptions,
    InterruptionOptions,
    TurnHandlingOptions,
    cli,
    llm,
)
from livekit.plugins import google, openai, silero

from source.tools import search_web
from source.browser import (
    open_browser,
    navigate,
    click_element,
    go_back,
    open_tab,
    switch_tab,
    close_browser,
)

# Load environment variables (.env.local or .env)
env_local = Path(__file__).parent.parent / ".env.local"
if env_local.exists():
    load_dotenv(dotenv_path=env_local)
else:
    load_dotenv()

logger = logging.getLogger("jarvis-agent")

# Load Persona Instructions
PROMPT_FILE = Path(__file__).parent.parent / "Prompt.txt"
if PROMPT_FILE.exists():
    INSTRUCTIONS = PROMPT_FILE.read_text(encoding="utf-8")
else:
    INSTRUCTIONS = """You are Jarvis, a witty and impeccably composed AI butler.

PERSONALITY
- Speak with dry, understated wit — clever, never cruel.
- Address the user as "sir" (or their preferred title) unless told otherwise.
- Stay unflappable and efficient, like someone who has seen everything.
- Keep responses concise; you're a voice assistant, not an essayist.

CAPABILITIES
- You can see through the user's camera and shared screen when active.
  Describe what you observe naturally, without narrating that you're "looking."
- You can hear and respond in whatever language the user speaks to you in.

TOOL USE
- Use `search_web` when the user asks you to look something up, check a
  fact, or find current information (weather, news, prices, etc.).
- Use the browser tools (open_browser, navigate, click_element, go_back,
  open_tab, switch_tab, close_browser) when asked to open a site or
  interact with something on screen.
- Only call a tool when it's genuinely needed — never narrate that you're
  "using a tool."

CONVERSATIONAL EXAMPLES
User: "Jarvis, can you check the weather in Rome?"
Jarvis: "Of course, sir. Rome is a pleasant 24 degrees with clear skies —
perfect for anyone unwise enough to be outdoors on a workday."

User: "Open Google Maps and find the way to the airport."
Jarvis: "As you wish, sir. Maps is open with directions to the airport —
the fastest route runs about twenty minutes, traffic permitting."

BOUNDARIES
- Never fabricate information a tool could verify — search, or say you
  don't know.
- Keep the humor light; drop it entirely if the user seems stressed or
  the topic turns serious.
"""


def build_llm_fallback_chain() -> llm.LLM:
    """Constructs a high-speed multi-model fallback chain using OpenRouter and Gemini."""
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")
    
    llm_instances: List[llm.LLM] = []

    # 1. Ultra-fast OpenRouter Gemini Flash model
    if openrouter_key:
        llm_instances.append(
            openai.LLM(
                model="google/gemini-2.5-flash",
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                temperature=0.7,
            )
        )
        # 2. OpenRouter Fast Fallback (GPT-4o Mini)
        llm_instances.append(
            openai.LLM(
                model="openai/gpt-4o-mini",
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                temperature=0.7,
            )
        )
        # 3. OpenRouter High-Capacity Fallback (Llama 3.3 70B)
        llm_instances.append(
            openai.LLM(
                model="meta-llama/llama-3.3-70b-instruct",
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                temperature=0.7,
            )
        )

    # 4. Direct Google Gemini LLM
    if google_key and google_key != "PLACEHOLDER_KEY":
        try:
            llm_instances.append(
                google.LLM(
                    model="gemini-2.5-flash",
                    api_key=google_key,
                    temperature=0.7,
                )
            )
        except Exception as e:
            logger.warning(f"Could not initialize direct Google LLM: {e}")

    if not llm_instances:
        # Default placeholder instance if keys not yet set
        return openai.LLM(
            model="google/gemini-2.5-flash",
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key or "DUMMY_KEY",
        )

    if len(llm_instances) == 1:
        return llm_instances[0]

    # Wrap with FallbackAdapter: max 2.5s attempt timeout per model before switching
    return llm.FallbackAdapter(
        llm=llm_instances,
        attempt_timeout=2.5,
        retry_interval=0.2,
    )


def create_jarvis_agent(
    instructions: str = INSTRUCTIONS,
    voice: str = "Aoede",
    api_key: Optional[str] = None
) -> tuple[Agent, any]:
    """Factory creating the Jarvis Agent instance with fallback options."""
    key = api_key or os.getenv("GOOGLE_API_KEY") or "PLACEHOLDER_KEY"
    engine_mode = os.getenv("AGENT_ENGINE", "realtime").lower()

    if engine_mode == "fallback":
        # Multi-provider fast fallback LLM engine
        model = build_llm_fallback_chain()
    else:
        # Native Realtime multimodal Gemini model (Speech + Vision)
        model = google.realtime.RealtimeModel(
            voice=voice,
            instructions=instructions,
            api_key=key,
        )

    agent = Agent(
        instructions=instructions,
        llm=model,
        tools=[
            search_web,
            open_browser,
            navigate,
            click_element,
            go_back,
            open_tab,
            switch_tab,
            close_browser,
        ],
    )
    return agent, model


def prewarm(proc: JobProcess):
    """Prewarm local VAD model and cache connections."""
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    """Entrypoint for each connected room session with ultra-low latency tuning."""
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    agent, model = create_jarvis_agent()

    # Optimized Turn Handling to achieve 1-3 second response times:
    # 1. min_delay = 0.15s (starts processing 150ms after user pauses)
    # 2. max_delay = 0.45s (forces turn completion within 450ms)
    # 3. Interruption enabled with 200ms threshold
    turn_handling = TurnHandlingOptions(
        endpointing=EndpointingOptions(
            min_delay=0.15,
            max_delay=0.45,
        ),
        interruption=InterruptionOptions(
            enabled=True,
            min_duration=0.2,
        ),
    )

    vad = ctx.proc.userdata.get("vad") or silero.VAD.load()

    session = AgentSession(
        llm=model,
        vad=vad,
        turn_handling=turn_handling,
    )

    await session.start(agent, room=ctx.room)
    logger.info("Jarvis session active with low-latency turn handling & fallback ready.")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
