import { connectTo, WSStatus, ZilaConnection } from "../src/index";
import ZilaServer, { ZilaClient } from "zilaws-server";

var client: ZilaConnection;
var server: ZilaServer;
var clientSocket: ZilaClient;
function func() {
  console.log("I'm a function!");
}
describe("WebSocket connection", () => {
  beforeAll(async () => {
    server = new ZilaServer({
      port: 6589,
      logger: true,
      verbose: true,
    });

    client = await connectTo("ws://127.0.0.1:6589", (reason?: string) => {
      console.log("Error " + reason);
    });
  });

  test("RemoveEventListener nothing to remove", () => {
    client.removeEventListener("onStatusChange", func);
  });

  test("RemoveEventListener not existing callback", () => {
    function loc(asd: WSStatus) {
      return null;
    }
    client.addEventListener("onStatusChange", loc);
    client.removeEventListener("onStatusChange", () => {
      return 1;
    });
    client.removeEventListener("onStatusChange", loc);
  });

  test("Connection status is open", () => {
    expect(client.status).toBe(WSStatus.OPEN);
  });

  test("Client Async Waiter", async () => {
    client.addEventListener("onStatusChange", (newStauts: WSStatus) => {});

    server.setMessageHandler("sample", (socket, text: string) => {
      clientSocket = socket;
      return text + " success";
    });
    expect(await client.waiter("sample", "sampleData")).toBe("sampleData success");
  });

  test("Server-Client", () => {
    client.setMessageHandler("clientSample", (text: string) => {
      expect(text).toBe("sampleText");
    });
    server.send(clientSocket, "clientSample", "sampleText");
  });

  test("Client-Server", () => {
    server.setMessageHandler("Client-Server", (socket, obj: { smth: boolean }) => {
      expect(obj).toEqual({ smth: true });
    });
    client.send("Client-Server", { smth: true });
  });

  test("OnMessageRecieved event", () => {
    client.onceEventListener("onMessageRecieved", (message) => {
      expect(message).toBeInstanceOf(Array<string>);
    });
    server.send(clientSocket, "THISSHOULDNOTEXIST", "SMTH");
  });

  test("OnRawMessageRecieved event", () => {
    client.onceEventListener("onRawMessageRecieved", (message) => {
      expect(message).toBeTruthy();
    });
    server.send(clientSocket, "THISSHOULDNOTEXIST", "SMTH");
  });

  test.failing("Client-Server but with a function", () => {
    server.setMessageHandler("Client-Server", (socket, obj: { smth: any }) => {});
    client.send("Client-Server", () => {
      console.log("I'm a function!");
    });
  });

  test.failing("Waiter but with a function", async () => {
    await client.waiter("SMTH", () => {
      console.log("I'm a function!");
    });
  });

  test.failing("Multiple EventListeners with same credintals", () => {
    client.addEventListener("onStatusChange", func);
    client.addEventListener("onStatusChange", func);
  });

  test.failing("Connecting error handler 1", async () => {
    await connectTo("127.0.0.1", (err) => {});
  });

  test.failing("Connecting error handler 2", async () => {
    await connectTo("ws://127.0.0.1:123", (err) => {});
  });

  test.failing("Connecting error handler 3", async () => {
    await connectTo("wss://127.0.0.1:123", (err) => {});
  });

  test("Server-Client Asnyc Waiter With String", async () => {
    client.setMessageHandler("clientSampleAsyncString", (text: string) => {
      return text + " success";
    });
    expect(await server.waiter(clientSocket, "clientSampleAsyncString", "sampleString")).toBe(
      "sampleString success"
    );
  });

  test("OnceMessageHandler", () => {
    client.onceMessageHandler("ONCEMESSAGE", (arg1: number) => {
      console.log(arg1++);
      expect(arg1).toEqual(35.67);
    });
    server.send(clientSocket, "ONCEMESSAGE", 34.67);
  });

  test("SetErrorHandler", () => {
    client.setErrorHandler((error) => {
      console.error(error);
    });
  });

  test("Simple Disconnect", async () => {
    const locClient = await connectTo("ws://127.0.0.1:6589");
    await new Promise<void>((res) => {
      locClient.onceEventListener("onStatusChange", () => {
        res();
      });
      locClient.disconnect();
    });
  });

  test("Kick", async () => {
    server.setMessageHandler("KICKME", (socket) => {
      server.kickClient(socket, "A reason to kick.");
    });

    const locClient = await connectTo("ws://127.0.0.1:6589", (reason) => {
      expect(reason).toEqual("A reason to kick.");
    });

    locClient.send("KICKME");
  });

  test("Ban", async () => {
    server.setMessageHandler("BANME", (socket) => {
      server.banClient(socket, "A reason to ban.");
    });

    const locClient = await connectTo("ws://127.0.0.1:6589", (reason) => {
      expect(reason).toEqual("A reason to ban.");
    });

    locClient.send("BANME");
  });

  test("Client Already AsyncDisconnected", async () => {
    const locClient = await connectTo("ws://127.0.0.1:6589");
    await locClient.disconnectAsync();
    await locClient.disconnectAsync();
  });

  afterAll(async () => {
    await client.disconnectAsync();
    await server.stopServerAsync();
  });
});

describe("WebSocket connection", () => {
  beforeAll(async () => {
    server = new ZilaServer({
      port: 6589,
      logger: true,
      verbose: true,
    });

    client = await connectTo("ws://127.0.0.1:6589", (reason?: string) => {
      console.log("Error " + reason);
    });
  });

  test("RemoveEventListener nothing to remove", () => {
    client.removeEventListener("onStatusChange", func);
  });

  test("RemoveEventListener not existing callback", () => {
    function loc(asd: WSStatus) {
      return null;
    }
    client.addEventListener("onStatusChange", loc);
    client.removeEventListener("onStatusChange", () => {
      return 1;
    });
    client.removeEventListener("onStatusChange", loc);
  });

  test("Connection status is open", () => {
    expect(client.status).toBe(WSStatus.OPEN);
  });

  test("Client Async Waiter", async () => {
    server.setMessageHandler("sample", (socket, text: string) => {
      clientSocket = socket;
      return text + " success";
    });
    expect(await client.waiter("sample", "sampleData")).toBe("sampleData success");
  });

  test("Server-Client", () => {
    client.setMessageHandler("clientSample", (text: string) => {
      expect(text).toBe("sampleText");
    });
    server.send(clientSocket, "clientSample", "sampleText");
  });

  test("Client-Server", () => {
    server.setMessageHandler("Client-Server", (socket, obj: { smth: boolean }) => {
      expect(obj).toEqual({ smth: true });
    });
    client.send("Client-Server", { smth: true });
  });

  test.failing("Client-Server but with a function", () => {
    server.setMessageHandler("Client-Server", (socket, obj: { smth: any }) => {});
    client.send("Client-Server", () => {
      console.log("I'm a function!");
    });
  });

  test.failing("Waiter but with a function", async () => {
    await client.waiter("SMTH", () => {
      console.log("I'm a function!");
    });
  });

  test.failing("Multiple EventListeners with same credintals", () => {
    client.addEventListener("onStatusChange", func);
    client.addEventListener("onStatusChange", func);
  });

  test.failing("Connecting error handler 1", async () => {
    await connectTo("127.0.0.1", (err) => {});
  });

  test.failing("Connecting error handler 2", async () => {
    await connectTo("ws://127.0.0.1:123", (err) => {});
  });

  test.failing("Connecting error handler 3", async () => {
    await connectTo("wss://127.0.0.1:123", (err) => {});
  });

  test("Server-Client Asnyc Waiter With String", async () => {
    client.setMessageHandler("clientSampleAsyncString", (text: string) => {
      return text + " success";
    });
    expect(await server.waiter(clientSocket, "clientSampleAsyncString", "sampleString")).toBe(
      "sampleString success"
    );
  });

  test("OnceMessageHandler", () => {
    client.onceMessageHandler("ONCEMESSAGE", (arg1: number) => {
      console.log(arg1++);
      expect(arg1).toEqual(35.67);
    });
    server.send(clientSocket, "ONCEMESSAGE", 34.67);
  });

  test("SetErrorHandler", () => {
    client.setErrorHandler((error) => {
      console.error(error);
    });
  });

  test("Simple Disconnect", async () => {
    const locClient = await connectTo("ws://127.0.0.1:6589");
    await new Promise<void>((res) => {
      locClient.onceEventListener("onStatusChange", () => {
        res();
      });
      locClient.disconnect();
    });
  });

  test("Client Already AsyncDisconnected", async () => {
    const locClient = await connectTo("ws://127.0.0.1:6589");
    await locClient.disconnectAsync();
    await locClient.disconnectAsync();
  });

  afterAll(async () => {
    await client.disconnectAsync();
    await server.stopServerAsync();
  });
});
