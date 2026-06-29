import { join } from "path";
import { WSStatus, ZilaConnection } from "../src/index";
import { ZilaServer, ZilaClient, CloseCodes } from "zilaws-server";

function func() {
  console.log("Connection status of the client has just been changed.");
}

describe("Secure server tests", () => {
  let clientS: ZilaConnection;
  let serverS: ZilaServer;
  let clientSocketS: ZilaClient;

  beforeAll(async () => {
    return new Promise<void>(async (r) => {
      serverS = new ZilaServer({
        port: 6589,
        logger: true,
        verbose: true,
        https: {
          pathToCert: join(process.cwd(), "/test/certs/cert.pem"),
          pathToKey: join(process.cwd(), "/test/certs/key.pem"),
          passphrase: "asdASD123",
        },
      });

      clientS = await new ZilaConnection().connectTo("wss://127.0.0.1:6589", undefined, true);
      r();
    });
  });

  test("RemoveEventListener nothing to remove", () => {
    clientS.removeEventListener("onStatusChange", func);
  });

  test("RemoveEventListener not existing callback", () => {
    function loc(asd: WSStatus) {
      return null;
    }
    clientS.addEventListener("onStatusChange", loc);
    clientS.removeEventListener("onStatusChange", () => {
      return 1;
    });
    clientS.removeEventListener("onStatusChange", loc);
  });

  test("Connection status is open", () => {
    expect(clientS.status).toBe(WSStatus.OPEN);
  });

  test("Client Async Waiter", async () => {
    clientS.addEventListener("onStatusChange", (newStauts: WSStatus) => {});

    serverS.setMessageHandler("sample", (socket, text: string) => {
      clientSocketS = socket;
      return text + " success";
    });
    expect(await clientS.waiter("sample", "sampleData")).toBe("sampleData success");
  });

  test("Server-Client", () => {
    clientS.setMessageHandler("clientSample", (text: string) => {
      expect(text).toBe("sampleText");
    });
    serverS.send(clientSocketS, "clientSample", "sampleText");
  });

  test("Client-Server", () => {
    serverS.setMessageHandler("Client-Server", (socket, obj: { smth: boolean }) => {
      expect(obj).toEqual({ smth: true });
    });
    clientS.send("Client-Server", { smth: true });
  });

  test("OnMessageRecieved event", () => {
    clientS.onceEventListener("onMessageRecieved", (message) => {
      expect(message).toBeInstanceOf(Array<string>);
    });
    serverS.send(clientSocketS, "THISSHOULDNOTEXIST", "SMTH");
  });

  test("OnRawMessageRecieved event", () => {
    clientS.onceEventListener("onRawMessageRecieved", (message) => {
      expect(message).toBeTruthy();
    });
    serverS.send(clientSocketS, "THISSHOULDNOTEXIST", "SMTH");
  });

  test("Client Async Waiter but no response", async () => {
    expect(await clientS.waiter("This doesn't exist", "sampleData")).toBe(undefined);
  });

  test("Client Async WaiterTimeout", async () => {
    serverS.setMessageHandler("WaiterTimeout", (socket, data: string) => {
      expect(data).toEqual("sampleData");
      return data + " success";
    });

    expect(await clientS.waiterTimeout("WaiterTimeout", 80, "sampleData")).toBe("sampleData success");
  });

  test("Client Async WaiterTimeout but no response", async () => {
    expect(await clientS.waiterTimeout("This doesn't exist", 80, "sampleData")).toBe(undefined);
  });

  test.failing("Multiple EventListeners with same credintals", () => {
    clientS.addEventListener("onStatusChange", func);
    clientS.addEventListener("onStatusChange", func);
  });

  test.failing("Connecting error handler 1", async () => {
    await new ZilaConnection().connectTo("127.0.0.1", (err) => {});
  });

  test.failing("Connecting error handler 2", async () => {
    await new ZilaConnection().connectTo("ws://127.0.0.1:123", (err) => {}, true);
  });

  test.failing("Connecting error handler 3", async () => {
    await new ZilaConnection().connectTo("wss://127.0.0.1:123", (err) => {}, true);
  });

  test("Server-Client Asnyc Waiter With String", async () => {
    clientS.setMessageHandler("clientSampleAsyncString", (text: string) => {
      return text + " success";
    });
    expect(await serverS.waiter(clientSocketS, "clientSampleAsyncString", "sampleString")).toBe(
      "sampleString success"
    );
  });

  test("OnceMessageHandler", () => {
    clientS.onceMessageHandler("ONCEMESSAGE", (arg1: number) => {
      console.log(arg1++);
      expect(arg1).toEqual(35.67);
    });
    serverS.send(clientSocketS, "ONCEMESSAGE", 34.67);
  });

  test("SetErrorHandler", () => {
    clientS.setErrorHandler((error) => {
      console.error(error);
    });
  });

  test("Simple Disconnect", async () => {
    const locClient = await new ZilaConnection().connectTo("wss://127.0.0.1:6589", undefined, true);
    await new Promise<void>((res) => {
      locClient.onceEventListener("onStatusChange", () => {
        res();
      });
      locClient.disconnect();
    });
  });

  test("Kick", async () => {
    serverS.setMessageHandler("KICKME", (socket) => {
      serverS.kickClient(socket, "A reason to kick.");
    });

    const locClient = await new ZilaConnection().connectTo(
      "wss://127.0.0.1:6589",
      (reason) => {
        expect(reason).toEqual("A reason to kick.");
      },
      true
    );

    locClient.send("KICKME");
  });

  test("Ban", async () => {
    serverS.setMessageHandler("BANME", (socket) => {
      serverS.banClient(socket, "A reason to ban.");
    });

    const locClient = await new ZilaConnection().connectTo(
      "wss://127.0.0.1:6589",
      (reason) => {
        expect(reason).toEqual("A reason to ban.");
      },
      true
    );

    locClient.send("BANME");
  });

  test("Client Already AsyncDisconnected", async () => {
    const srv = new ZilaServer({
      port: 6591,
      logger: true,
      verbose: true,
      https: {
        pathToCert: join(process.cwd(), "/test/certs/cert.pem"),
        pathToKey: join(process.cwd(), "/test/certs/key.pem"),
        passphrase: "asdASD123",
      },
    });

    const locClient = await new ZilaConnection().connectTo("wss://127.0.0.1:6591", undefined, true);

    locClient.addEventListener("onStatusChange", async (status) => {
      if (status == WSStatus.OPEN) return;
      await srv.stopServerAsync();
    });

    console.log("Client connected");

    await locClient.disconnectAsync();
    await locClient.disconnectAsync();
  });

  afterAll(async () => {
    await clientS.disconnectAsync();
    await serverS.stopServerAsync();
  });
});

describe("WebSocket connection", () => {
  let client: ZilaConnection;
  let server: ZilaServer;
  let clientSocket: ZilaClient;

  beforeAll(async () => {
    server = new ZilaServer({
      port: 6592,
      logger: true,
      verbose: true,
    });

    client = await new ZilaConnection().connectTo("ws://127.0.0.1:6592", (reason?: string) => {
      console.log("Error " + reason);
    });
    console.log(client);
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

  test("Client Async Waiter but no response", async () => {
    expect(await client.waiter("This doesn't exist", "sampleData")).toBe(undefined);
  });

  test("Client Async WaiterTimeout", async () => {
    server.setMessageHandler("WaiterTimeout", (socket, data: string) => {
      expect(data).toEqual("sampleData");
      return data + " success";
    });

    expect(await client.waiterTimeout("WaiterTimeout", 80, "sampleData")).toBe("sampleData success");
  });

  test("Client Async WaiterTimeout but no response", async () => {
    expect(await client.waiterTimeout("This doesn't exist", 80, "sampleData")).toBe(undefined);
  });

  test.failing("Multiple EventListeners with same credintals", () => {
    client.addEventListener("onStatusChange", func);
    client.addEventListener("onStatusChange", func);
  });

  test.failing("Connecting error handler 1", async () => {
    await new ZilaConnection().connectTo("127.0.0.1", (err) => {});
  });

  test.failing("Connecting error handler 2", async () => {
    await new ZilaConnection().connectTo("ws://127.0.0.1:123", (err) => {});
  });

  test.failing("Connecting error handler 3", async () => {
    await new ZilaConnection().connectTo("wss://127.0.0.1:123", (err) => {});
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
    const locClient = await new ZilaConnection().connectTo("ws://127.0.0.1:6592");
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

    const locClient = await new ZilaConnection().connectTo("ws://127.0.0.1:6592", (reason) => {
      expect(reason).toEqual("A reason to kick.");
    });

    locClient.send("KICKME");
  });

  test("Ban", async () => {
    server.setMessageHandler("BANME", (socket) => {
      server.banClient(socket, "A reason to ban.");
    });

    const locClient = await new ZilaConnection().connectTo("ws://127.0.0.1:6592", (reason) => {
      expect(reason).toEqual("A reason to ban.");
    });

    locClient.send("BANME");
  });

  test("Client Already AsyncDisconnected", async () => {
    const srv = new ZilaServer({
      port: 6593,
      logger: true,
      verbose: true,
    });

    const locClient = await new ZilaConnection().connectTo("ws://127.0.0.1:6593");

    locClient.addEventListener("onStatusChange", async (status) => {
      if (status == WSStatus.OPEN) return;
      await srv.stopServerAsync();
    });

    console.log("Client connected");

    await locClient.disconnectAsync();
    await locClient.disconnectAsync();
  });

  afterAll(async () => {
    await client.disconnectAsync();
    await server.stopServerAsync();
  });
});
