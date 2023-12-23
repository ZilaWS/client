/**
 * @file ZilaWS
 * @module ZilaWs
 * @license
 * MIT License
 * Copyright (c) 2023 ZilaWS
 */
import { WebSocket } from "ws";
import { v4 as randomUUID } from "uuid";
import { CloseCodes } from "./CloseCodes";

type errorCallbackType = (reason?: string) => void;

type ZilaWSCallback = (...args: any[]) => any;

export enum WSStatus {
  OPENING,
  OPEN,
  CLOSED,
  ERROR,
}

interface WSMessage {
  identifier: string;
  message: any[] | any | null;
  callbackId: string | null;
}

interface ICallableLocalEvents {
  /**
   * Runs when the client's connection status changes
   * @param newValue
   * @returns
   */
  onStatusChange: (newValue: WSStatus) => void;

  /**
   * Runs after the client processes a newly recieved message
   * @param message Already processed message
   * @returns
   */
  onMessageRecieved: (message: any) => void;

  /**
   * Runs before the client processes a newly recieved message
   * @param message
   * @returns
   */
  onRawMessageRecieved: (message: string) => void;

  /**
   * Runs when the server sends down one or multiple new cookies.
   * @param cookieString
   * @returns
   */
  onCookieSet: (cookieString: string) => void;

  /**
   * Runs when the server deletes a cookie
   * @param cookieName
   * @returns
   */
  onCookieDelete: (cookieName: string) => void;
}

export class ZilaConnection {
  private callbacks: { [id: string]: ZilaWSCallback | undefined } = {};
  private localEventCallbacks: {
    [K in keyof ICallableLocalEvents]?: Array<ICallableLocalEvents[K]>;
  } = {};
  private connection: WebSocket | globalThis.WebSocket | undefined;
  private errorCallback: errorCallbackType | undefined;
  private _status: WSStatus = WSStatus.OPENING;

  public get status(): WSStatus {
    return this._status;
  }

  private set status(v: WSStatus) {
    this._status = v;
    if (this.localEventCallbacks.onStatusChange && this.localEventCallbacks.onStatusChange.length > 0) {
      for (const callback of this.localEventCallbacks.onStatusChange) {
        callback(v);
      }
    }
  }

  /**
   * Connects to the given WebSocket server. Must be a *ZilaWS* server.
   * @example
   * //Without SSL:
   * connectTo("ws://127.0.0.1:82")
   * //With SSL:
   * connectTo("wss://127.0.0.1:82")
   * @param wsUrl The URL which the server can be accessed with.
   * @param errorCallback This callback will be executed if an error occurs.
   * @returns {Promise<ZilaConnection>}
   */
  public static async connectTo(
    wsUrl: string,
    errorCallback?: errorCallbackType,
    allowSelfSignedCert = false
  ): Promise<ZilaConnection> {
    return new Promise(async (resolve, reject) => {
      let ws: WebSocket | globalThis.WebSocket | undefined;

      try {
        //Can't test this with Node.
        /* istanbul ignore next */
        if (typeof window !== "undefined" && typeof window.document !== "undefined") {
          ws = new window.WebSocket(wsUrl);
          ws.onerror = (ev) => {
            console.error(JSON.stringify(ev));
            errorCallback?.call(ev.type);
            console.error("Disconnected from WebSocket server.");
          };
        } else {
          ws = new WebSocket(wsUrl, {
            rejectUnauthorized: !allowSelfSignedCert,
            headers: {
              "s-type": 1,
            },
          });

          ws.onerror = (ev) => {
            console.error(JSON.stringify(ev));
            errorCallback?.call(ev.message);
            console.error("Disconnected from WebSocket server.");
          };
        }
      } catch (error) {
        const errorMessage = (error as Error).stack?.split("\n")[0];
        if (error && errorCallback) errorCallback(errorMessage);
        reject(errorMessage);
        return;
      }

      const socket = new ZilaConnection(ws, errorCallback);
      socket.onceEventListener("onStatusChange", (status) => {
        if (ws && [WSStatus.CLOSED, WSStatus.ERROR].includes(status)) {
          reject("Couldn't connect to the WebSocket server.");
        } else {
          resolve(socket);
        }
      });
    });
  }

  private constructor(ws: WebSocket | globalThis.WebSocket, errorCallback?: errorCallbackType) {
    this.connection = ws;
    this.errorCallback = errorCallback;
    this._status = WSStatus.OPENING;

    this.connection.onopen = () => {
      this.status = WSStatus.OPEN;
    };

    this.connection.onclose = ({ code, reason }: { code: number; reason: string }) => {
      if (code == CloseCodes.BANNED) {
        console.error("ZilaWS: The client is banned from the WebSocket server.");
      } else if (code == CloseCodes.KICKED) {
        console.error("ZilaWS: The client got disconnected from the server.");
      }

      this.status = WSStatus.CLOSED;
      if (this.errorCallback) this.errorCallback(reason);
    };

    this.connection.onmessage = (ev: MessageEvent<any>) => {
      this.callEventHandler(ev.data.toString());
    };
  }

  /**
   * Calls the given callback if the client recieves a request for it from the server.
   * @param {string} msg The raw websocket message
   */
  private async callEventHandler(msg: string) {
    if (this.localEventCallbacks.onRawMessageRecieved) {
      for (const cb of this.localEventCallbacks.onRawMessageRecieved) {
        cb(msg);
      }
    }

    const msgObj: WSMessage = JSON.parse(msg);

    /* istanbul ignore next */
    if (msgObj.identifier[0] == "@") {
      if (msgObj.identifier == "@SetCookie") {
        if (typeof window !== "undefined" && typeof window.document !== "undefined") {
          const cookieString = msgObj.message as unknown as string;
          document.cookie = cookieString;

          if (this.localEventCallbacks.onCookieSet)
            for (const cb of this.localEventCallbacks.onCookieSet) {
              cb(cookieString);
            }
        }
      } else if (msgObj.identifier == "@DelCookie") {
        if (typeof window !== "undefined" && typeof window.document !== "undefined") {
          const cookieName = msgObj.message as unknown as string;
          document.cookie = `${cookieName}=; expires=${new Date(0)}; path=/;`;

          if (this.localEventCallbacks.onCookieDelete)
            for (const cb of this.localEventCallbacks.onCookieDelete) {
              cb(cookieName);
            }
        }
      }

      return;
    }

    if (this.localEventCallbacks.onMessageRecieved) {
      for (const cb of this.localEventCallbacks.onMessageRecieved) {
        cb(msgObj.message);
      }
    }

    const callback = this.callbacks[msgObj.identifier];
    if (callback !== undefined && callback !== null && msgObj.message) {
      Promise.resolve(callback(...msgObj.message)).then((val) => {
        if (msgObj.callbackId && msgObj.callbackId != null) {
          this.send(msgObj.callbackId, val);
        }
      });
    }
  }

  /**
   * Returns a JSON serialized message object.
   * @param identifier
   * @param data
   * @param callbackId
   * @param isBuiltIn
   * @returns
   */
  private getMessageJSON(
    identifier: string,
    data: any[] | null,
    callbackId: string | null,
    isBuiltIn: boolean = false
  ): string {
    /* istanbul ignore next */
    return JSON.stringify({
      identifier: isBuiltIn ? identifier : "@" + identifier,
      message: data,
      callbackId: callbackId,
    });
  }

  /**
   * Send function for built-in systems
   * @param {string} identifier The callback's name on the server-side.
   * @param {any|undefined} data Arguments that shall be passed to the callback as parameters (optional)
   */
  /* istanbul ignore next */
  private bSend(identifier: string, ...data: any[]) {
    this.connection!.send(this.getMessageJSON(identifier, data, null, true));
  }

  /**
   * Calls an eventhandler on the server-side.
   * @param {string} identifier The callback's name on the server-side.
   * @param {any|undefined} data Arguments that shall be passed to the callback as parameters (optional)
   */
  public send(identifier: string, ...data: any[]): void {
    this.connection!.send(this.getMessageJSON(identifier, data, null));
  }

  /**
   * Calls an async callback on the server-side. Gets a value back from the server-side or just waits for the eventhandler to finish.
   * @param {string} identifier The callback's name on the server-side.
   * @param {any|undefined} data Arguments that shall be passed to the callback as parameters (optional)
   * @returns {Promise<any>}
   */
  public async waiter(identifier: string, ...data: any[]): Promise<any> {
    return new Promise((resolve) => {
      const uuid = randomUUID();

      this.onceMessageHandler(uuid, (args: any): void => {
        resolve(args);
      });

      this.connection!.send(this.getMessageJSON(identifier, data, uuid));
    });
  }

  /**
   * Sync cookies to the server-side.
   */
  /* istanbul ignore next */
  public syncCookies() {
    this.bSend("SyncCookies", document.cookie);
  }

  /**
   * Registers a new EventListener.
   *
   * EventListeners are made for local events only like for example: `onStatusChanged` that runs when the WebSocket client's connection status gets changed.
   *
   * IF YOU WANT TO REGISTER A **MessageHandler**, THAT RUNS WHEN THE **server-side** ASKS FOR IT, YOU **SHOULD** USE `registerMessageHandler`
   * @param eventType
   * @param callback
   */
  public addEventListener<K extends keyof ICallableLocalEvents>(eventType: K, callback: ICallableLocalEvents[K]) {
    let array = this.localEventCallbacks[eventType];
    if (array != undefined) {
      if (array.findIndex((el) => el === callback) >= 0) {
        throw new Error(`${eventType} listener already has this callback added to it.`);
      }
    } else {
      array = [];
    }
    array.push(callback);
    this.localEventCallbacks[eventType] = array;
  }

  /**
   * Removes an EventListener from the given event eventType
   * @param eventType The event's name where the callback should be removed from.
   * @param callback The to be removed callback.
   */
  public removeEventListener<K extends keyof ICallableLocalEvents>(
    eventType: K,
    callback: ICallableLocalEvents[K]
  ) {
    let array = this.localEventCallbacks[eventType];
    if (!array) return;

    const id = array.indexOf(callback);
    if (id == -1) return;

    array.splice(id, 1);

    if (array.length == 0) delete this.localEventCallbacks[eventType];
  }

  /**
   * Registers an EventListener that can be called only once.
   *
   * If you want to register a MessageListener (what is called by server-side) only once you should use `onceMessageHandler`
   * @param eventType
   * @param callback
   */
  public onceEventListener<K extends keyof ICallableLocalEvents>(eventType: K, callback: ICallableLocalEvents[K]) {
    const that = this;

    function onceCallback(...args: any[]) {
      that.removeEventListener(eventType, onceCallback);
      (callback as Function).apply(null, args);
    }

    this.addEventListener(eventType, onceCallback);
  }

  /**
   * Registers an eventhandler on the client-side that'll run when the server asks for it.
   * Can get overrided with using the same identifier.
   * @param identifier The eventhandler's name. **Must not start with `[ZilaWS]:`!**
   * @param callback The eventhandler.
   */
  public setMessageHandler(identifier: string, callback: ZilaWSCallback): void {
    this.callbacks[identifier] = callback;
  }

  /**
   * Removes a client-side MessageHandler.
   * @param identifier
   */
  public removeMessageHandler(identifier: string): void {
    delete this.callbacks[identifier];
  }

  /**
   * Registers a MessageHandler that only can be called once.
   * @param identifier
   * @param callback
   */
  public onceMessageHandler(identifier: string, callback: ZilaWSCallback): void {
    this.callbacks[identifier] = async (...args: any[]) => {
      this.removeMessageHandler(identifier);
      const ret = await Promise.resolve(callback(...args));
      return ret;
    };
  }

  /**
   * This runs when an error occurs with the WebSocket. (For example the client gets kicked or banned)
   * Set this if you want to notify the user.
   * @param callback
   */
  public async setErrorHandler(callback: errorCallbackType): Promise<void> {
    return new Promise((resolve) => {
      this.errorCallback = callback;
      resolve();
    });
  }

  /**
   * Disconnect from the WS server
   */
  public disconnect(): void {
    this.connection?.close();
  }

  /**
   * Disconnects the client asynchronously
   * @param reason
   * @returns
   */
  public disconnectAsync(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.connection || this.status == WSStatus.CLOSED) {
        console.error("The websocket is already disconnected.");
        resolve();
        return;
      }

      this.onceEventListener("onStatusChange", (status) => {
        if (status == WSStatus.CLOSED) {
          resolve();
        }
      });

      this.connection.close();
    });
  }
}

/**
 * Connects to the given WebSocket server. Must be a *ZilaWS* server.
 * @example
 * //Without SSL:
 * connectTo("ws://127.0.0.1:82")
 * //With SSL:
 * connectTo("wss://127.0.0.1:82")
 * @param wsUrl The URL which the server can be accessed with.
 * @param errorCallback This callback will be executed if an error occurs.
 * @returns {Promise<ZilaConnection>}
 */
export async function connectTo(wsUrl: string, errorCallback?: errorCallbackType): Promise<ZilaConnection> {
  return ZilaConnection.connectTo(wsUrl, errorCallback);
}
