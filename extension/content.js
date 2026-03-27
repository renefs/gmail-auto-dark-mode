/**
 * Detects the system preference and applies the dark style.
 * Implements an observer to react to theme changes in real time.
 */

// Cache the media query to avoid repeated lookups.
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = () => {
  const styleTag = document.getElementById('auto-dark-gmail-styles');

  if (darkModeQuery.matches) {
    if (!styleTag) {
      const newStyleTag = document.createElement('style');
      newStyleTag.id = 'auto-dark-gmail-styles';
      // Selective inversion to simulate Chrome DevTools behavior
      newStyleTag.textContent = `
        html {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        /* Counter-invert media elements so they display with original colors.
           Also counter-inverts label color chips (.qj, .at, .ahR) in the sidebar. */
        img, video, canvas, [style*="background-image"], svg,
        .qj, .at, .ahR {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        /* Gmail top-bar account/app icons (.gb_tc) and attachment thumbnails (.bjK):
           resetting to no filter keeps them looking correct without counter-inversion. */
        .gb_tc, .bjK {
          filter: none !important;
        }
        /* Star icons (.T-KT) and importance markers (.pH, .a9q):
           counter-invert to restore their original yellow/orange colors. */
        .T-KT, .pH, .a9q, .pH.a9q {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
      // Prefer <head> for proper style placement; fall back to <html> at document_start
      // when <head> is not yet available.
      (document.head || document.documentElement).appendChild(newStyleTag);
    }
  } else {
    if (styleTag) styleTag.remove();
  }
};

// Initial execution (may run before <head> exists at document_start)
applyTheme();

// Re-apply once the DOM is ready so the style is properly placed in <head>
// and survives Gmail's initial DOM setup. Then narrow the observer to <head>
// only — no need to watch Gmail's frequent body mutations.
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  observer.disconnect();
  if (darkModeQuery.matches) {
    observer.observe(document.head, { childList: true });
  }
});

// Listen for changes in the system preference (Light/Dark).
// Connect/disconnect the observer as dark mode turns on/off.
darkModeQuery.addEventListener('change', () => {
  applyTheme();
  if (darkModeQuery.matches) {
    // Dark mode just activated: watch for our style tag being removed.
    observer.observe(document.head || document.documentElement, { childList: true });
  } else {
    // Light mode: no style to preserve, so stop observing to save CPU.
    observer.disconnect();
  }
});

// Reapply styles if <head> changes (Gmail is a SPA and may remove injected styles).
// Debouncing avoids excessive calls caused by Gmail's frequent DOM mutations.
// Note: the observer is disconnected in light mode, so no dark-mode check is needed here.
let debounceTimer;
const observer = new MutationObserver(() => {
  if (document.getElementById('auto-dark-gmail-styles')) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyTheme, 50);
});

// Start with broad observation since <head> may not exist yet at document_start.
// Narrowed to <head> only once DOMContentLoaded fires.
observer.observe(document.documentElement, { childList: true, subtree: true });
