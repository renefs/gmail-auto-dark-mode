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
        /* Counter-invert media and specific UI elements to restore original colors */
        img, video, canvas, [style*="background-image"], svg,
        .qj, .at, .ahR {
          filter: invert(1) hue-rotate(180deg) !important;
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
          filter: invert(1) hue-rotate(180deg) !important;
          opacity: 1 !important;
        }
        .gb_tc, .bjK, .ajy, .ajv, .ajz {
          filter: none !important;
        }
      `;
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