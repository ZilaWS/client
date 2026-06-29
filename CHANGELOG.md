# Changelog

All notable changes to `zilaws-client` are documented in this file.

## [3.0.0] - 2026-06-28

### Added

- `syncCookies()` for pushing browser cookie changes to the server through the `/zilaws/cookieSync` endpoint.
- `onCookieSync` local event, fired after the client successfully syncs cookies with the server.
- `ZilaConnection.connectTo(...)` static factory for backwards-compatible connection setup.
- `allowSelfSignedCert` option on `connectTo` for local HTTPS testing.
- Automated browser integration tests (Puppeteer) for cookie sync and client connectivity.
- Bun-based unit test runner support (`test:bun`, `test:bun:all`).

### Changed

- **Breaking:** create a `ZilaConnection` instance and register message handlers **before** calling `connectTo`. This fixes a race where a server-side waiter could run before the client handler was registered.
- Cookie handling now follows the new server-side cookie sync model instead of runtime cookie mutation over the WebSocket.
- `onCookieSet` and `onCookieDelete` were replaced by `onCookieSync`.
- Added `cookie` as a runtime dependency.
- Updated dev tooling and CI workflows for Bun-based cross-package testing.

### Fixed

- Race condition where a server `waiter` could resolve before the matching client message handler was registered.

## [2.3.0] - Previous release

- Dependency upgrades.
