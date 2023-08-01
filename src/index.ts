#!/usr/bin/env node
/**
 * @file ZilaWS
 * @module ZilaWs
 * @license
 * MIT License
 * Copyright (c) 2022 Levente Balogh
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { w3cwebsocket } from "websocket";
import { v4 as randomUUID } from "uuid";

let errorHappened = false;

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
  message: any[] | null;
  callbackId: string | null;
}

interface ICallableLocalEvents {
  onStatusChange: (newValue: WSStatus) => void;
}

export class ZilaConnection {
  private callbacks: { [id: string]: ZilaWSCallback | undefined } = {};
  private localEventCallbacks: {
    [K in keyof ICallableLocalEvents]?: Array<ICallableLocalEvents[K]>;
  } = {};
  private connection: w3cwebsocket | undefined;
  private errorCallback: errorCallbackType | undefined;
  private _status: WSStatus = WSStatus.OPENING;

  public get status(): WSStatus {
    return this._status;
  }

  public set status(v: WSStatus) {
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
  public static async connectTo(wsUrl: string, errorCallback?: errorCallbackType): Promise<ZilaConnection> {
    return new Promise(async (resolve) => {
      let ws: w3cwebsocket | undefined;

      try {
        ws = new w3cwebsocket(wsUrl);
      } catch (error) {
        console.error("Couldn't connect to the WebSocket server.");
        console.error(error);
      }

      const socket = new ZilaConnection(ws, errorCallback);
      socket.onceEventListener("onStatusChange", () => {
        resolve(socket);
      });
    });
  }

  private constructor(ws: w3cwebsocket | undefined, errorCallback?: errorCallbackType) {
    if (ws == undefined) {
      this._status = WSStatus.ERROR;
      if (errorCallback) errorCallback("Couldn't estabilish connection to WebSocket server.");
      return this;
    }

    this.connection = ws;
    this.errorCallback = errorCallback;
    this._status = WSStatus.OPENING;

    this.connection.onerror = async (event) => {
      this.status = WSStatus.ERROR;

      if (this.errorCallback) {
        this.errorCallback(undefined);
      }

      console.error("Disconnected from WebSocket server.");
      console.error(event.message);
    };

    this.connection.onopen = () => {
      this.status = WSStatus.OPEN;

      console.log("Successfully connected to the WebSocket server.");
    };

    this.connection.onmessage = (ev: any) => {
      this.callEventHandler(ev.data.toString());
    };
  }

  /**
   * Calls the given callback if the client recieves a request for it from the server.
   * @param {string} msg The raw websocket message
   */
  private async callEventHandler(msg: string) {
    const msgObj: WSMessage = JSON.parse(msg);

    if (!errorHappened) {
      errorHappened = true;
      if (msgObj.identifier == "[ZilaWS]:Banned") {
        console.error("The client is banned from the WebSocket server.");
        if (this.errorCallback !== undefined) {
          this.errorCallback(msgObj.message !== null ? msgObj.message[0] : undefined);
          if (msgObj.callbackId) this.send(msgObj.callbackId, true);
        }
      } else if (msgObj.identifier == "[ZilaWS]:Kicked") {
        console.error("The client got disconnected from the server.");
        if (this.errorCallback !== undefined) {
          this.errorCallback(msgObj.message !== null ? msgObj.message[0] : undefined);
          if (msgObj.callbackId) this.send(msgObj.callbackId, true);
        }
      }
    }

    const callback = this.callbacks[msgObj.identifier];
    if (callback !== undefined && callback !== null && msgObj.message) {
      if (msgObj.callbackId && msgObj.callbackId != null) {
        Promise.resolve(callback(...msgObj.message)).then((val) => {
          if (!msgObj.callbackId) return;
          if (val === undefined) {
            this.send(msgObj.callbackId);
          } else {
            this.send(msgObj.callbackId, val);
          }
        });
      } else {
        callback(...msgObj.message);
      }
    }
  }

  /**
   * Calls an eventhandler on the serverside.
   * @param {string} identifier The callback's name on the serverside.
   * @param {any|undefined} data Arguments that shall be passed to the callback as parameters (optional)
   */
  public send(identifier: string, ...data: any[]): void {
    if (typeof data == "function" || data.filter((el) => typeof el == "function").length > 0) {
      throw new Error("Passing functions to the server is prohibited.");
    }

    const msg: WSMessage = {
      callbackId: null,
      message: data,
      identifier: identifier,
    };

    this.connection!.send(JSON.stringify(msg));
  }

  /**
   * Calls an async callback on the serverside. Gets a value back from the serverside or just waits for the eventhandler to finish.
   * @param {string} identifier The callback's name on the serverside.
   * @param {any|undefined} data Arguments that shall be passed to the callback as parameters (optional)
   * @returns {Promise<any>}
   */
  public async waiter(identifier: string, ...data: any[]): Promise<any> {
    return new Promise((resolve) => {
      if (typeof data == "function" || data.filter((el) => typeof el == "function").length > 0) {
        throw new Error("Passing functions to the server is prohibited.");
      }

      const uuid = randomUUID();

      this.registerMessageHandler(uuid, (args: any): void => {
        this.removeMessageHandler(uuid);
        resolve(args);
      });

      const msg: WSMessage = {
        callbackId: uuid,
        message: data,
        identifier: identifier,
      };

      this.connection!.send(JSON.stringify(msg));
    });
  }

  /**
   * Registers a new EventListener.
   *
   * EventListeners are made for local events only like for example: `onStatusChanged` that runs when the WebSocket client's connection status gets changed.
   *
   * IF YOU WANT TO REGISTER A **MessageHandler**, THAT RUNS WHEN THE **SERVERSIDE** ASKS FOR IT, YOU **SHOULD** USE `registerMessageHandler`
   * @param eventType
   * @param callback
   */
  public addEventListener<K extends keyof ICallableLocalEvents>(eventType: K, callback: ICallableLocalEvents[K]) {
    let array = this.localEventCallbacks[eventType];
    if (array != undefined) {
      if (array.findIndex((el) => el == callback)) {
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
    if (!array) {
      console.warn(`There is no callback registered for ${eventType}`);
      return;
    }

    const id = array.indexOf(callback);
    if (id == -1) {
      throw new ReferenceError("EventListener doesn't exist with the given eventName and callback!");
    }

    array.splice(id, 1);

    if (array.length == 0) delete this.localEventCallbacks[eventType];
  }

  /**
   * Registers an EventListener that can be called only once.
   *
   * If you want to register a MessageListener (what is called by serverside) only once you should use `onceMessageHandler`
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
   * Registers an eventhandler on the clientside that'll run when the server asks for it.
   * @param identifier The eventhandler's name. **Must not start with `[ZilaWS]:`!**
   * @param callback The eventhandler.
   */
  public registerMessageHandler(identifier: string, callback: ZilaWSCallback): void {
    if (identifier.startsWith("[ZilaWS]:")) {
      console.error("MessageHandlers' identifiers must not start with [ZilaWS]:");
    }
    this.callbacks[identifier] = callback;
  }

  /**
   * Removes a clientside MessageHandler.
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
    this.callbacks[identifier] = (...args: any[]) => {
      this.removeMessageHandler(identifier);
      callback(...args);
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

  public disconnect(): void {
    this.connection?.close();
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

const exporter = {
  connectTo: connectTo,
  WSStatus: WSStatus,
  ZilaConnection: ZilaConnection,
};

export default exporter;
