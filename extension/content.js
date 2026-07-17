/**
 * Detects the system preference and applies the dark style.
 * Implements an observer and intervals to react to theme changes and DOM updates in real time.
 */

(() => {
  // Helper to determine if we should run in the current frame/page context
  const shouldRun = () => {
    const isTopFrame = window === window.top;
    const host = window.location.hostname;

    if (isTopFrame) {
      // Top-level frame: only run if it is Gmail
      return host.includes('mail.google.');
    } else {
      // Subframe: only run if the parent/ancestor is Gmail
      try {
        if (window.top && window.top.location && window.top.location.hostname.includes('mail.google.')) {
          return true;
        }
      } catch (e) {
        // Ignore cross-origin error
      }

      if (window.location.ancestorOrigins) {
        for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
          if (window.location.ancestorOrigins[i].includes('mail.google.')) {
            return true;
          }
        }
      }

      if (document.referrer && document.referrer.includes('mail.google.')) {
        return true;
      }

      return false;
    }
  };

  if (!shouldRun()) {
    return;
  }

  // Cache the media query to avoid repeated lookups.
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * Exact inverse of the dark filter chain
   * (invert(1) hue-rotate(180deg) brightness(1.2) contrast(0.85) saturate(1.1)).
   * The inverse operations must be applied with reciprocal values in REVERSE
   * order — re-applying them in the same order as the dark filter does not undo
   * it, which washed out icon and image colors. hue-rotate(180deg) is exactly
   * self-inverse (its color matrix squared is the identity), so a plain CSS
   * chain restores original colors exactly for everything inside the displayable
   * range of the dark filter (only extremely saturated reds/yellows retain a
   * small residual, a hard limit of the filter-inversion approach).
   * saturate(1 / 1.1); contrast(1 / 0.85); brightness(1 / 1.2)
   */
  const RESTORE_FILTER =
    'saturate(0.909091) contrast(1.176471) brightness(0.833333) hue-rotate(180deg) invert(1)';

  const isTopFrame = window === window.top;

  // Whether an ANCESTOR Gmail frame currently has dark mode active. Counter-inversion
  // in a subframe must key off this, not the subframe's own prefers-color-scheme:
  // Google serves some embedded widgets (e.g. the app launcher at ogs.google.com)
  // with a forced light color-scheme, so a cross-origin subframe reports light even
  // while the top frame is dark and is visually inverting the whole page (this iframe
  // included). The top frame detects dark correctly and relays it down via postMessage.
  let ancestorDark = false;

  // The dark theme is active in this frame if this frame itself is dark (top frame,
  // or a subframe that honestly reports dark) or an ancestor told us it is dark.
  const isDarkActive = () => (isTopFrame ? darkModeQuery.matches : darkModeQuery.matches || ancestorDark);

  // Only accept dark-state messages from our own origin, other Google frames, or
  // opaque (about:blank / sandboxed) frames. The payload is just a theme boolean.
  const isTrustedOrigin = (origin) => {
    if (!origin || origin === 'null') return true;
    try {
      return new URL(origin).hostname.includes('google.');
    } catch (e) {
      return false;
    }
  };

  // Relay the effective dark state to every child frame (works cross-origin).
  const broadcastDarkToChildren = (dark) => {
    document.querySelectorAll('iframe').forEach(frame => {
      try {
        if (frame.contentWindow) {
          frame.contentWindow.postMessage({ __autoDarkGmail: true, dark }, '*');
        }
      } catch (e) {
        // Ignore frames we cannot post to
      }
    });
  };

  /**
   * Dynamically finds any element with a computed background-image (e.g. set via a CSS class)
   * and applies the counter-inversion class to it.
   */
  const counterInvertDynamicBackgrounds = (doc = document) => {
    const view = doc.defaultView || window;
    const elements = doc.querySelectorAll('div, span, a, li, button, [style*="background"]');
    elements.forEach(el => {
      if (el.classList.contains('auto-dark-counter-invert')) return;
      try {
        const bg = el.style.backgroundImage || view.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          el.classList.add('auto-dark-counter-invert');
        }
      } catch (e) {
        // Ignore stylesheet security or cross-origin access errors
      }
    });
  };

  /**
   * Finds all same-origin subframes and injects the counter-inversion styles
   * directly into their documents. This bypasses Chrome content script injection
   * limitations for dynamic, parent-written blank iframes.
   */
  const injectStylesIntoSubframes = () => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          const styleTag = doc.getElementById('auto-dark-gmail-styles-subframe');
          if (!styleTag) {
            const newStyleTag = doc.createElement('style');
            newStyleTag.id = 'auto-dark-gmail-styles-subframe';
            newStyleTag.textContent = `
              /* Counter-invert media and specific UI elements to restore original colors.
                 Matches elements with inline background styles containing url(), plus our dynamically tagged elements.
                 The url() match requires "background" in the style to avoid matching cursor: url(...)
                 which Gmail sets on <body> during drag & drop (it would flip the whole page to light).
                 RESTORE_FILTER is the exact inverse of the dark filter (reciprocal values, reverse order). */
              img, video, canvas, [style*="background-image"], [style*="background"][style*="url("], svg,
              .qj, .at, .ahR, .auto-dark-counter-invert {
                filter: ${RESTORE_FILTER} !important;
              }
              .T-KT.T-KT-CE, .pH.yX, .WA.xY, .pH.a9q {
                filter: ${RESTORE_FILTER} !important;
                opacity: 1 !important;
              }
            `;
            (doc.head || doc.documentElement).appendChild(newStyleTag);
          }
          // Scan and tag dynamic backgrounds inside this subframe
          counterInvertDynamicBackgrounds(doc);
        }
      } catch (e) {
        // Ignore cross-origin access errors (handled by direct matches injection)
      }
    });
  };

  const applyTheme = () => {
    const styleTag = document.getElementById('auto-dark-gmail-styles');

    if (isDarkActive()) {
      if (!styleTag) {
        const newStyleTag = document.createElement('style');
        newStyleTag.id = 'auto-dark-gmail-styles';

        if (isTopFrame) {
          newStyleTag.textContent = `
            :root {
              color-scheme: dark !important;
            }
            html {
              /* Softer dark: High brightness lifts blacks to grays, lower contrast reduces "void" feel */
              filter: invert(1) hue-rotate(180deg) brightness(1.2) contrast(0.85) saturate(1.1) !important;
              background-color: #f1f3f4 !important;
            }
            * {
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
            }
            .gb_Td, .gb_Vd, .gb_Wd, .S7, .aeN, .z0, .G-atb, .brC-brI, .T-I-KE {
              box-shadow: none !important;
            }
            /* Counter-invert media and specific UI elements to restore original colors.
               Matches elements with inline background styles containing url(), plus our dynamically tagged elements.
                 The url() match requires "background" in the style to avoid matching cursor: url(...)
                 which Gmail sets on <body> during drag & drop (it would flip the whole page to light).
               RESTORE_FILTER is the exact inverse of the dark filter (reciprocal values, reverse order). */
            img, video, canvas, [style*="background-image"], [style*="background"][style*="url("], svg,
            .qj, .at, .ahR, .auto-dark-counter-invert {
              filter: ${RESTORE_FILTER} !important;
            }
            form#aso_search_form_anchor {
              background-color: #e8eaed !important;
              border: 1px solid transparent !important;
            }
            .ae4, .qh, .G-atb, .Ym, .brC-brI, .aeQ, .G-tF {
              border-color: #dadce0 !important;
            }
            .n6, .bhZ.n3, .J-Ke.n0 {
              background-color: #e8f0fe !important;
            }
            .T-KT, .pH, .a9q {
              filter: none !important;
              opacity: 1 !important;
            }
            .T-KT.T-KT-CE, .pH.yX, .WA.xY, .pH.a9q {
              filter: ${RESTORE_FILTER} !important;
              opacity: 1 !important;
            }
            .gb_tc, .bjK, .ajy, .ajv, .ajz {
              filter: none !important;
            }
          `;
        } else {
          // In subframes, we only want to counter-invert media and specific UI elements.
          // We do not apply the global inversion filter to html, because the parent
          // frame is already inverting the entire iframe.
          newStyleTag.textContent = `
            /* Counter-invert media and specific UI elements to restore original colors.
               Matches elements with inline background styles containing url(), plus our dynamically tagged elements.
                 The url() match requires "background" in the style to avoid matching cursor: url(...)
                 which Gmail sets on <body> during drag & drop (it would flip the whole page to light).
               RESTORE_FILTER is the exact inverse of the dark filter (reciprocal values, reverse order). */
            img, video, canvas, [style*="background-image"], [style*="background"][style*="url("], svg,
            .qj, .at, .ahR, .auto-dark-counter-invert {
              filter: ${RESTORE_FILTER} !important;
            }
            .T-KT.T-KT-CE, .pH.yX, .WA.xY, .pH.a9q {
              filter: ${RESTORE_FILTER} !important;
              opacity: 1 !important;
            }
          `;
        }
        (document.head || document.documentElement).appendChild(newStyleTag);
      }
      // Perform dynamic counter-inversion scan
      counterInvertDynamicBackgrounds();
    } else {
      if (styleTag) styleTag.remove();
    }
  };

  // Learn the dark state from an ancestor frame (see ancestorDark), apply it locally,
  // and relay it onward to our own child frames (for deeply nested widgets).
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.__autoDarkGmail !== true || !isTrustedOrigin(event.origin)) return;
    ancestorDark = !!data.dark;
    applyTheme();
    if (isDarkActive()) {
      counterInvertDynamicBackgrounds();
    }
    broadcastDarkToChildren(isDarkActive());
  });

  // Initial execution (may run before <head> exists at document_start)
  applyTheme();

  // Set a safe periodic interval to ensure style permanence, inject styles into subframes,
  // capture dynamically loaded background icons, and keep child frames in sync.
  setInterval(() => {
    applyTheme();
    if (isDarkActive()) {
      counterInvertDynamicBackgrounds();
      if (isTopFrame) {
        injectStylesIntoSubframes();
      }
    }
    broadcastDarkToChildren(isDarkActive());
  }, 500);

  // Re-apply once the DOM is ready so the style is properly placed in <head>
  // and survives Gmail's initial DOM setup. Then narrow the observer to <head>
  // or documentElement.
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    observer.disconnect();
    if (isDarkActive()) {
      observer.observe(document.head || document.documentElement, { childList: true });
      if (isTopFrame) {
        injectStylesIntoSubframes();
      }
    }
    broadcastDarkToChildren(isDarkActive());
  });

  // Listen for changes in the system preference (Light/Dark).
  // Connect/disconnect the observer as dark mode turns on/off, and notify child frames.
  darkModeQuery.addEventListener('change', () => {
    applyTheme();
    if (isDarkActive()) {
      observer.observe(document.head || document.documentElement, { childList: true });
      if (isTopFrame) {
        injectStylesIntoSubframes();
      }
    } else {
      observer.disconnect();
    }
    broadcastDarkToChildren(isDarkActive());
  });

  // Reapply styles if <head> changes (Gmail is a SPA and may remove injected styles).
  // Debouncing avoids excessive calls caused by Gmail's frequent DOM mutations.
  let debounceTimer;
  const observer = new MutationObserver(() => {
    if (document.getElementById('auto-dark-gmail-styles')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyTheme, 50);
  });

  // Start with broad observation since <head> may not exist yet at document_start.
  // Narrowed to <head> or documentElement once DOMContentLoaded fires.
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();