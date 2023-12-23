# ZilaWS Client
### ZilaWS is a blazingly fast and very lightweight library that provides an extremely easy-to-use way to transmit data via websockets between client-side and server-side using eventhandlers and async waiters.


<div style="text-align: center;">
<a style="padding: 2px;" href="https://github.com/ZilaWS/client/actions/workflows/test.yml">
    <img style="padding: 2px;" src="https://github.com/ZilaWS/client/actions/workflows/test.yml/badge.svg">
</a>
<img style="padding: 2px;" src="https://img.shields.io/badge/License%20-%20MIT%20-%20brightgreen">
<br>
<img style="padding: 2px;" src="./.coverage-badges/badge-branches.svg">
<img style="padding: 2px;" src="./.coverage-badges/badge-functions.svg">
<img style="padding: 2px;" src="./.coverage-badges/badge-lines.svg">
<img style="padding: 2px;" src="./.coverage-badges/badge-statements.svg">
</div>

<div style="text-align: center; margin-block: 30px;">
    <img src="logo.png" width="240">
</div>

<h2 style="text-align: center">
    <a href="https://zilaws.com" target="_blank" rel="noopener noreferrer">Documentation</a>
</h2>

<h2 style="text-align: center">Looking for the <a href="https://www.npmjs.com/package/zilaws-server" target="_blank" rel="noopener noreferrer">zilaws-server</a> package?</h2>

<p>ZilaWS can establish WS connection to a non zilaws server, but won't work as expected.</p>

<h2>
Waiter example
</h2>

### Client
```ts
const client = await connectTo("wss://yourhost.com");

console.log(await client.waiter("GetValueOfPI", "Some string") as number); // --> 3.141592653589793
```

### Server
```ts
client.setMessageHandler("SomeIdentifier", (param1: string) => {
    console.log(param1); // --> Some string
    return Math.PI;
});
```