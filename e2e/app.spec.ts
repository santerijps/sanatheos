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
    await expect(content).toContainText("In the beginning God created the heaven and the earth");
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
// Settings modal
// ---------------------------------------------------------------------------

test.describe("Settings modal", () => {
  test("opens and closes", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    const overlay = page.locator("#settings-overlay");

    await page.click("#settings-btn");
    await expect(overlay).toHaveClass(/open/);

    await page.click("#settings-close");
    await expect(overlay).not.toHaveClass(/open/);
  });

  test("translation selector is populated", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.click("#settings-btn");
    const options = page.locator("#translation-select option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("theme switching updates data-theme attribute", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.click("#settings-btn");
    await page.selectOption("#theme-select", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.selectOption("#theme-select", "light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("font size switching updates data-font-size attribute", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.click("#settings-btn");
    await page.selectOption("#fontsize-select", "large");
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "large");
  });
});

// ---------------------------------------------------------------------------
// Info modal
// ---------------------------------------------------------------------------

test.describe("Info modal", () => {
  test("opens and closes", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    const overlay = page.locator("#info-overlay");

    await page.click("#info-btn");
    await expect(overlay).toHaveClass(/open/);

    await page.click("#info-close");
    await expect(overlay).not.toHaveClass(/open/);
  });

  test("contains help sections", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.click("#info-btn");
    const body = page.locator("#info-modal-body");
    await expect(body).toContainText("Search Input");
    await expect(body).toContainText("Keyboard Shortcuts");
    await expect(body).toContainText("Settings");
  });

  test("closes with Escape", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.click("#info-btn");
    await expect(page.locator("#info-overlay")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#info-overlay")).not.toHaveClass(/open/);
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
    await page.click("#settings-btn");
    await page.selectOption("#translation-select", "KJV");
    // Close and wait for KJV-specific text
    await page.click("#settings-close");
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
    await page.click("#settings-btn");
    await page.selectOption("#parallel-select", "KJV");
    await page.click("#settings-close");
    // Parallel container should now appear
    await expect(page.locator(".parallel-container")).toBeVisible({ timeout: 10_000 });
  });

  test("disabling parallel returns to single column", async ({ page }) => {
    await page.goto("/?book=gen&chapter=1&p=KJV");
    await waitForApp(page);
    await page.waitForSelector(".parallel-container", { timeout: 10_000 });
    // Disable parallel via settings
    await page.click("#settings-btn");
    await page.selectOption("#parallel-select", "");
    await page.click("#settings-close");
    // Parallel container should disappear
    await expect(page.locator(".parallel-container")).toHaveCount(0, { timeout: 10_000 });
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
