# Gmail Auto Dark Mode

A lightweight Chrome extension that automatically switches Gmail to dark mode based on your system's light/dark preference — no manual toggling needed.

![Gmail Auto Dark Mode screenshot](screenshot.png)

## How it works

The extension injects a CSS filter into Gmail that inverts colors to simulate dark mode. It listens for changes to your OS-level color scheme preference (`prefers-color-scheme`) and reacts in real time. It also uses a `MutationObserver` to reapply styles after Gmail's single-page app navigation.

Images, videos, and canvases are counter-inverted so they render with their original colors.

## Installation

### From the Chrome Web Store

_(Coming soon)_

### Manual installation (developer mode)

1. Clone or download this repository.
2. Add icon files to an `icons/` folder: `icon16.png`, `icon48.png`, `icon128.png`.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the project folder.

## Permissions

This extension requests **no permissions**. It only injects CSS into `https://mail.google.com/*` and reads the system color scheme — no data is collected or transmitted.

## Privacy

This extension collects no user data whatsoever. All processing happens locally in your browser. See the full [Privacy Policy](PRIVACY.md).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
