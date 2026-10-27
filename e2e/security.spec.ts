import { expect, test } from "@playwright/test";

test("response halaman membawa security headers", async ({ request }) => {
  const response = await request.get("/login");
  expect(response.status()).toBe(200);

  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

test("redirect halaman terproteksi juga membawa CSP", async ({ request }) => {
  const response = await request.get("/history", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("login diblokir sementara setelah 5 percobaan gagal", async ({ page }) => {
  // Unique per run so the shared dev-server counter never leaks between runs.
  const identifier = `bogus-${Date.now()}@example.com`;
  const wrongPassword = "salah-terus";

  await page.goto("/login");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.getByLabel("Username atau Email").fill(identifier);
    await page.getByLabel("Password", { exact: true }).fill(wrongPassword);
    // Wait for the server action response: the error text is identical on every
    // attempt, so asserting on it alone can race ahead of the request.
    const submitted = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("/login"),
    );
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await submitted;
    await expect(
      page.getByText("Username/email atau password salah.", { exact: false }),
    ).toBeVisible();
  }

  await page.getByLabel("Username atau Email").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(wrongPassword);
  const blocked = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/login"),
  );
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await blocked;

  await expect(page.getByText(/Terlalu banyak percobaan masuk/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
