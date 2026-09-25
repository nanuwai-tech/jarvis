import logging
from livekit.agents import function_tool

logger = logging.getLogger("jarvis-tools")


def _run_ddg_search(query: str) -> str:
    """Helper to perform DuckDuckGo search using langchain or duckduckgo_search."""
    try:
        from langchain_community.tools import DuckDuckGoSearchRun
        return DuckDuckGoSearchRun().run(query)
    except Exception as lc_err:
        logger.debug(f"LangChain DDG search fallback due to: {lc_err}")
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            if not results:
                return "No relevant search results found."
            formatted = "\n\n".join(
                f"Title: {r.get('title', '')}\nSnippet: {r.get('body', '')}\nURL: {r.get('href', '')}"
                for r in results
            )
            return formatted


@function_tool
async def search_web(query: str) -> str:
    """Use this tool to search the web for information related to the given query.
    
    Args:
        query: The search query string.
    """
    try:
        logger.info(f"Executing search_web for query: {query}")
        result = _run_ddg_search(query)
        logger.info(f"search_web result for '{query}': {result[:200]}...")
        return result
    except Exception as e:
        logger.error(f"search_web failed: {e}", exc_info=True)
        return f"The web search failed due to an error: {e}. Please inform the user."
