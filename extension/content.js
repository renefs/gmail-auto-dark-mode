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

  /**
   * Gmail's UI glyphs (checkboxes, toolbar icons, chevrons) are monochrome PNG sprites
   * served from gstatic icon paths. They are drawn for a light background, so
   * counter-inverting them keeps them dark on a dark surface. The list checkbox sprite
   * averages rgb(68, 71, 70), which leaves 1.49:1 against the dark background, and only
   * 1.13:1 while .oZ-jc dims the resting checkbox to opacity 0.32. Letting the page-wide
   * invert handle them instead gives 7.12:1.
   *
   * A light asset would be the obvious alternative, but the nv100/nv200/nv300/nv600/white
   * variants of those sprite URLs all 404.
   *
   * The path alone is not enough to tell them apart, because colored artwork lives there
   * too. Google encodes the tone in the file name, so the match is restricted to the
   * single-dark-color tokens: 27 sprites on a loaded inbox carry nv700, a handful carry
   * black, grey600, gm_grey or p900, and label_important_fill_googyellow500 is colored and
   * has to keep its counter-inversion. Unknown tokens fall through to previous behavior,
   * as do avatars and inline photos from googleusercontent.com.
   */
  const MONOCHROME_UI_ICON_URL =
    /gstatic\.com\/(?:ui\/v1\/icons|images\/icons)\/[^"')]*_(?:nv\d{3}|p900|black|grey\d{3}|gm_grey)_/;

  /**
   * The input tools sprite sheet carries no color token in its name, so the rule above
   * cannot classify it, but it is measurably greyscale: of 11667 opaque pixels in
   * ita_sprite8.png not one has a channel spread above 30, and the mean is rgb(89, 89, 89).
   * It backs the keyboard glyphs in the input language menu, ten elements on a loaded page.
   */
  const GREYSCALE_SPRITE_URL = /gstatic\.com\/inputtools\/images\//;

  /**
   * CSS that restores original colors on media and a handful of specific Gmail UI
   * elements after the page-wide dark filter has inverted everything.
   *
   * The selectors like .qj, .at, .ahR and .T-KT are Gmail's own minified (and
   * therefore unstable) class names for things such as attachment chips and preview
   * tiles. If a future Gmail update renames them, those elements simply fall back to
   * the inverted look — nothing breaks.
   *
   * This block is identical in the top frame and in subframes, so it lives here and
   * is reused everywhere instead of being copied into each style tag.
   */
  const COUNTER_INVERT_CSS = `
    /* Counter-invert media and background images so they keep their true colors.
       Matches <img>/<video>/<canvas>/<svg>, elements with an inline background image,
       and anything we tag with .auto-dark-counter-invert at runtime.
       The url() match also requires "background" in the style to avoid matching
       cursor: url(...), which Gmail sets on <body> during drag & drop (matching it
       would flip the whole page back to light).
       Everything carrying .auto-dark-keep-inverted drops out again. Elements reach this rule
       through four different paths (inline style, the svg tag, Gmail's own class names, and
       the runtime tag), so the exemption sits on the whole block rather than on each path.
       See MONOCHROME_UI_ICON_URL and isMonochromeDarkIcon for what earns it. */
    :is(img, video, canvas,
        [style*="background-image"], [style*="background"][style*="url("],
        svg, .qj, .at, .ahR,
        .auto-dark-counter-invert):not(.auto-dark-keep-inverted) {
      filter: ${RESTORE_FILTER} !important;
    }
    /* Attachment chips / preview tiles that Gmail also dims via opacity — restore that too. */
    :is(.T-KT.T-KT-CE, .pH.yX, .WA.xY, .pH.a9q):not(.auto-dark-keep-inverted) {
      filter: ${RESTORE_FILTER} !important;
      opacity: 1 !important;
    }
  `;

  /**
   * The full stylesheet for the top Gmail frame. It applies the page-wide dark
   * filter, then layers COUNTER_INVERT_CSS and a few Gmail-specific tweaks on top.
   * Subframes use COUNTER_INVERT_CSS alone, since the top frame already inverts them.
   */
  const TOP_FRAME_CSS = `
    :root {
      /* Light on purpose, not dark. The page-wide invert below is the only source of
         darkness. Declaring dark makes Gmail's Material components render themselves dark,
         and the filter then inverts that a second time. Disabled buttons come out as light
         blocks on a dark page and their label drops to 1.29:1, against 1.98:1 with light.
         Scrollbars and native form controls behave the same way. */
      color-scheme: light !important;
    }
    html {
      /* Softer dark: high brightness lifts blacks to grays, lower contrast reduces the "void" feel. */
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
    ${COUNTER_INVERT_CSS}
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
    /* Neutralize the filter on toolbar/attachment controls in their default state.
       Their active state (.T-KT-CE etc.) is handled by COUNTER_INVERT_CSS above. */
    .T-KT, .pH, .a9q {
      filter: none !important;
      opacity: 1 !important;
    }
    .gb_tc, .bjK, .ajy, .ajv, .ajz {
      filter: none !important;
    }
  `;

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
   * Most of Gmail's chrome (help, settings, navigation, toolbar) is inline SVG filled with
   * one dark tone, rgb(68, 71, 70), the same color as the PNG sprites. Counter-inverting it
   * leaves those icons dark on a dark surface, so they get tagged here and excluded from
   * the svg rule in COUNTER_INVERT_CSS.
   *
   * Multi-color and gradient artwork fails this test and keeps its counter-inversion. That
   * covers the account avatar, the Gemini mark and product logos. The check is strict on
   * purpose: one opaque color across every fill and stroke, dark enough that inverting it
   * lands on a light tone. Anything ambiguous falls back to the previous behavior.
   *
   * An embedded <image> only disqualifies an icon when it actually has a source. The app
   * launcher ships an empty 24x24 <image> placeholder next to its single dark path, and
   * treating that as raster artwork left the grid dark.
   */
  const RGB_PARTS = /[\d.]+/g;

  const parsePaint = (value) => {
    if (!value || value === 'none' || value.includes('url(')) return null;
    const parts = value.match(RGB_PARTS);
    if (!parts) return null;
    const alpha = parts[3] !== undefined ? Number(parts[3]) : 1;
    if (alpha < 0.05) return null;
    return parts.slice(0, 3).map(Number);
  };

  const relativeLuminance = ([r, g, b]) => {
    const [rs, gs, bs] = [r, g, b].map(channel => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const isMonochromeDarkIcon = (svg, view) => {
    if (svg.querySelector('linearGradient, radialGradient, pattern')) return false;
    for (const img of svg.querySelectorAll('image')) {
      if ((img.getAttribute('href') || img.getAttribute('xlink:href') || '').trim()) return false;
    }
    const nodes = [svg, ...svg.querySelectorAll('path, circle, rect, polygon, ellipse, line, polyline, g')];
    const colors = [];
    for (const node of nodes) {
      const style = view.getComputedStyle(node);
      for (const paint of [style.fill, style.stroke]) {
        if (paint && paint.includes('url(')) return false;
        const color = parsePaint(paint);
        if (color) colors.push(color);
      }
    }
    if (!colors.length) return false;
    if (new Set(colors.map(c => c.join(','))).size > 1) return false;
    return relativeLuminance(colors[0]) < 0.5;
  };

  /**
   * Tags monochrome dark SVG icons once so the 500 ms interval does not re-measure the
   * whole icon set on every tick.
   */
  const keepMonochromeIconsInverted = (doc = document) => {
    const view = doc.defaultView || window;
    doc.querySelectorAll('svg').forEach(svg => {
      if (svg.dataset.autoDarkIconChecked) return;
      try {
        svg.dataset.autoDarkIconChecked = '1';
        if (isMonochromeDarkIcon(svg, view)) {
          svg.classList.add('auto-dark-keep-inverted');
        }
      } catch (e) {
        // Ignore cross-origin or detached node errors
      }
    });
  };

  /**
   * A 1x1 transparent spacer GIF is not artwork. Gmail sets one as the background image of
   * the search input, and counter-inverting on that basis turned the typed query dark on a
   * dark field while the autocomplete suffix, which lives in a separate element, stayed
   * light. Form fields are exempt for the same reason: their text matters, and a background
   * image on them is decoration at most.
   *
   * Gmail also builds icon buttons as an <img> pointing at cleardot.gif with the real glyph
   * in background-image. All 35 such images on a loaded inbox are 1x1, so an img that small
   * carries no artwork of its own and the background decides. The pagination chevrons are
   * the visible case: the img rule matched them directly and the tagging never reached them,
   * because it only walks div, span, a, li and button.
   */
  const PLACEHOLDER_BG_URL = /data:image\/gif;base64,R0lGODlhAQABA/;
  const TEXT_ENTRY_TAG = /^(?:input|textarea|select)$/;

  const carriesNoImageOfItsOwn = (el) => el.naturalWidth <= 1 && el.naturalHeight <= 1;

  const keepsItsOwnColors = (el, bg) => {
    const tag = el.tagName.toLowerCase();
    if (TEXT_ENTRY_TAG.test(tag)) return true;
    if (PLACEHOLDER_BG_URL.test(bg)) return true;
    if (GREYSCALE_SPRITE_URL.test(bg)) return true;
    if (!MONOCHROME_UI_ICON_URL.test(bg)) return false;
    return tag !== 'img' || carriesNoImageOfItsOwn(el);
  };

  /**
   * Dynamically finds any element with a computed background-image (e.g. set via a CSS class)
   * and tags it: monochrome gstatic sprites get the exemption, everything else gets the
   * counter-inversion.
   */
  const counterInvertDynamicBackgrounds = (doc = document) => {
    const view = doc.defaultView || window;
    const elements = doc.querySelectorAll('div, span, a, li, button, img, [style*="background"]');
    elements.forEach(el => {
      if (el.classList.contains('auto-dark-counter-invert') || el.classList.contains('auto-dark-keep-inverted')) return;
      // An img that has not finished loading reports 0x0, which would look like a spacer.
      // Skip it and let the next interval tick classify it.
      if (el.tagName.toLowerCase() === 'img' && !el.complete) return;
      try {
        const bg = el.style.backgroundImage || view.getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none' || !bg.includes('url(')) return;
        el.classList.add(keepsItsOwnColors(el, bg) ? 'auto-dark-keep-inverted' : 'auto-dark-counter-invert');
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
            newStyleTag.textContent = COUNTER_INVERT_CSS;
            (doc.head || doc.documentElement).appendChild(newStyleTag);
          }
          // Scan and tag dynamic backgrounds inside this subframe
          counterInvertDynamicBackgrounds(doc);
          keepMonochromeIconsInverted(doc);
        }
      } catch (e) {
        // Ignore cross-origin access errors (handled by direct matches injection)
      }
    });
  };

  const applyTheme = () => {
    const styleTag = document.getElementById('auto-dark-gmail-styles');

    // Dark mode off: tear down our style tag (if any) and stop.
    if (!isDarkActive()) {
      if (styleTag) styleTag.remove();
      return;
    }

    // Dark mode on: make sure our style tag exists. The top frame gets the full
    // stylesheet; subframes get COUNTER_INVERT_CSS only, since the top frame is
    // already inverting the whole iframe for them.
    if (!styleTag) {
      const newStyleTag = document.createElement('style');
      newStyleTag.id = 'auto-dark-gmail-styles';
      newStyleTag.textContent = isTopFrame ? TOP_FRAME_CSS : COUNTER_INVERT_CSS;
      (document.head || document.documentElement).appendChild(newStyleTag);
    }

    // Tag any elements whose background image is set via a CSS class so they get counter-inverted too.
    counterInvertDynamicBackgrounds();
    keepMonochromeIconsInverted();
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