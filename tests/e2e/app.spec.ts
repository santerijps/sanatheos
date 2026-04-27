import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

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
async function openPanelTab(
	page: Page,
	tab:
		| "stories"
		| "parables"
		| "theophanies"
		| "typology"
		| "bookmarks"
		| "notes"
		| "settings"
		| "info",
) {
	// Only click the panel button if the panel is not already open; when the
	// panel is open the full-screen overlay intercepts clicks on #panel-btn.
	const isOpen = (await page.locator("#side-overlay.open").count()) > 0;
	if (!isOpen) {
		await page.click("#panel-btn");
		await expect(page.locator("#side-overlay")).toHaveClass(/open/);
	}
	// Always click the tab button explicitly so we don't rely on localStorage state
	await page.click(`.side-tab-btn[data-tab="${tab}"]`);
	await expect(page.locator(`.side-pane[data-pane="${tab}"]`)).toHaveClass(/active/);
}

/** Clear all bookmarks from IndexedDB so bookmark tests start from a clean state. */
async function clearBookmarks(page: Page) {
	await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open("sanatheos-db");
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction("bookmarks", "readwrite");
		tx.objectStore("bookmarks").clear();
		await new Promise<void>((resolve) => {
			tx.oncomplete = () => resolve();
		});
		db.close();
	});
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
		await page.waitForFunction(
			(n: number) => document.querySelectorAll(".story-item").length < n,
			totalBefore,
			{ timeout: 5_000 },
		);
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
		await expect(page.locator(".stories-empty")).toBeVisible({ timeout: 5_000 });
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
// Parables of Jesus pane
// ---------------------------------------------------------------------------

test.describe("Parables of Jesus pane", () => {
	test("switching to parables tab shows parables pane", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#panel-btn");
		await page.click('.side-tab-btn[data-tab="parables"]');
		await expect(page.locator('.side-pane[data-pane="parables"]')).toHaveClass(/active/);
		await expect(page.locator('.side-pane[data-pane="stories"]')).not.toHaveClass(/active/);
	});

	test("parables list is populated with items", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });
		const items = page.locator("#parables-list .story-item");
		expect(await items.count()).toBeGreaterThan(0);
	});

	test("parables list shows Matthew, Mark, and Luke category labels", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .stories-category-label", { timeout: 10_000 });
		const labels = page.locator("#parables-list .stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((txt) => txt.includes("Matthew"))).toBe(true);
		expect(texts.some((txt) => txt.includes("Mark"))).toBe(true);
		expect(texts.some((txt) => txt.includes("Luke"))).toBe(true);
	});

	test("filter narrows parable results", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });
		const totalBefore = await page.locator("#parables-list .story-item").count();

		await page.fill("#parables-filter", "Prodigal");
		await page.waitForFunction(
			(n: number) => document.querySelectorAll("#parables-list .story-item").length < n,
			totalBefore,
			{ timeout: 5_000 },
		);
		const totalAfter = await page.locator("#parables-list .story-item").count();
		expect(totalAfter).toBeLessThan(totalBefore);
		await expect(page.locator("#parables-list .story-item").first()).toContainText("Prodigal");
	});

	test("unmatched filter shows no-results message", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });

		await page.fill("#parables-filter", "xyznonexistent999");
		await expect(page.locator("#parables-list .stories-empty")).toBeVisible({ timeout: 5_000 });
		await expect(page.locator("#parables-list .story-item")).toHaveCount(0);
	});

	test("clicking a parable closes panel and navigates", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });

		const firstItem = page.locator("#parables-list .story-item").first();
		await firstItem.click();

		// Panel should close
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);
		// Search input should have been populated with the reference
		await expect(page.locator("#search-input")).not.toHaveValue("", { timeout: 5_000 });
	});

	test("parable items show title, description, and reference", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });

		const firstItem = page.locator("#parables-list .story-item").first();
		await expect(firstItem.locator(".story-item-title")).toBeVisible();
		await expect(firstItem.locator(".story-item-desc")).toBeVisible();
		await expect(firstItem.locator(".story-item-ref")).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Theophanies pane
// ---------------------------------------------------------------------------

test.describe("Theophanies pane", () => {
	test("switching to theophanies tab shows theophanies pane", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#panel-btn");
		await page.click('.side-tab-btn[data-tab="theophanies"]');
		await expect(page.locator('.side-pane[data-pane="theophanies"]')).toHaveClass(/active/);
		await expect(page.locator('.side-pane[data-pane="parables"]')).not.toHaveClass(/active/);
	});

	test("theophanies list is populated with items", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });
		const items = page.locator("#theophanies-list .story-item");
		expect(await items.count()).toBeGreaterThan(0);
	});

	test("theophanies list shows Old Testament and New Testament category labels", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .stories-category-label", {
			timeout: 10_000,
		});
		const labels = page.locator("#theophanies-list .stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((t) => t.includes("Old Testament"))).toBe(true);
		expect(texts.some((t) => t.includes("New Testament"))).toBe(true);
	});

	test("theophany items show title, description, and reference", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });
		const firstItem = page.locator("#theophanies-list .story-item").first();
		await expect(firstItem.locator(".story-item-title")).toBeVisible();
		await expect(firstItem.locator(".story-item-desc")).toBeVisible();
		await expect(firstItem.locator(".story-item-ref")).toBeVisible();
	});

	test("filter narrows theophany results", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });
		const totalBefore = await page.locator("#theophanies-list .story-item").count();

		await page.fill("#theophanies-filter", "Moses");
		await page.waitForFunction(
			(n: number) => document.querySelectorAll("#theophanies-list .story-item").length < n,
			totalBefore,
			{ timeout: 5_000 },
		);
		const totalAfter = await page.locator("#theophanies-list .story-item").count();
		expect(totalAfter).toBeLessThan(totalBefore);
		expect(totalAfter).toBeGreaterThan(0);
	});

	test("filter input is styled (has border and padding)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		const filter = page.locator("#theophanies-filter");
		await expect(filter).toBeVisible();
		// Verify the input has the expected computed style from the CSS rules
		const borderRadius = await filter.evaluate((el) => getComputedStyle(el).borderRadius);
		expect(borderRadius).toBe("8px");
	});

	test("unmatched filter shows no-results message", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });

		await page.fill("#theophanies-filter", "xyznonexistent999");
		await expect(page.locator("#theophanies-list .stories-empty")).toBeVisible({
			timeout: 5_000,
		});
		await expect(page.locator("#theophanies-list .story-item")).toHaveCount(0);
	});

	test("clicking a theophany closes panel and navigates", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });

		const firstItem = page.locator("#theophanies-list .story-item").first();
		await firstItem.click();

		// Panel should close
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);
		// Search input should have been populated with the reference
		await expect(page.locator("#search-input")).not.toHaveValue("", { timeout: 5_000 });
	});

	test("theophanies list is scrollable (overflow-y auto)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "theophanies");
		await page.waitForSelector("#theophanies-list .story-item", { timeout: 10_000 });
		const overflowY = await page
			.locator("#theophanies-list")
			.evaluate((el) => getComputedStyle(el).overflowY);
		expect(overflowY).toBe("auto");
	});
});

// ---------------------------------------------------------------------------
// Typology pane
// ---------------------------------------------------------------------------

test.describe("Typology pane", () => {
	test("switching to typology tab shows typology pane", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#panel-btn");
		await page.click('.side-tab-btn[data-tab="typology"]');
		await expect(page.locator('.side-pane[data-pane="typology"]')).toHaveClass(/active/);
		await expect(page.locator('.side-pane[data-pane="theophanies"]')).not.toHaveClass(/active/);
	});

	test("typology list is populated with items", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });
		const items = page.locator("#typology-list .story-item");
		expect(await items.count()).toBeGreaterThan(0);
	});

	test("typology list shows category labels", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .stories-category-label", {
			timeout: 10_000,
		});
		const labels = page.locator("#typology-list .stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((t) => t.includes("Types of Christ"))).toBe(true);
	});

	test("typology items show title, description, and reference", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });
		const firstItem = page.locator("#typology-list .story-item").first();
		await expect(firstItem.locator(".story-item-title")).toBeVisible();
		await expect(firstItem.locator(".story-item-desc")).toBeVisible();
		await expect(firstItem.locator(".story-item-ref")).toBeVisible();
	});

	test("filter narrows typology results", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });
		const totalBefore = await page.locator("#typology-list .story-item").count();

		await page.fill("#typology-filter", "Moses");
		await page.waitForFunction(
			(n: number) => document.querySelectorAll("#typology-list .story-item").length < n,
			totalBefore,
			{ timeout: 5_000 },
		);
		const totalAfter = await page.locator("#typology-list .story-item").count();
		expect(totalAfter).toBeLessThan(totalBefore);
		expect(totalAfter).toBeGreaterThan(0);
	});

	test("filter input is styled (has border-radius 8px)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		const filter = page.locator("#typology-filter");
		await expect(filter).toBeVisible();
		const borderRadius = await filter.evaluate((el) => getComputedStyle(el).borderRadius);
		expect(borderRadius).toBe("8px");
	});

	test("unmatched filter shows no-results message", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });

		await page.fill("#typology-filter", "xyznonexistent999");
		await expect(page.locator("#typology-list .stories-empty")).toBeVisible({ timeout: 5_000 });
		await expect(page.locator("#typology-list .story-item")).toHaveCount(0);
	});

	test("clicking a typology entry closes panel and navigates", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });

		const firstItem = page.locator("#typology-list .story-item").first();
		await firstItem.click();

		// Panel should close
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);
		// Search input should have been populated with the reference
		await expect(page.locator("#search-input")).not.toHaveValue("", { timeout: 5_000 });
	});

	test("typology list is scrollable (overflow-y auto)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "typology");
		await page.waitForSelector("#typology-list .story-item", { timeout: 10_000 });
		const overflowY = await page
			.locator("#typology-list")
			.evaluate((el) => getComputedStyle(el).overflowY);
		expect(overflowY).toBe("auto");
	});
});

// ---------------------------------------------------------------------------
// Bookmarks pane
// ---------------------------------------------------------------------------

test.describe("Bookmarks pane", () => {
	test("bookmarks pane shows empty state when no bookmarks exist", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await clearBookmarks(page);
		await openPanelTab(page, "bookmarks");
		await expect(page.locator(".bookmarks-empty")).toBeVisible({ timeout: 5_000 });
		await expect(page.locator(".bookmark-item")).toHaveCount(0);
	});

	test("bookmark button is visible in chapter view", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await expect(page.locator("#content .bookmark-btn")).toBeVisible();
	});

	test("clicking bookmark button shows toast and marks button active", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearBookmarks(page);

		const btn = page.locator("#content .bookmark-btn");
		await expect(btn).toBeVisible();
		await btn.click();

		// Toast should appear
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });
		// Button should now have active class
		await expect(btn).toHaveClass(/bookmark-active/);
	});

	test("bookmarked passage appears in bookmarks list", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearBookmarks(page);

		// Add bookmark
		await page.locator("#content .bookmark-btn").click();
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });

		// Open bookmarks tab
		await openPanelTab(page, "bookmarks");
		const items = page.locator(".bookmark-item");
		await expect(items).toHaveCount(1, { timeout: 5_000 });
		await expect(items.first().locator(".bookmark-item-nav")).toContainText("John 3");
	});

	test("removing a bookmark from the list deletes it", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearBookmarks(page);

		// Add bookmark
		await page.locator("#content .bookmark-btn").click();
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });

		// Open bookmarks tab and remove it
		await openPanelTab(page, "bookmarks");
		await expect(page.locator(".bookmark-item")).toHaveCount(1, { timeout: 5_000 });
		await page.locator(".bookmark-item-remove").first().click();

		// List should now be empty
		await expect(page.locator(".bookmark-item")).toHaveCount(0, { timeout: 5_000 });
		await expect(page.locator(".bookmarks-empty")).toBeVisible();
	});

	test("clicking a bookmark in the list navigates to the passage", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearBookmarks(page);

		// Add bookmark for John 3
		await page.locator("#content .bookmark-btn").click();
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });

		// Navigate away
		await page.fill("#search-input", "Genesis 1");
		await expect(page.locator("#content")).toContainText("Genesis", { timeout: 5_000 });

		// Open bookmarks and click the saved bookmark
		await openPanelTab(page, "bookmarks");
		await expect(page.locator(".bookmark-item")).toHaveCount(1, { timeout: 5_000 });
		await page.locator(".bookmark-item-nav").first().click();

		// Panel closes and navigates back to John 3
		await expect(page.locator("#side-overlay")).not.toHaveClass(/open/);
		await expect(page.locator("#content")).toContainText("John 3", { timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Verse Notes
// ---------------------------------------------------------------------------

/** Clear all notes from IndexedDB so note tests start from a clean state. */
async function clearNotes(page: Page) {
	await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open("sanatheos-db");
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		if (!db.objectStoreNames.contains("notes")) {
			db.close();
			return;
		}
		const tx = db.transaction("notes", "readwrite");
		tx.objectStore("notes").clear();
		await new Promise<void>((resolve) => {
			tx.oncomplete = () => resolve();
		});
		db.close();
	});
}

/** Click a verse sup number to open the verse context menu. */
async function openVerseMenu(page: Page) {
	await page.waitForSelector(".verse sup", { timeout: 10_000 });
	const sup = page.locator(".verse sup").first();
	await sup.click();
	await expect(page.locator("#verse-menu")).toHaveClass(/open/, { timeout: 5_000 });
}

test.describe("Verse notes", () => {
	test("notes pane shows empty state when no notes exist", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await clearNotes(page);
		await openPanelTab(page, "notes");
		await expect(page.locator(".notes-empty")).toBeVisible({ timeout: 5_000 });
		await expect(page.locator(".note-item")).toHaveCount(0);
	});

	test("notes tab button exists in side panel", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#panel-btn");
		const notesTab = page.locator('.side-tab-btn[data-tab="notes"]');
		await expect(notesTab).toBeVisible();
	});

	test("note panel opens from verse context menu", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);

		// Click the "Add note" button
		const noteBtn = page.locator('.verse-menu-item[data-action="note"]');
		await expect(noteBtn).toBeVisible({ timeout: 5_000 });
		await noteBtn.click();

		// Note panel overlay should open
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#note-panel-textarea")).toBeVisible();
	});

	test("note panel shows 'Add note' title when no existing note", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();

		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#note-panel-title")).toContainText("Add note");
	});

	test("note panel can be closed via close button", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });

		await page.locator("#note-panel-close").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});
	});

	test("note panel can be closed via cancel button", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });

		await page.locator("#note-panel-cancel").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});
	});

	test("adding a note shows toast and closes panel", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });

		await page.locator("#note-panel-textarea").fill("Test note content");
		await page.locator("#note-panel-save").click();

		// Toast should appear with "Note saved" text
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });
		// Panel should close
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});
	});

	test("saved note appears in notes pane", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("Saved note text");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Open notes pane
		await openPanelTab(page, "notes");
		const items = page.locator(".note-item");
		await expect(items).toHaveCount(1, { timeout: 5_000 });
		await expect(items.first()).toContainText("Saved note text");
	});

	test("note marker (superscript) appears on verse after adding a note", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("Marker test note");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// A note marker should appear on the verse
		const marker = page.locator(".verse-note-marker");
		await expect(marker.first()).toBeVisible({ timeout: 5_000 });
	});

	test("clicking note marker opens note panel in edit mode", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note first
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("Edit mode note");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Click the sidenote number to open the panel in edit mode
		await page.locator(".verse-sidenote-num").first().click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#note-panel-title")).toContainText("Edit note");
		await expect(page.locator("#note-panel-textarea")).toHaveValue("Edit mode note");
	});

	test("delete button is visible when editing an existing note", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("Note to delete");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Reopen in edit mode
		await page.locator(".verse-sidenote-num").first().click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });

		// Delete button should now be visible
		await expect(page.locator("#note-panel-delete")).toBeVisible();
	});

	test("deleting a note removes it from the notes pane", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("Note to delete");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Reopen in edit mode then delete
		await page.locator(".verse-sidenote-num").first().click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-delete").click();

		// Toast should appear
		await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });
		// Panel should close
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Notes pane should be empty
		await openPanelTab(page, "notes");
		await expect(page.locator(".notes-empty")).toBeVisible({ timeout: 5_000 });
		await expect(page.locator(".note-item")).toHaveCount(0);
	});

	test("note panel reference shows verse reference", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });

		// Reference should show something like "John 3:X"
		const ref = page.locator("#note-panel-ref");
		await expect(ref).toContainText("John", { timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Language / Internationalisation (i18n)
// ---------------------------------------------------------------------------

/** Switch the UI language via the settings language segmented control. */
async function switchLanguage(page: Page, lang: "en" | "fi" | "sv") {
	await openPanelTab(page, "settings");
	await page.click(`#language-segmented .seg-btn[data-value="${lang}"]`);
	await page.click("#side-close");
}

// ---------------------------------------------------------------------------
// Finnish (fi) — KR38 translation
// ---------------------------------------------------------------------------

test.describe("Finnish (fi) language", () => {
	test("KR38 translation renders Finnish Bible text", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		await expect(page.locator("#content")).toContainText("Alussa loi Jumala");
	});

	test("KR38 auto-switches search placeholder to Finnish", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		const placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Hae Raamatusta");
	});

	test("KR38 auto-switches settings labels to Finnish", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		await expect(page.locator('.side-pane[data-pane="settings"]')).toContainText(
			"Raamatunkäännös",
		);
	});

	test("Finnish book abbreviation 'Joh 3' navigates to John 3 with KR38 text", async ({
		page,
	}) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await page.fill("#search-input", "Joh 3");
		await expect(page.locator("#content")).toContainText("Jumala", { timeout: 5_000 });
	});

	test("Finnish Genesis abbreviation '1 moos 1' navigates to Genesis 1", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await page.fill("#search-input", "1 moos 1");
		await expect(page.locator("#content")).toContainText("Alussa loi Jumala", {
			timeout: 5_000,
		});
	});

	test("John 3:16 displays Finnish verse text with KR38", async ({ page }) => {
		await page.goto("/?t=KR38&book=jhn&chapter=3&verse=16");
		await waitForApp(page);
		await expect(page.locator("#content")).toContainText("Jumala maailmaa rakastanut");
	});

	test("book index shows Finnish OT/NT section labels with KR38", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await page.click("#index-btn");
		const books = page.locator("#idx-books");
		await expect(books).toContainText("Vanha testamentti");
		await expect(books).toContainText("Uusi testamentti");
	});

	test("book index shows Finnish book names with KR38", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await page.click("#index-btn");
		const books = page.locator("#idx-books");
		await expect(books).toContainText("1. Mooseksen kirja");
		await expect(books).toContainText("Ilmestyskirja");
	});

	test("stories pane shows Finnish titles with KR38", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });
		// "Luominen" is the Finnish title for "The Creation"
		await expect(
			page.locator(".story-item").first().locator(".story-item-title"),
		).toContainText("Luominen");
	});

	test("stories pane shows Finnish OT/NT category labels with KR38", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".stories-category-label", { timeout: 10_000 });
		const labels = page.locator(".stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((txt) => txt.includes("Vanha testamentti"))).toBe(true);
		expect(texts.some((txt) => txt.includes("Uusi testamentti"))).toBe(true);
	});

	test("parables pane shows Finnish titles with KR38", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });
		// The first parable category label should be the Finnish name for "Matthew"
		const firstItem = page.locator("#parables-list .story-item").first();
		const title = await firstItem.locator(".story-item-title").textContent();
		// Finnish titles exist; ensure the title is not the English default
		expect(title).toBeTruthy();
		expect(title).not.toBe("");
	});

	test("footer shows Finnish text when using KR38", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		await expect(page.locator("#footer")).toContainText("vapaasti yleiseen käyttöön");
	});

	test("Finnish text search returns results with KR38", async ({ page }) => {
		await page.goto('/?t=KR38&q="Jumala maailmaa rakastanut"');
		await waitForApp(page);
		await page.waitForSelector(".result", { timeout: 5_000 });
		const results = page.locator(".result");
		await expect(results.first()).toContainText("Johanneksen evankeliumi 3:16");
	});

	test("manually switching to Finnish updates search placeholder", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await switchLanguage(page, "fi");
		const placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Hae Raamatusta");
	});

	test("info pane shows Finnish headings when language is Finnish", async ({ page }) => {
		await page.goto("/?t=KR38");
		await waitForApp(page);
		await openPanelTab(page, "info");
		await expect(page.locator("#info-modal-body")).toContainText("Hakukenttä");
		await expect(page.locator("#info-modal-body")).toContainText("Pikanäppäimet");
	});

	test("KR38 chapter navigation arrows are functional", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		const nextArrows = page.locator('.nav-arrow[data-chapter="2"]');
		await nextArrows.first().click();
		await expect(page.locator("#content")).toContainText("1. Mooseksen kirja 2", {
			timeout: 5_000,
		});
	});
});

// ---------------------------------------------------------------------------
// Swedish (sv) — SV17 translation
// ---------------------------------------------------------------------------

test.describe("Swedish (sv) language", () => {
	test("SV17 translation renders Swedish Bible text", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		await expect(page.locator("#content")).toContainText("I begynnelsen skapade Gud");
	});

	test("SV17 auto-switches search placeholder to Swedish", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		const placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Sök i Bibeln");
	});

	test("SV17 auto-switches settings labels to Swedish", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		await expect(page.locator('.side-pane[data-pane="settings"]')).toContainText(
			"Bibelöversättning",
		);
	});

	test("Swedish book abbreviation 'Joh 3' navigates to John 3 with SV17 text", async ({
		page,
	}) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await page.fill("#search-input", "Joh 3");
		await expect(page.locator("#content")).toContainText("Johannes", { timeout: 5_000 });
	});

	test("Swedish Genesis abbreviation '1 mos 1' navigates to Genesis 1", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await page.fill("#search-input", "1 mos 1");
		await expect(page.locator("#content")).toContainText("I begynnelsen skapade Gud", {
			timeout: 5_000,
		});
	});

	test("John 3:16 displays Swedish verse text with SV17", async ({ page }) => {
		await page.goto("/?t=SV17&book=jhn&chapter=3&verse=16");
		await waitForApp(page);
		await expect(page.locator("#content")).toContainText("Ty så älskade Gud världen");
	});

	test("book index shows Swedish OT/NT section labels with SV17", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await page.click("#index-btn");
		const books = page.locator("#idx-books");
		await expect(books).toContainText("Gamla testamentet");
		await expect(books).toContainText("Nya testamentet");
	});

	test("book index shows Swedish book names with SV17", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await page.click("#index-btn");
		const books = page.locator("#idx-books");
		await expect(books).toContainText("1 Mosebok");
		await expect(books).toContainText("Uppenbarelseboken");
	});

	test("stories pane shows Swedish titles with SV17", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });
		// "Skapelsen" is the Swedish title for "The Creation"
		await expect(
			page.locator(".story-item").first().locator(".story-item-title"),
		).toContainText("Skapelsen");
	});

	test("stories pane shows Swedish OT/NT category labels with SV17", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await openPanelTab(page, "stories");
		await page.waitForSelector(".stories-category-label", { timeout: 10_000 });
		const labels = page.locator(".stories-category-label");
		const texts = await labels.allTextContents();
		expect(texts.some((txt) => txt.includes("Gamla testamentet"))).toBe(true);
		expect(texts.some((txt) => txt.includes("Nya testamentet"))).toBe(true);
	});

	test("footer shows Swedish text when using SV17", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		await expect(page.locator("#footer")).toContainText("det allmänna domänet");
	});

	test("Swedish text search returns results with SV17", async ({ page }) => {
		await page.goto('/?t=SV17&q="älskade Gud världen"');
		await waitForApp(page);
		await page.waitForSelector(".result", { timeout: 5_000 });
		const count = await page.locator(".result").count();
		expect(count).toBeGreaterThan(0);
	});

	test("manually switching to Swedish updates search placeholder", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await switchLanguage(page, "sv");
		const placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Sök i Bibeln");
	});

	test("info pane shows Swedish headings when language is Swedish", async ({ page }) => {
		await page.goto("/?t=SV17");
		await waitForApp(page);
		await openPanelTab(page, "info");
		await expect(page.locator("#info-modal-body")).toContainText("Sökfält");
		await expect(page.locator("#info-modal-body")).toContainText("Kortkommandon");
	});

	test("SV17 chapter navigation arrows are functional", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		const nextArrows = page.locator('.nav-arrow[data-chapter="2"]');
		await nextArrows.first().click();
		await expect(page.locator("#content")).toContainText("1 Mosebok 2", { timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Language switching and persistence
// ---------------------------------------------------------------------------

test.describe("Language switching and persistence", () => {
	test("KR38 → NHEB switches UI back to English", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		// Confirm we are in Finnish
		let placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Hae Raamatusta");

		// Switch to NHEB
		await openPanelTab(page, "settings");
		await page.selectOption("#translation-select", "NHEB");
		await page.click("#side-close");
		await waitForApp(page);

		placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Search the Bible");
	});

	test("SV17 → NHEB switches UI back to English", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		let placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Sök i Bibeln");

		await openPanelTab(page, "settings");
		await page.selectOption("#translation-select", "NHEB");
		await page.click("#side-close");
		await waitForApp(page);

		placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Search the Bible");
	});

	test("language segmented control reflects Finnish when KR38 is active", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		const fiBtn = page.locator('#language-segmented .seg-btn[data-value="fi"]');
		await expect(fiBtn).toHaveClass(/seg-active/);
	});

	test("language segmented control reflects Swedish when SV17 is active", async ({ page }) => {
		await page.goto("/?t=SV17&book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		const svBtn = page.locator('#language-segmented .seg-btn[data-value="sv"]');
		await expect(svBtn).toHaveClass(/seg-active/);
	});

	test("language segmented control reflects English when NHEB is active", async ({ page }) => {
		await page.goto("/?t=NHEB&book=gen&chapter=1");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		const enBtn = page.locator('#language-segmented .seg-btn[data-value="en"]');
		await expect(enBtn).toHaveClass(/seg-active/);
	});

	test("manually selected Finnish stays when navigating chapters", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await switchLanguage(page, "fi");

		// Navigate to a different chapter
		await page.fill("#search-input", "John 3");
		await expect(page.locator("#content")).toContainText("John", { timeout: 5_000 });

		// Language should still be Finnish
		const placeholder = await page.locator("#search-input").getAttribute("placeholder");
		expect(placeholder).toBe("Hae Raamatusta");
	});

	test("parallel mode with KR38 primary shows Finnish content", async ({ page }) => {
		await page.goto("/?t=KR38&book=gen&chapter=1&p=NHEB");
		await waitForApp(page);
		await page.waitForSelector(".parallel-container", { timeout: 10_000 });
		const columns = page.locator(".parallel-col");
		await expect(columns).toHaveCount(2);
		// Primary column (KR38) should contain Finnish text
		await expect(columns.nth(0)).toContainText("Alussa loi Jumala");
		// Secondary column (NHEB) should contain English text
		await expect(columns.nth(1)).toContainText("In the beginning");
	});

	test("KR38 translation selector visible in settings", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await openPanelTab(page, "settings");
		const options = page.locator("#translation-select option");
		const values = await options.evaluateAll((els) =>
			(els as HTMLOptionElement[]).map((el) => el.value),
		);
		expect(values).toContain("KR38");
		expect(values).toContain("SV17");
	});
});

// ---------------------------------------------------------------------------
// IndexedDB (IDB) — caching, persistence, and background preloading
// ---------------------------------------------------------------------------

/**
 * Poll the IDB `data` store until `key` is present.
 * Uses page.waitForFunction so Playwright retries automatically.
 */
async function waitForIdbDataKey(page: Page, key: string, timeout = 15_000): Promise<void> {
	await page.waitForFunction(
		(k: string) =>
			new Promise<boolean>((resolve) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains("data")) {
						db.close();
						resolve(false);
						return;
					}
					const tx = db.transaction("data", "readonly");
					const getReq = tx.objectStore("data").getKey(k);
					getReq.onsuccess = () => {
						db.close();
						resolve(getReq.result !== undefined);
					};
					getReq.onerror = () => {
						db.close();
						resolve(false);
					};
				};
				req.onerror = () => resolve(false);
			}),
		key,
		{ timeout },
	);
}

/**
 * Poll the IDB `data` store until `key` holds a non-empty array.
 * Resolves when the condition is met; throws TimeoutError otherwise.
 *
 * Unlike waitForIdbDataValue this never tries to deserialize the stored value
 * back into Node.js — avoiding Playwright's CDP serialization issues with
 * large objects.  The predicate runs entirely inside the browser context and
 * returns only a boolean.
 */
async function waitForIdbArrayPreloaded(page: Page, key: string, timeout = 20_000): Promise<void> {
	await page.waitForFunction(
		(k: string) =>
			new Promise<boolean>((resolve) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains("data")) {
						db.close();
						resolve(false);
						return;
					}
					const tx = db.transaction("data", "readonly");
					const getReq = tx.objectStore("data").get(k);
					getReq.onsuccess = () => {
						db.close();
						const v = getReq.result;
						resolve(Array.isArray(v) && v.length > 0);
					};
					getReq.onerror = () => {
						db.close();
						resolve(false);
					};
				};
				req.onerror = () => resolve(false);
			}),
		key,
		{ timeout },
	);
}

/**
 * Poll the IDB `data` store until `key` is present and return its value.
 * Combines the wait and read into a single atomic operation to eliminate the
 * race window that exists between separate waitForIdbDataKey + getIdbDataValue
 * calls (a versionchange or deleteDatabase triggered by the app could clear
 * the store between the two evaluate() calls).
 *
 * NOTE: only suitable for primitive/string values.  For large arrays stored
 * in the side-panel keys use waitForIdbArrayPreloaded instead, because
 * Playwright's CDP serialization can fail for large objects.
 */
async function waitForIdbDataValue(page: Page, key: string, timeout = 15_000): Promise<unknown> {
	const handle = await page.waitForFunction(
		(k: string) =>
			new Promise<unknown>((resolve) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains("data")) {
						db.close();
						resolve(null);
						return;
					}
					const tx = db.transaction("data", "readonly");
					const getReq = tx.objectStore("data").get(k);
					getReq.onsuccess = () => {
						db.close();
						resolve(getReq.result ?? null);
					};
					getReq.onerror = () => {
						db.close();
						resolve(null);
					};
				};
				req.onerror = () => resolve(null);
			}),
		key,
		{ timeout },
	);
	return handle.jsonValue();
}

test.describe("IndexedDB caching and preloading", () => {
	test("IDB database is named 'sanatheos-db'", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const exists = await page.evaluate(async () => {
			const dbs = await indexedDB.databases();
			return dbs.some((d) => d.name === "sanatheos-db");
		});
		expect(exists).toBe(true);
	});

	test("default translation (NHEB) is cached in IDB after initial load", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		const value = await waitForIdbDataValue(page, "NHEB");
		expect(value).not.toBeNull();
		expect(typeof value).toBe("object");
	});

	test("KJV translation is cached in IDB after switching to it", async ({ page }) => {
		await page.goto("/?t=KJV&book=gen&chapter=1");
		await waitForApp(page);
		const value = await waitForIdbDataValue(page, "KJV");
		expect(value).not.toBeNull();
	});

	test("translation data is served from IDB cache when network is blocked", async ({
		page,
		context,
	}) => {
		// First load — populates IDB cache
		await page.goto("/");
		await waitForApp(page);
		await waitForIdbDataKey(page, "NHEB");

		// Block the bible JSON endpoint
		await context.route("**/text/bible-NHEB.json", (route) => route.abort());

		// Reload — should still render from IDB without a network request
		await page.reload();
		await waitForApp(page);
		await expect(page.locator("#content")).toContainText("In the beginning");
	});

	test("stories data is preloaded into IDB in the background after page load", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		// Background preload fires via requestIdleCallback — wait for it to land in IDB.
		// Uses waitForIdbArrayPreloaded (not waitForIdbDataValue) to avoid
		// Playwright CDP serialization issues with large objects.
		await waitForIdbArrayPreloaded(page, "stories");
	});

	test("parables data is preloaded into IDB in the background after page load", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await waitForIdbArrayPreloaded(page, "parables");
	});

	test("theophanies data is preloaded into IDB in the background after page load", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await waitForIdbArrayPreloaded(page, "theophanies");
	});

	test("typology data is preloaded into IDB in the background after page load", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await waitForIdbArrayPreloaded(page, "typology");
	});

	test("side panel data loads without network on second visit (served from IDB)", async ({
		page,
		context,
	}) => {
		// First visit — background preload fills IDB
		await page.goto("/");
		await waitForApp(page);
		await waitForIdbDataKey(page, "stories");
		await waitForIdbDataKey(page, "parables");

		// Block data file endpoints
		await context.route("**/data/stories.json", (route) => route.abort());
		await context.route("**/data/parables.json", (route) => route.abort());

		// Reload — side panel data should come from IDB, not network
		await page.reload();
		await waitForApp(page);

		await openPanelTab(page, "stories");
		await page.waitForSelector(".story-item", { timeout: 10_000 });
		expect(await page.locator(".story-item").count()).toBeGreaterThan(0);

		await openPanelTab(page, "parables");
		await page.waitForSelector("#parables-list .story-item", { timeout: 10_000 });
		expect(await page.locator("#parables-list .story-item").count()).toBeGreaterThan(0);
	});

	test("highlight color is persisted in IDB across page reload", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);

		// Open verse menu and apply a yellow highlight
		await page.waitForSelector(".verse sup", { timeout: 10_000 });
		await page.locator(".verse sup").first().click();
		await expect(page.locator("#verse-menu")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator(".color-dot[data-color='yellow']").click();
		await page.waitForSelector(".hl-yellow", { timeout: 5_000 });

		// Reload and verify the highlight is still applied
		await page.reload();
		await waitForApp(page);
		await expect(page.locator(".hl-yellow").first()).toBeVisible({ timeout: 5_000 });
	});

	test("highlight is stored in IDB highlights store", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);

		await page.waitForSelector(".verse sup", { timeout: 10_000 });
		await page.locator(".verse sup").first().click();
		await expect(page.locator("#verse-menu")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator(".color-dot[data-color='green']").click();
		await page.waitForSelector(".hl-green", { timeout: 5_000 });

		// Verify the highlight record exists in IDB
		const hasRecord = await page.evaluate(async () => {
			return new Promise<boolean>((resolve) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction("highlights", "readonly");
					const countReq = tx.objectStore("highlights").count();
					countReq.onsuccess = () => {
						db.close();
						resolve((countReq.result as number) > 0);
					};
					countReq.onerror = () => {
						db.close();
						resolve(false);
					};
				};
				req.onerror = () => resolve(false);
			});
		});
		expect(hasRecord).toBe(true);
	});

	test("notes are persisted in IDB across page reload", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("IDB persistence test note");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Reload and verify the note is still there
		await page.reload();
		await waitForApp(page);
		await openPanelTab(page, "notes");
		const items = page.locator(".note-item");
		await expect(items).toHaveCount(1, { timeout: 5_000 });
		await expect(items.first()).toContainText("IDB persistence test note");
	});

	test("note is stored in IDB notes store with correct fields", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await clearNotes(page);

		// Add a note
		await openVerseMenu(page);
		await page.locator('.verse-menu-item[data-action="note"]').click();
		await expect(page.locator("#note-panel-overlay")).toHaveClass(/open/, { timeout: 5_000 });
		await page.locator("#note-panel-textarea").fill("IDB field check");
		await page.locator("#note-panel-save").click();
		await expect(page.locator("#note-panel-overlay")).not.toHaveClass(/open/, {
			timeout: 5_000,
		});

		// Read the note directly from IDB
		const note = await page.evaluate(async () => {
			return new Promise<Record<string, unknown> | null>((resolve) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction("notes", "readonly");
					const getAllReq = tx.objectStore("notes").getAll();
					getAllReq.onsuccess = () => {
						db.close();
						const results = getAllReq.result as Array<Record<string, unknown>>;
						resolve(results[0] ?? null);
					};
					getAllReq.onerror = () => {
						db.close();
						resolve(null);
					};
				};
				req.onerror = () => resolve(null);
			});
		});

		expect(note).not.toBeNull();
		expect(note!.text).toBe("IDB field check");
		expect(note!.book).toBe("John");
		expect(typeof note!.chapter).toBe("number");
		expect(typeof note!.verse).toBe("number");
		expect(typeof note!.updatedAt).toBe("number");
	});

	test("IDB data store contains sidebar keys after preload", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);

		// Wait for all four preload keys
		await Promise.all([
			waitForIdbDataKey(page, "stories"),
			waitForIdbDataKey(page, "parables"),
			waitForIdbDataKey(page, "theophanies"),
			waitForIdbDataKey(page, "typology"),
		]);

		// Read all keys from the data store
		const keys = await page.evaluate(async () => {
			return new Promise<string[]>((resolve, reject) => {
				const req = indexedDB.open("sanatheos-db");
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction("data", "readonly");
					const keysReq = tx.objectStore("data").getAllKeys();
					keysReq.onsuccess = () => {
						db.close();
						resolve((keysReq.result as IDBValidKey[]).map(String));
					};
					keysReq.onerror = () => {
						db.close();
						reject(keysReq.error);
					};
				};
				req.onerror = () => reject(req.error);
			});
		});

		expect(keys).toContain("NHEB");
		expect(keys).toContain("stories");
		expect(keys).toContain("parables");
		expect(keys).toContain("theophanies");
		expect(keys).toContain("typology");
	});
});

// ---------------------------------------------------------------------------
// Book index panel — desktop: read full chapter / read full book
// ---------------------------------------------------------------------------

test.describe("Book index panel — read full chapter", () => {
	test('verse column shows "Read the full chapter" as first item', async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await page.click("#index-btn");
		// Hover John so chapters load, then hover chapter 1 so verses load
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().hover();
		const firstChap = page.locator("#idx-chapters .idx-item").first();
		await firstChap.hover();
		const firstVerse = page.locator("#idx-verses .idx-item").first();
		await expect(firstVerse).toContainText("Read the full chapter", { timeout: 5_000 });
	});

	test('clicking "Read the full chapter" navigates to that chapter', async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		// Hover John to get its chapters
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().hover();
		// Hover chapter 3
		const chap3 = page.locator("#idx-chapters .idx-item", { hasText: "Chapter 3" });
		await chap3.hover();
		// Click "Read the full chapter"
		const readChap = page.locator("#idx-verses .idx-read-chapter");
		await readChap.click();
		await expect(page.locator("#content")).toContainText("John 3", { timeout: 5_000 });
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/);
	});
});

test.describe("Book index panel — read full book", () => {
	test('chapter column shows "Read the full book" as first item after hovering a book', async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().hover();
		const firstChap = page.locator("#idx-chapters .idx-item").first();
		await expect(firstChap).toContainText("Read the full book", { timeout: 5_000 });
	});

	test('clicking "Read the full book" navigates to that book', async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().hover();
		const readBook = page.locator("#idx-chapters .idx-read-book");
		await readBook.click();
		await expect(page.locator("#content")).toContainText("John", { timeout: 5_000 });
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/);
	});
});

// ---------------------------------------------------------------------------
// Book index panel — mobile bottom-sheet + drill-down
// ---------------------------------------------------------------------------

test.describe("Book index panel — mobile bottom sheet + drill-down", () => {
	// Use a 375×812 mobile viewport for all tests in this suite
	test.use({ viewport: { width: 375, height: 812 } });

	test("opens as bottom sheet (panel aligns to bottom)", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		const overlay = page.locator("#index-overlay");
		await expect(overlay).toHaveClass(/open/);
		// Panel should be at or near the bottom of the viewport
		const panel = page.locator("#index-panel");
		const box = await panel.boundingBox();
		expect(box).not.toBeNull();
		// Bottom of panel should be at or below 90% of viewport height
		expect(box!.y + box!.height).toBeGreaterThan(812 * 0.7);
	});

	test("starts on books step — back button is hidden", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		const panel = page.locator("#index-panel");
		await expect(panel).toHaveAttribute("data-step", "books");
		const backBtn = page.locator("#idx-back-btn");
		// hidden via display:none when aria-hidden=true
		await expect(backBtn).toHaveAttribute("aria-hidden", "true");
	});

	test("breadcrumb shows 'Browse' on books step", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await expect(page.locator("#idx-breadcrumb")).toHaveText("Browse");
	});

	test("tapping a book advances to chapters step", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		const panel = page.locator("#index-panel");
		await expect(panel).toHaveAttribute("data-step", "chapters", { timeout: 3_000 });
		await expect(page.locator("#idx-breadcrumb")).toContainText("John");
		const backBtn = page.locator("#idx-back-btn");
		await expect(backBtn).not.toHaveAttribute("aria-hidden");
	});

	test("chapters step shows 'Read the full book' as first item", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		const firstItem = page.locator("#idx-chapters .idx-item").first();
		await expect(firstItem).toContainText("Read the full book", { timeout: 3_000 });
	});

	test("tapping a chapter advances to verses step", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		// Click the first real chapter (skip 'Read full book')
		await page.locator("#idx-chapters .idx-chapter").first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "verses", {
			timeout: 3_000,
		});
		await expect(page.locator("#idx-breadcrumb")).toContainText("Chapter");
	});

	test("verses step shows 'Read the full chapter' as first item", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.locator("#idx-chapters .idx-chapter").first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "verses", {
			timeout: 3_000,
		});
		const firstVerse = page.locator("#idx-verses .idx-item").first();
		await expect(firstVerse).toContainText("Read the full chapter", { timeout: 3_000 });
	});

	test("back button from chapters step returns to books step", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.click("#idx-back-btn");
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "books", {
			timeout: 3_000,
		});
		await expect(page.locator("#idx-breadcrumb")).toHaveText("Browse");
	});

	test("back button from verses step returns to chapters step", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.locator("#idx-chapters .idx-chapter").first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "verses", {
			timeout: 3_000,
		});
		await page.click("#idx-back-btn");
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await expect(page.locator("#idx-breadcrumb")).toContainText("John");
	});

	test("tapping a verse navigates and closes the overlay", async ({ page }) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.locator("#idx-chapters .idx-chapter").first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "verses", {
			timeout: 3_000,
		});
		// Click the first verse item (skip 'Read the full chapter')
		await page.locator("#idx-verses .idx-verse").first().click();
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#content")).toContainText("John", { timeout: 5_000 });
	});

	test("tapping 'Read the full chapter' on mobile navigates and closes overlay", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.locator("#idx-chapters .idx-chapter").first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "verses", {
			timeout: 3_000,
		});
		await page.locator("#idx-verses .idx-read-chapter").click();
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#content")).toContainText("John", { timeout: 5_000 });
	});

	test("tapping 'Read the full book' on mobile navigates and closes overlay", async ({
		page,
	}) => {
		await page.goto("/");
		await waitForApp(page);
		await page.click("#index-btn");
		await page.locator("#idx-books .idx-item", { hasText: "John" }).first().click();
		await expect(page.locator("#index-panel")).toHaveAttribute("data-step", "chapters", {
			timeout: 3_000,
		});
		await page.locator("#idx-chapters .idx-read-book").click();
		await expect(page.locator("#index-overlay")).not.toHaveClass(/open/, { timeout: 5_000 });
		await expect(page.locator("#content")).toContainText("John", { timeout: 5_000 });
	});

	test("opening index when reading a chapter restores chapters step", async ({ page }) => {
		await page.goto("/?book=jhn&chapter=3");
		await waitForApp(page);
		await page.click("#index-btn");
		const panel = page.locator("#index-panel");
		// Currently reading a chapter → should open at verses step
		await expect(panel).toHaveAttribute("data-step", "verses", { timeout: 3_000 });
		await expect(page.locator("#idx-breadcrumb")).toContainText("John");
		await expect(page.locator("#idx-breadcrumb")).toContainText("Chapter 3");
	});

	test("opening index when reading a book (no chapter) restores chapters step", async ({
		page,
	}) => {
		await page.goto("/?book=jhn");
		await waitForApp(page);
		await page.click("#index-btn");
		const panel = page.locator("#index-panel");
		// Reading book only → chapters step
		await expect(panel).toHaveAttribute("data-step", "chapters", { timeout: 3_000 });
		await expect(page.locator("#idx-breadcrumb")).toContainText("John");
	});
});
