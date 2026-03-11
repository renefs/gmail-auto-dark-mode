# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-03-11

### Added
- `DOMContentLoaded` listener to re-apply the theme once the DOM is fully ready, ensuring the style tag is properly placed inside `<head>` after Gmail's initial setup.
- Jekyll site configuration (`_config.yml`) for the project GitHub Pages site.

### Changed
- Style injection now targets `<head>` when available, falling back to `<html>` at `document_start` when `<head>` does not yet exist.
- `MutationObserver` callback now uses debouncing (50 ms) to avoid excessive calls caused by Gmail's frequent DOM mutations.
- `MutationObserver` `subtree` option changed from `false` to `true` so style removals are detected regardless of whether the style tag lives in `<html>` or `<head>`.
- Extension description updated to better reflect zero-setup and no-permissions nature.
- Files reorganised into an `extension/` subfolder to separate the browser extension from project-level files.
- README expanded with full installation instructions, per-OS dark mode guides, and permissions/privacy sections.
- PRIVACY.md updated with clearer language.

## [1.0.0] - 2026-03-09

### Added
- Initial release of Gmail Auto Dark Mode.
- CSS `filter: invert(1) hue-rotate(180deg)` applied to Gmail when the OS is in dark mode.
- Counter-inversion for images, videos, and canvases to preserve their original appearance.
- Real-time theme switching via the `prefers-color-scheme` media query change event.
- `MutationObserver` to reapply the theme after Gmail's SPA internal navigation.
- Manifest V3 content script targeting `https://mail.google.com/*`.
