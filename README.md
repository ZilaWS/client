# ZilaWS Client

ZilaWS is a blazingly fast and very lightweight library that provides an extremely easy-to-use way to transmit data via websockets between client-side and server-side using eventhandlers and async waiters

[![Test status badge](https://github.com/ZilaWS/client/actions/workflows/test.yml/badge.svg)](https://github.com/ZilaWS/client/actions/workflows/test.yml)
![MIT License](https://img.shields.io/badge/License%20-%20MIT%20-%20brightgreen)
![coverage label for branches](./.coverage-badges/badge-branches.svg)
![coverage label for functions](./.coverage-badges/badge-functions.svg)
![coverage label for lines of code](./.coverage-badges/badge-lines.svg)
![coverage label for statements](./.coverage-badges/badge-statements.svg)

<img src="logo.png" width="240">

## [Documentation](https://zilaws.com)

## Looking for the [zilaws-server](https://www.npmjs.com/package/zilaws-server) package?</h2>

ZilaWS can establish WS connection to a non zilaws server, but won't work as expected.

## Waiters

ZilaWS has a unique function called `waiter`. Waiters (as their name suggests) can be awaited.
They resolve when the client side *MessageHandler* resolves or returns thus making it perfect for retrieving data from a client.
However if the client does not respond in time, waiters will resolve as *undefined*.

### Parameters

#### Regular waiters

Regular waiters wait for a response for the amount of time specified by the `maxWaiterTime` property. This is a property of the client.

* `identifier`: The name of the [MessageHandler](https://zilaws.com/docs/server-api/recieving-data#waiting-for-data) on the other side of the connection.
* `...data`: A waiter (or a send) can be given any number of any data.

```ts
socket.waiter<T>(identifier: string, ...data: any[]): Promise<T | undefined>
```

#### Timeout Waiters

<!-- `WaiterTimeout`s wait until the maxWaiting -->
* `maxWaitingTime`: This paramater overrides the maximum waiting time for the corresponding `waiter`. The value is in miliseconds.

```ts
socket.waiterTimeout<T>(identifier: string, maxWaitingTime: number, ...data: any[]): Promise<T | undefined>
```

### Example

### Client

```ts
const client = await connectTo("wss://yourhost.com:6589");

console.log(await client.waiter("GetValueOfPI", "Some string") as number); // --> 3.141592653589793
console.log(await client.waiterTimeout("GetValueOfPI", 1200, "Some string") as number); // --> 3.141592653589793
```

### Server

```ts
const server = new ZilaServer({
    port: 6589,
    https: {
        pathToCert: "cert/fullchain.pem",
        pathToKey: "cert/privkey.pem"
    }
});

server.setMessageHandler("GetValueOfPI", (param1: string) => {
    console.log(param1); // --> Some string
    return Math.PI;
});
```

## More

ZilaWS offers much more. Check out the [documentation](https://zilaws.com/)!
