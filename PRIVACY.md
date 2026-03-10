---
layout: default
title: Privacy Policy
---

# Privacy Policy — Gmail Auto Dark Mode

**Last updated: March 9, 2026**

## Overview

Gmail Auto Dark Mode is a Chrome extension that applies a dark mode CSS filter to Gmail based on your system's color scheme preference. This policy explains what data the extension does and does not collect.

## Data collection

This extension collects **no data** of any kind. Specifically:

- It does not read, store, or transmit any email content.
- It does not collect any personally identifiable information (PII).
- It does not track browsing behavior or history.
- It does not use cookies or any form of local/session storage.
- It does not communicate with any external server or third-party service.

## How the extension works

The extension only injects a CSS filter into `https://mail.google.com/*` to change the visual appearance of Gmail. It reads the OS-level color scheme preference (`prefers-color-scheme`) to decide whether to apply dark mode. All processing happens entirely within your browser.

## Permissions

The extension declares a single host permission (`https://mail.google.com/*`) solely to allow the CSS injection. No other permissions are requested.

## Changes to this policy

If this policy is updated, the new version will be published in this repository with an updated date.

## Contact

If you have any questions about this privacy policy, please open an issue in the [GitHub repository]({{ site.github.repository_url }}/issues).
