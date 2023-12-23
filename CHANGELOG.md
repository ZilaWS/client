# New Features

- Timeout for waiters
  - Set the timeout with `client.maxWaiterTime`
  - `waiterTimeout` function with a max waiting time parameter

- The server-side (^1.2) can now set cookies.
  - New local events:
    - onCookieSet
    - onCookieDelete
  - Cookie syncing: `syncCookies`
  