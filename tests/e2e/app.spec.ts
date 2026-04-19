import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the app to finish initial load (loading spinner disappears). */
async function waitForApp(page: Page) {
	await page.waitForSelector("#content .loading", { state: "detached", timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Page load
// ---------------------------------------------------------------------------

test.describe("Page load", () => {
	test("loads default chapter (Genesis 1) with NHEB", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const content = page.locator("#content");
		await expect(content).toContainText("Genesis");
		await expect(content).toContainText("In the beginning");
	});

	test("loads a specific chapter from URL", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		const content = page.locator("#content");
		await expect(content).toContainText("John");
		await expect(content).toContainText("For God so loved the world");
	});

	test("loads a specific verse from URL", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3&verse=16");
		await waitForApp(page);
		const content = page.locator("#content");
		await expect(content).toContainText("John 3:16");
		await expect(content).toContainText("For God so loved the world");
	});

	test("loads a different translation from URL", async ({ page }) => {
		await page.goto("/?t=KJV&book=gen&chapter=1");
		await waitForApp(page);
		const content = page.locator("#content");
		await expect(content).toContainText("Genesis");
		// KJV wording
		await expect(content).toContainText(
			"In the beginning God created the heaven and the earth",
		);
	});

	test("title bar shows ΣΑΝΑΘΕΩΣ", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#title-bar")).toContainText("ΣΑΝΑΘΕΩΣ");
	});
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test.describe("Search", () => {
	test("text search returns results", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.fill("#search-input", '"For God so loved"');
		// Debounce is 150ms; wait for results to appear
		await page.waitForSelector(".result", { timeout: 5_000 });
		const results = page.locator(".result");
		await expect(results.first()).toContainText("John 3:16");
	});

	test("reference query navigates to chapter", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.fill("#search-input", "Revelation 1");
		// Navigation, not search results
		await expect(page.locator("#content")).toContainText("Revelation", { timeout: 5_000 });
		await expect(page.locator(".result")).toHaveCount(0);
	});

	test("search URL param loads results directly", async ({ page }) => {
		await page.goto('/?q="grace"');
		await waitForApp(page);
		await page.waitForSelector(".result", { timeout: 5_000 });
		const count = await page.locator(".result").count();
		expect(count).toBeGreaterThan(0);
	});

	test("empty search returns to default view", async ({ page }) => {
		await page.goto('/?q="love"');
		await waitForApp(page);
		await page.waitForSelector(".result", { timeout: 5_000 });
		// Clear the search
		await page.fill("#search-input", "");
		// Should return to chapter view with no results
		await expect(page.locator(".result")).toHaveCount(0, { timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Chapter navigation
// ---------------------------------------------------------------------------

test.describe("Chapter navigation", () => {
	test("next arrow navigates to next chapter", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1");
		await waitForApp(page);
		// Click the last (bottom) next-chapter nav arrow
		const nextArrows = page.locator('.nav-arrow[data-chapter="2"]');
		await nextArrows.first().click();
		await expect(page.locator("#content")).toContainText("Genesis 2", { timeout: 5_000 });
	});

	test("prev arrow navigates to previous chapter", async ({ page }) => {
		await page.goto("/?book=gen&chapter=2");
		await waitForApp(page);
		const prevArrows = page.locator('.nav-arrow[data-chapter="1"]');
		await prevArrows.first().click();
		await expect(page.locator("#content")).toContainText("Genesis 1", { timeout: 5_000 });
	});

	test("nav arrows cross book boundaries", async ({ page }) => {
		// Genesis → last chapter → next should go to Exodus 1
		await page.goto("/?book=gen&chapter=50");
		await waitForApp(page);
		const nextArrow = page.locator('.nav-arrow[data-book="Exodus"]');
		await expect(nextArrow.first()).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Book index panel
// ---------------------------------------------------------------------------

test.describe("Book index panel", () => {
	test("opens and closes via button", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const overlay = page.locator("#index-overlay");

		// Open
		await page.click("#index-btn");
		await expect(overlay).toHaveClass(/open/);

		// Close by clicking overlay
		await overlay.click({ position: { x: 5, y: 5 } });
		await expect(overlay).not.toHaveClass(/open/);
	});

	test("opens with Ctrl+I", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.keyboard.press("Control+i");
		await expect(page.locator("#index-overlay")).toHaveClass(/open/);
	});

	test("shows book entries with OT and NT sections", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		const books = page.locator("#idx-books");
		await expect(books).toContainText("Genesis");
		await expect(books).toContainText("Matthew");
		await expect(books).toContainText("Revelation");
	});

	test("hovering a book shows its chapters", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		// Hover on "John" in the book list to reveal chapters
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().hover();
		// Chapters should appear
		const chapters = page.locator("#idx-chapters .idx-item");
		await expect(chapters.first()).toBeVisible({ timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Side panel (unified Stories / Settings / Info drawer)
// ---------------------------------------------------------------------------

/** Open the side panel and switch to a specific tab. */
async function openPanelTab(page: Page, tab: "stories" | "settings" | "info") {
	await page.click("#panel-btn");
	await expect(page.locator("#side-overlay")).toHaveClass(/open/);
	if (tab !== "stories") {
		// Stories is the default; only click the tab button for others
		await page.click(`.side-tab-btn[data-tab="${tab}"]`);
	}
	await expect(page.locator(`.side-pane[data-pane="${tab}"]`)).toHaveClass(/active/);
}

test.describe("Side panel", () => {
	test("opens via panel-btn and closes via side-close", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const overlay = page.locator("#side-overlay");

		await page.click("#panel-btn");
		await expect(overlay).toHaveClass(/open/);

		await page.click("#side-close");
		await expect(overlay).not.toHaveClass(/open/);
	});

	test("closes by clicking backdrop", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const overlay = page.locator("#side-overlay");

		await page.click("#panel-btn");
		await expect(overlay).toHaveClass(/open/);

		// Click the overlay itself (not the panel), near the left edge
		await overlay.click({ position: { x: 5, y: 300 } });
		await expect(overlay).not.toHaveClass(/open/);
	});

	test("closes with Escape", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);

		await page.click("#panel-btn");
		await expect(page.locator("#side-overlay")).toHaveClass(/open/);
		await page.keyboard.press("Escape");
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);
	});

	test("switching tabs shows the correct pane", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#panel-btn");

		// Default: stories pane is active
		await expect(page.locator('.side-pane[data-pane="stories"]')).toHaveClass(/active/);

		// Switch to settings
		await page.click('.side-tab-btn[data-tab="settings"]');
		await expect(page.locator('.side-pane[data-pane="settings"]')).toHaveClass(/active/);
		await expect(page.locator('.side-pane[data-pane="stories"]')).not.toHaveClass(/active/);

		// Switch to info
		await page.click('.side-tab-btn[data-tab="info"]');
		await expect(page.locator('.side-pane[data-pane="info"]')).toHaveClass(/active/);
		await expect(page.locator('.side-pane[data-pane="settings"]')).not.toHaveClass(/active/);
	});
});

// ---------------------------------------------------------------------------
// Settings pane
// ---------------------------------------------------------------------------

test.describe("Settings pane", () => {
	test("translation selector is populated", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		const options = page.locator("#translation-select option");
		const count = await options.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test("theme switching updates data-theme attribute", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		await page.click('#theme-segmented .seg-btn[data-value="dark"]');
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		await page.click('#theme-segmented .seg-btn[data-value="light"]');
		await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	});

	test("font size switching updates data-font-size attribute", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		await page.click('#fontsize-segmented .seg-btn[data-value="large"]');
		await expect(page.locator("html")).toHaveAttribute("data-font-size", "large");
	});
});

// ---------------------------------------------------------------------------
// Info pane
// ---------------------------------------------------------------------------

test.describe("Info pane", () => {
	test("opens info pane from panel", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "info");
		await expect(page.locator('.side-pane[data-pane="info"]')).toHaveClass(/active/);
	});

	test("contains help sections", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "info");
		const body = page.locator("#info-modal-body");
		await expect(body).toContainText("Search Input");
		await expect(body).toContainText("Keyboard Shortcuts");
		await expect(body).toContainText("Settings");
	});
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

test.describe("Keyboard shortcuts", () => {
	test("Ctrl+K focuses search input", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		// Click somewhere else first
		await page.click("#content");
		await page.keyboard.press("Control+k");
		const focused = await page.evaluate(() => document.activeElement?.id);
		expect(focused).toBe("search-input");
	});

	test("Ctrl+B opens side panel", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const overlay = page.locator("#side-overlay");
		await expect(overlay).not.toHaveClass(/open/);
		await page.keyboard.press("Control+b");
		await expect(overlay).toHaveClass(/open/);
	});

	test("Ctrl+B closes side panel when open", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const overlay = page.locator("#side-overlay");
		await page.keyboard.press("Control+b");
		await expect(overlay).toHaveClass(/open/);
		await page.keyboard.press("Control+b");
		await expect(overlay).not.toHaveClass(/open/);
	});

	test("Escape closes book index", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await expect(page.locator("#index-overlay")).toHaveClass(/open/);
		await page.keyboard.press("Escape");
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/);
	});
});

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

test.describe("URL state", () => {
	test("navigation updates URL with book code", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.fill("#search-input", "John 3");
		// Wait for navigation to complete
		await expect(page.locator("#content")).toContainText("John 3", { timeout: 5_000 });
		// URL should contain book=jhn and chapter=3
		const url = page.url();
		expect(url).toContain("book=jhn");
		expect(url).toContain("chapter=3");
	});

	test("browser back restores previous state", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1");
		await waitForApp(page);
		// Navigate to chapter 2 via nav arrow (pushes history entry)
		const nextArrow = page.locator('.nav-arrow[data-chapter="2"]');
		await nextArrow.first().click();
		await expect(page.locator("#content")).toContainText("Genesis 2", { timeout: 5_000 });
		// Go back
		await page.goBack();
		await expect(page.locator("#content")).toContainText("Genesis 1", { timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Translation switching
// ---------------------------------------------------------------------------

test.describe("Translation switching", () => {
	test("switching translation reloads content", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		await page.selectOption("#translation-select", "KJV");
		// Close panel and wait for KJV-specific text
		await page.click("#side-close");
		await expect(page.locator("#content")).toContainText(
			"In the beginning God created the heaven and the earth",
			{ timeout: 10_000 },
		);
	});
});

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

test.describe("Toast notifications", () => {
	test("toast appears when copying a verse", async ({ page }) => {
		// Grant clipboard permissions
		await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/?book=jhn&chapter=3&verse=16");
		await waitForApp(page);

		// Click the copy button (clipboard icon in heading)
		const copyBtn = page.locator(".copy-btn").first();
		if (await copyBtn.isVisible()) {
			await copyBtn.click();
			await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });
		}
	});
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

test.describe("Footer", () => {
	test("footer is rendered", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const footer = page.locator("#footer");
		await expect(footer).toContainText("public domain");
	});
});

// ---------------------------------------------------------------------------
// More Content pages
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parallel translation views
// ---------------------------------------------------------------------------

test.describe("Parallel translation views", () => {
	test("parallel chapter shows two-column layout", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		const container = page.locator(".parallel-container");
		await expect(container).toBeVisible({ timeout: 10_000 });
		const columns = container.locator(".parallel-col");
		await expect(columns).toHaveCount(2);
	});

	test("columns show different translation labels", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		const labels = page.locator(".parallel-translation-label");
		const labelTexts = await labels.allTextContents();
		// Primary (NHEB) and secondary (KJV) labels
		expect(labelTexts.length).toBe(2);
		expect(labelTexts).not.toEqual([labelTexts[0], labelTexts[0]]);
	});

	test("columns contain different verse text", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		const columns = page.locator(".parallel-col");
		const primary = await columns.nth(0).textContent();
		const secondary = await columns.nth(1).textContent();
		// Both should have Genesis content but differ in wording
		expect(primary).toContain("In the beginning");
		expect(secondary).toContain("In the beginning");
		expect(primary).not.toEqual(secondary);
	});

	test("parallel single verse shows two columns", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3&verse=16&p=KJV");
		await waitForApp(page);
		const container = page.locator(".parallel-container");
		await expect(container).toBeVisible({ timeout: 10_000 });
		const columns = container.locator(".parallel-col");
		await expect(columns).toHaveCount(2);
		// Both columns should contain the verse text
		await expect(columns.nth(0)).toContainText("God so loved");
		await expect(columns.nth(1)).toContainText("God so loved");
	});

	test("copy-both button is visible in parallel mode", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		const copyBoth = page.locator('.copy-btn[data-copy-source="both"]');
		await expect(copyBoth).toBeVisible();
	});

	test("each column has its own copy button", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		const primaryCopy = page.locator('.copy-btn[data-copy-source="primary"]');
		const secondaryCopy = page.locator('.copy-btn[data-copy-source="secondary"]');
		await expect(primaryCopy.first()).toBeVisible();
		await expect(secondaryCopy.first()).toBeVisible();
	});

	test("enabling parallel via settings select", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1");
		await waitForApp(page);
		// No parallel container initially
		await expect(page.locator(".parallel-container")).toHaveCount(0);
		// Enable parallel via settings
		await openPanelTab(page, "settings");
		await page.selectOption("#parallel-select", "KJV");
		await page.click("#side-close");
		// Parallel container should now appear
		await expect(page.locator(".parallel-container")).toBeVisible({ timeout: 10_000 });
	});

	test("disabling parallel returns to single column", async ({ page }) => {
		await page.goto("/?book=gen&chapter=1&p=KJV");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		// Disable parallel via settings
		await openPanelTab(page, "settings");
		await page.selectOption("#parallel-select", "");
		await page.click("#side-close");
		// Parallel container should disappear
		await expect(page.locator(".parallel-container")).toHaveCount(0, { timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Bible Stories pane
// ---------------------------------------------------------------------------

test.describe("Bible Stories pane", () => {
	test("stories pane is the default tab when opening panel", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		// Clear localStorage so we always start on stories tab
		await page.evaluate(() => localStorage.removeItem("side-panel-tab"));
		await page.click("#panel-btn");
		await expect(page.locator("#side-overlay")).toHaveClass(/open/);
		await expect(page.locator('.side-pane[data-pane="stories"]')).toHaveClass(/active/);
	});

	test("stories list is populated with story items", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		// Wait for async data load and render
		await page.waitForSelector(".story-item", { timeout: 10_000 });
		const items = page.locator(".story-item");
		expect(await items.count()).toBeGreaterThan(0);
	});

	test("stories shows category labels (Old Testament, New Testament)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".stories-category-label", { timeout: 10_000 });
		const labels = page.locator(".stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((t) => t.includes("Old Testament"))).toBe(true);
		expect(texts.some((t) => t.includes("New Testament"))).toBe(true);
	});

	test("filter narrows story results", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });

		const totalBefore = await page.locator(".story-item").count();

		// Filter to a specific story
		await page.fill("#stories-filter", "Noah");
		await page.waitForTimeout(100);
		const totalAfter = await page.locator(".story-item").count();
		expect(totalAfter).toBeLessThan(totalBefore);
		// The Noah story should be visible
		await expect(page.locator(".story-item").first()).toContainText("Noah");
	});

	test("empty filter shows no-results message", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });

		await page.fill("#stories-filter", "xyznonexistent999");
		await page.waitForTimeout(100);
		await expect(page.locator(".stories-empty")).toBeVisible();
		await expect(page.locator(".story-item")).toHaveCount(0);
	});

	test("clicking a story closes the panel and navigates", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });

		// Click the first story item (should be "The Creation" → Genesis 1-2)
		const firstItem = page.locator(".story-item").first();
		const ref = await firstItem.locator(".story-item-ref").textContent();
		await firstItem.click();

		// Panel should close
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);

		// Content should show the referenced passage
		await expect(page.locator("#content")).not.toHaveClass("loading", { timeout: 10_000 });
		await expect(page.locator("#search-input")).not.toHaveValue("", { timeout: 5_000 });
		expect(ref).toBeTruthy();
	});

	test("story items show title, description, and reference", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });

		const firstItem = page.locator(".story-item").first();
		await expect(firstItem.locator(".story-item-title")).toBeVisible();
		await expect(firstItem.locator(".story-item-desc")).toBeVisible();
		await expect(firstItem.locator(".story-item-ref")).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// More Content pages
// ---------------------------------------------------------------------------

test.describe("More Content pages", () => {
	test("more index page loads", async ({ page }) => {
		await page.goto("/more/index.html");
		await expect(page.locator("body")).toContainText("More Content");
	});

	test("philosophy page loads", async ({ page }) => {
		await page.goto("/more/philosophy.html");
		await expect(page.locator("h1")).toContainText("Philosophy");
	});
});
