# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-07-16

### Fixed
- Dark mode no longer flickers back to a white page while you drag an email to another tab or label.
- Icons and images now keep their true colors in dark mode. Previously some looked faded or slightly off-tint.
- The Google apps menu (the grid icon at the top right) now shows its app icons in their real colors instead of washed-out or wrong ones — for example, YouTube red no longer looks pink and Keep yellow no longer looks brown.

## [1.0.6] - 2026-06-03

### Fixed
- Added Keep, Calendar, Contacts, Tasks, Docs, and Drive domains to the extension manifest matches. This allows the counter-inversion logic to run inside these companion app subframes when loaded in Gmail's side panel, fixing the issue where contact photos and side panel icons were displayed in negative/inverted colors.
- I would have prefered to avoid having so many domains on the manifest, but it is the only solution I found for now since Google uses iframes to load the other apps in Gmail website.

## [1.0.5] - 2026-06-03

### Fixed
- Fixed an issue where the extension incorrectly applied dark-mode styles to standalone Google Chat pages (`chat.google.com`) when accessed directly, while preserving the counter-inversion logic when embedded inside Gmail as a subframe.

## [1.0.4] - 2026-05-29

### Fixed
- Fixed an issue where images in nested subframes (such as chats, email bodies, and the Google Apps Launcher / waffle menu) were not being counter-inverted, causing them to look like negatives. Added `"all_frames": true` and `"match_about_blank": true` along with matching domains (`chat.google.com`, `ogs.google.com`, `ogb.google.com`) to support Gmail's dynamic iframe structure.
- Updated the counter-inversion logic to mathematically invert parent filter adjustments (brightness, contrast, and saturation) to perfectly restore original image and media colors.

## [1.0.3] - 2026-05-27

### Changed
- Shifted to a softer dark mode utilizing brightness, contrast, and saturation filters instead of a strict invert.
- Added explicit background colors, border colors, and box-shadow removals to refine specific Gmail UI elements.
- Improved font rendering in dark mode using anti-aliasing optimizations.
- Fixed the opacity and colors of star icons and importance markers so they display correctly.
- Forced `color-scheme: dark` at the `:root` level for better native compatibility.

## [1.0.2] - 2026-03-22

### Changed
- Improve the visualization of the Gmail label colors

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
