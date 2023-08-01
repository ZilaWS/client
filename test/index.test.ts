import Zila, { ZilaConnection } from "../src/index";

var socket: ZilaConnection;

describe("WebSocket connection", () => {
  beforeAll(async () => {
    socket = await Zila.connectTo("ws://warstek.ddns.net:2082", (reason?: string) => {
      console.log("Error " + reason);
      console.log(socket);
    });
  });

  test("Connection status is open", () => {
    expect(socket.status).toBe(Zila.WSStatus.OPEN);
  });

  test("Circle", () => {
    socket.registerMessageHandler("clientSample", (text: string) => {
      console.log("A kör bezárult: " + text);
      expect(text).toBe("sampleText");
    });
  });

  test("sampleData", async () => {
    expect(await socket.waiter("sample", "sampleData")).toBe("sampleData success");
  });

  afterAll(() => {
    socket.disconnect();
  });
});
