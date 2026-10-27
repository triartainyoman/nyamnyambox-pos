import { expect, test } from "@playwright/test";

test("health check melaporkan status dan tidak di-cache", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body.status).toBe("ok");
  expect(body.checks.app.state).toBe("ok");
  // The E2E server runs in demo mode: Supabase env is blanked on purpose.
  expect(body.checks.database.state).toBe("not_configured");
  expect(body.checks.auth.state).toBe("not_configured");
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("health check tidak butuh sesi dan tidak diarahkan ke login", async ({ request }) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test("endpoint log-error menerima laporan dan menolak payload rusak", async ({ request }) => {
  const accepted = await request.post("/api/log-error", {
    data: {
      kind: "window.error",
      message: "probe error for owner@example.com",
      stack: "Error: probe\n    at handler",
      url: "http://127.0.0.1:3210/pos",
    },
  });
  expect(accepted.status()).toBe(204);

  const missingMessage = await request.post("/api/log-error", {
    data: { kind: "window.error" },
  });
  expect(missingMessage.status()).toBe(400);

  const invalidJson = await request.post("/api/log-error", {
    headers: { "content-type": "application/json" },
    data: "{not json",
  });
  expect(invalidJson.status()).toBe(400);

  const tooLarge = await request.post("/api/log-error", {
    data: { kind: "window.error", message: "x".repeat(9000) },
  });
  expect(tooLarge.status()).toBe(413);
});

test("error yang tidak tertangani di browser dikirim ke /api/log-error", async ({ page }) => {
  await page.goto("/login");

  // The reporter is installed in a useEffect, so wait for hydration first:
  // the password toggle only works once React is interactive.
  await page.getByRole("button", { name: "Tampilkan password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");

  const report = page.waitForRequest(
    (request) => request.url().includes("/api/log-error") && request.method() === "POST",
  );

  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("e2e-client-error-probe");
    }, 0);
  });

  const request = await report;
  const body = JSON.parse(request.postData() ?? "{}");

  expect(body.kind).toBe("window.error");
  expect(body.message).toContain("e2e-client-error-probe");
  expect(body.url).toContain("/login");
});
