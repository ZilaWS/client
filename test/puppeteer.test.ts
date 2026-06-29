/**
 * Puppeteer browser tests.
 * Under Jest: jest-puppeteer provides `page` / `browser` globals.
 * Under Bun: run with `--preload ./test/setup/puppeteer.preload.ts`.
 */

// Use the published/built server package rather than raw source path to avoid transform issues
import { ZilaServer } from "zilaws-server";
import ZilaConnection from "../src"; // Still used for non-browser connection tests
import { createServer } from "http";

declare const page: import("puppeteer").Page;
declare const browser: import("puppeteer").Browser;

const isPuppeteer = typeof (globalThis as any).page !== "undefined";

if (typeof jest !== "undefined") {
  jest.setTimeout(30000);
}

(isPuppeteer ? describe : describe.skip)("ZilaWS Puppeteer integration", () => {
  let server: ZilaServer;
  const WS_PORT = 6593; // WebSocket server port
  const PAGE_PORT = WS_PORT + 101; // Separate HTTP page server
  const TOKEN = "VerySecretToken";
  let webServer = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html", "content-encoding": "utf-8" });
    res.end("<!DOCTYPE html><html><body><h1>Hello World!</h1></body></html>");
  });

  beforeAll(async () => {
    server = new ZilaServer({
      port: WS_PORT,
      logger: false,
      verbose: false,
    });

    webServer.listen(PAGE_PORT);

    await new Promise((r) => setTimeout(r, 80));
    await page.goto(`http://127.0.0.1:${PAGE_PORT}/`).catch((err: unknown) => {
      throw new Error(`page.goto failed: ${err}`);
    });
  });

  it("exposes page object", () => {
    expect(typeof (globalThis as any).page).toBe("object");
  });

  it("connects client", async () => {
    server.onceEventListener("onClientConnect", (socket) => {
      expect(socket).toBeDefined();
    });

    await new ZilaConnection().connectTo(`ws://127.0.0.1:${WS_PORT}`);
  }, 15_000);

  it("syncs browser cookies via cookieSync after connection", async () => {
    await page.evaluate((token: string) => {
      document.cookie = `sessionToken=${token}; path=/`;
    }, TOKEN);
    let socketRef: any;
    server.onceEventListener("onClientConnect", (socket) => {
      socketRef = socket;
    });
    await page.evaluate(
      (port: number) =>
        new Promise((res) => {
          const ws = new WebSocket(`ws://127.0.0.1:${port}`);
          ws.onopen = () => res(true);
        }),
      WS_PORT
    );
    await page.evaluate(
      (port: number) => fetch(`http://127.0.0.1:${port}/zilaws/cookieSync`, { credentials: "include" }),
      WS_PORT
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(socketRef.cookies.get("sessionToken")).toBe(TOKEN);
  });

  it("does NOT allow runtime cookie mutation after upgrade", async () => {
    // Pre-set a cookie to confirm baseline remains untouched besides initial values
    await page.evaluate(() => {
      document.cookie = "baseline=1; path=/";
    });

    let connected = false;
    server.onceEventListener("onClientConnect", (socket) => {
      connected = true;
      // Call deprecated runtime cookie API – now a no-op
      socket.setCookie({ name: "newRuntimeCookie", value: "abc", path: "/" } as any);
    });

    await new ZilaConnection().connectTo(`ws://127.0.0.1:${WS_PORT}`);

    expect(connected).toBe(true);

    // Give some time in case an (unexpected) message would be sent
    await new Promise((r) => setTimeout(r, 200));

    const names: string[] = await page.evaluate(() =>
      document.cookie.split(";").map((c) => c.trim().split("=")[0])
    );
    expect(names).toContain("baseline");
    expect(names).not.toContain("newRuntimeCookie");
  }, 20_000);

  afterAll(async () => {
    await server.stopServerAsync();
    webServer.close();
  });
});
