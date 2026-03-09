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
      document.documentElement.appendChild(styleTag);
    }
  } else {
    if (styleTag) {
      styleTag.remove();
    }
  }
};

// Initial execution
applyTheme();

// Listen for changes in the system preference (Light/Dark)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// Reapply styles if the DOM changes (Gmail is a SPA)
const observer = new MutationObserver(() => {
  if (!document.getElementById('auto-dark-gmail-styles') && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: false });
