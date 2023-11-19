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
  init?: (selector: string) => void;
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

/** Helper function to setup a conditional observer.
 *
 * The observer passed to this function will only activate when the view is selected.
 *
 * This will start an observer but will not fire anything until a new view change has been made.
 * To create an initial notification, create a navigation event and "fire" it locally.
 *
 * init() config variable can be used for such initialization task.
 */
export function conditionalObserver(config: ConditionalObserverConfig) {
  const src = config.event as CustomEvent<Navigation>;
  if (src.detail.type !== config.type) {
    return;
  }
  if (src.detail.mode === config.targetMode) {
    if (config.init) config.init(config.selector);
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

/** Create a navigation event without actually firing it globally, so that it can be passed on. */
export function createNavigationEvent() {
  const main = document.querySelector('#main-content #main > .item');
  if (main) {
    const firstChild = main.firstChild as Element;
    const page = firstChild.className ? firstChild.className : 'unknown';
    if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE) {
      const data: Navigation = {type: eventName, mode: page, root: firstChild};
      const event = new CustomEvent<Navigation>(eventName, {detail: data});
      return event;
    }
  }
  return;
}

/** Start by firing an event announing current view */
export function announce(main: Element) {
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

export function viewChangeHandler(type: string, selector: string, mutations: MutationRecord[]) {
  let me: Element | undefined;
  let opponent: Element | undefined;

  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const targetElement = element.querySelector(selector);
        if (!targetElement) {
          return;
        }
        if (element.classList.contains('me')) {
          me = targetElement;
          return;
        }
        if (element.classList.contains('opponent')) {
          opponent = targetElement;
          return;
        }
      }
    });
  }
  const {meEvent, opponentEvent} = createViewChageEvents(type, me, opponent);
  if (meEvent) document.dispatchEvent(meEvent);
  if (opponentEvent) document.dispatchEvent(opponentEvent);
}

/** Create a view change with target reporting new .me and .opponent divs without actually firing them */
export function createViewChageEvents(type: string, me?: Element | null, opponent?: Element | null) {
  let meEvent: CustomEvent<unknown> | undefined;
  let opponentEvent: CustomEvent<unknown> | undefined;
  if (me) {
    const data: unknown = {type, side: 'me', element: me};
    const event = new CustomEvent<unknown>(eventName, {detail: data});
    meEvent = event;
  }
  if (opponent) {
    const data: unknown = {type, side: 'opponent', element: opponent};
    const event = new CustomEvent<unknown>(eventName, {detail: data});
    opponentEvent = event;
  }
  return {meEvent, opponentEvent};
}
