/**
 * Detects the system preference and applies the dark style.
 * Implements an observer to react to theme changes in real time.
 */

const applyTheme = () => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let styleTag = document.getElementById('auto-dark-gmail-styles');

  if (isDarkMode) {
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'auto-dark-gmail-styles';
      // Selective inversion to simulate Chrome DevTools behavior
      styleTag.textContent = `
        html {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        /* Prevents images and videos from appearing inverted */
        img, video, canvas, [style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        /* Specific adjustment for Gmail icons to maintain visibility */
        .gb_tc, .bjK {
          filter: none !important;
        }
        /* Restore original colors for stars and importance arrows (counter-invert) */
        .T-KT, .pH, .a9q {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
      // Prefer <head> for proper style placement; fall back to <html> at document_start
      // when <head> is not yet available.
      (document.head || document.documentElement).appendChild(styleTag);
    }
  } else {
    if (styleTag) {
      styleTag.remove();
    }
  }
};

// Initial execution (may run before <head> exists at document_start)
applyTheme();

// Re-apply once the DOM is ready so the style is properly placed in <head>
// and survives Gmail's initial DOM setup.
document.addEventListener('DOMContentLoaded', applyTheme);

// Listen for changes in the system preference (Light/Dark)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// Reapply styles if the DOM changes (Gmail is a SPA and may remove injected styles).
// subtree:true ensures we detect removals whether the style lives in <html> or <head>.
// Debouncing avoids excessive calls caused by Gmail's frequent DOM mutations.
let debounceTimer;
const observer = new MutationObserver(() => {
  if (!window.matchMedia('(prefers-color-scheme: dark)').matches) return;
  if (document.getElementById('auto-dark-gmail-styles')) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyTheme, 50);
});

observer.observe(document.documentElement, { childList: true, subtree: true });
