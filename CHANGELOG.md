- Fixed an issue importing the library.

## Breaking Changes

### New importing
From now on, there is no default export.

ESM

```ts
import { connectTo } from "zilaws-client";
```

CommonJS
```ts
const { connectTo } = require("zilaws-client");
```