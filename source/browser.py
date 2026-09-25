import os
import logging
from typing import Optional, List
from playwright.async_api import async_playwright, Playwright, Browser, BrowserContext, Page
from livekit.agents import function_tool

logger = logging.getLogger("jarvis-browser")


class BrowserManager:
    """Manages an async Playwright browser session for Jarvis."""

    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._pages: List[Page] = []
        self._active_page_index: int = 0

    @property
    def is_running(self) -> bool:
        return self._browser is not None and self._browser.is_connected()

    async def _ensure_browser(self):
        """Ensures that the browser instance and context are running."""
        if not self.is_running:
            headless = os.getenv("HEADLESS_BROWSER", "false").lower() in ("true", "1", "yes")
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=headless,
                args=["--start-maximized"]
            )
            self._context = await self._browser.new_context(no_viewport=True)
            page = await self._context.new_page()
            self._pages = [page]
            self._active_page_index = 0

    @property
    def current_page(self) -> Optional[Page]:
        if self._pages and 0 <= self._active_page_index < len(self._pages):
            return self._pages[self._active_page_index]
        return None

    async def open_browser(self, url: str) -> str:
        """Launches the browser and navigates to the specified URL."""
        try:
            await self._ensure_browser()
            target_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
            page = self.current_page
            if page:
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
                title = await page.title()
                return f"Browser opened successfully at {target_url}. Page title: '{title}'."
            return "Failed to open page in browser."
        except Exception as e:
            logger.error(f"Error opening browser at {url}: {e}", exc_info=True)
            return f"Failed to open browser at {url}: {e}"

    async def navigate(self, url: str) -> str:
        """Navigates current active tab to a new URL."""
        try:
            await self._ensure_browser()
            target_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
            page = self.current_page
            if page:
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
                title = await page.title()
                return f"Navigated to {target_url}. Current page title: '{title}'."
            return "No active tab found to navigate."
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}", exc_info=True)
            return f"Navigation to {url} failed: {e}"

    async def click_element(self, selector: str) -> str:
        """Clicks an element by selector or text."""
        try:
            if not self.is_running or not self.current_page:
                return "Browser is not open. Please open a website first."
            page = self.current_page
            try:
                await page.click(selector, timeout=5000)
            except Exception:
                await page.get_by_text(selector).first.click(timeout=5000)
            return f"Successfully clicked element '{selector}'."
        except Exception as e:
            logger.error(f"Error clicking element '{selector}': {e}", exc_info=True)
            return f"Could not click '{selector}': {e}"

    async def go_back(self) -> str:
        """Navigates back to the previous page in history."""
        try:
            if not self.is_running or not self.current_page:
                return "Browser is not open."
            page = self.current_page
            await page.go_back(wait_until="domcontentloaded", timeout=10000)
            title = await page.title()
            return f"Navigated back. Current page title: '{title}'."
        except Exception as e:
            logger.error(f"Error going back: {e}", exc_info=True)
            return f"Could not go back: {e}"

    async def open_tab(self, url: str) -> str:
        """Opens a new tab and navigates to the given URL."""
        try:
            await self._ensure_browser()
            target_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
            new_page = await self._context.new_page()
            self._pages.append(new_page)
            self._active_page_index = len(self._pages) - 1
            await new_page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            title = await new_page.title()
            return f"Opened new tab #{self._active_page_index + 1} at {target_url}. Title: '{title}'."
        except Exception as e:
            logger.error(f"Error opening new tab at {url}: {e}", exc_info=True)
            return f"Could not open new tab: {e}"

    async def switch_tab(self, index: int) -> str:
        """Switches to the tab at the given index (1-based or 0-based)."""
        try:
            if not self.is_running or not self._pages:
                return "No browser tabs are currently open."
            target_idx = index - 1 if index >= 1 else index
            if 0 <= target_idx < len(self._pages):
                self._active_page_index = target_idx
                page = self._pages[self._active_page_index]
                await page.bring_to_front()
                title = await page.title()
                return f"Switched to tab #{target_idx + 1}: '{title}'."
            return f"Tab index {index} is out of range. Total open tabs: {len(self._pages)}."
        except Exception as e:
            logger.error(f"Error switching to tab {index}: {e}", exc_info=True)
            return f"Could not switch tab: {e}"

    async def close_browser(self) -> str:
        """Closes all browser windows and shuts down Playwright."""
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
            self._playwright = None
            self._browser = None
            self._context = None
            self._pages = []
            self._active_page_index = 0
            return "Browser closed successfully, sir."
        except Exception as e:
            logger.error(f"Error closing browser: {e}", exc_info=True)
            return f"Error closing browser: {e}"


# Singleton instance for the agent process
browser_manager = BrowserManager()


@function_tool
async def open_browser(url: str) -> str:
    """Open a browser window and navigate to a URL.
    
    Args:
        url: The web URL to navigate to.
    """
    return await browser_manager.open_browser(url)


@function_tool
async def navigate(url: str) -> str:
    """Navigate the current active browser tab to a new URL.
    
    Args:
        url: The destination web URL.
    """
    return await browser_manager.navigate(url)


@function_tool
async def click_element(selector: str) -> str:
    """Click a button, link, or element on the current web page.
    
    Args:
        selector: CSS selector or text of the element to click.
    """
    return await browser_manager.click_element(selector)


@function_tool
async def go_back() -> str:
    """Navigate back to the previous page in browser history."""
    return await browser_manager.go_back()


@function_tool
async def open_tab(url: str) -> str:
    """Open a new browser tab with the specified URL.
    
    Args:
        url: The web address to load in the new tab.
    """
    return await browser_manager.open_tab(url)


@function_tool
async def switch_tab(index: int) -> str:
    """Switch focus to a specific open browser tab.
    
    Args:
        index: The tab index number (1-based).
    """
    return await browser_manager.switch_tab(index)


@function_tool
async def close_browser() -> str:
    """Close the desktop browser."""
    return await browser_manager.close_browser()
