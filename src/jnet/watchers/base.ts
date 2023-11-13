/**
 * Watch for user navigation event and fire and event containing the root of the new element.
 */

/**
 * Known items:
 * - gameview (play)
 * - cardbrowser (cards)
 * - container (chat, deckbuilder, lobby)
 * - page-container (help, settings, stats, about)
 *
 * The only interesting item is 'gameview' where cyberfeeder features work.
 */
export interface Navigation {
  type: 'change-menu';
  mode: string;
  root: Element;
}

export interface ConditionalObserverConfig {
  event: Event;
  type: string;
  targetMode: 'gameview' | 'cardbrowser' | 'container' | 'page-container';
  observer: MutationObserver;
  selector: string;
  observeOptions: MutationObserverInit;
}

export interface ConditionalExecuterConfig {
  event: Event;
  type: string;
  targetMode: 'gameview' | 'cardbrowser' | 'container' | 'page-container';
  callback: (enable: boolean) => void;
}

export const eventName = 'change-menu';

/** Enable menu navigation watchers. These will start once at startup and will never stop. */
export function watch() {
  const main = document.querySelector('#main-content #main > .item');
  const scope = 'cyberfeeder';
  if (!main) {
    console.error('[Cyberfeeder] Cannot find main content, scripts will not work.');
    return;
  }
  main.setAttribute(scope, 'watching');
  const siteObserver = new MutationObserver(() => announce(main));
  const toggleObserver = new MutationObserver(() => {
    if (main.getAttribute(scope) !== 'watching') {
      siteObserver.disconnect();
      toggleObserver.disconnect();
      main.removeAttribute(scope);
      console.info('[Cyberfeeder] Stopped watching navigation');
    }
  });
  siteObserver.observe(main, {childList: true});
  toggleObserver.observe(main, {attributes: true});
}

export function conditionalObserver(config: ConditionalObserverConfig) {
  const src = config.event as CustomEvent<Navigation>;
  if (src.detail.type !== config.type) {
    return;
  }
  if (src.detail.mode === config.targetMode) {
    // user has navigated in, start a new watch.
    config.observer.disconnect();
    const element = document.querySelector(config.selector);
    if (element) {
      config.observer.observe(element, config.observeOptions);
    } else {
      console.warn(`[Cyberfeeder] expected to find ${config.selector}, found none`);
    }
  } else {
    // user has navigated away, no more control elements.
    config.observer.disconnect();
  }
}

export function conditionalExecuter(config: ConditionalExecuterConfig) {
  const src = config.event as CustomEvent<Navigation>;
  if (src.detail.type !== config.type) {
    return;
  }
  config.callback(src.detail.mode === config.targetMode);
}

/** Start by firing an event announing current view */
export function announce(mainElement?: Element) {
  const main = mainElement ? mainElement : document.querySelector('#main-content #main > .item');
  if (!main) {
    return;
  }
  const firstChild = main.firstChild as Element;
  const page = firstChild.className ? firstChild.className : 'unknown';
  if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE) {
    const data: Navigation = {type: eventName, mode: page, root: firstChild};
    const event = new CustomEvent<Navigation>(eventName, {detail: data});
    document.dispatchEvent(event);
  } else {
    console.warn('[Cyberfeeder] failed to announce current page (invalid content');
  }
}
