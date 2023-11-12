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
  type: 'change-menu' | 'change-panel';
  mode: string;
  root: Element;
}
export const changeMenu = 'change-menu';
export const changePanel = 'change-panel';

/** Enable menu navigation watchers. These will start once at startup and will never stop. */
export function enable() {
  enableNavigationWatcher();
  enablePanelCreationWatcher();
}

/** Watch and report main menu navigation event */
function enableNavigationWatcher() {
  const main = document.querySelector('#main-content #main > .item');
  const scope = 'cyberfeeder';
  if (!main) {
    console.error('[Cyberfeeder] Cannot find main content, scripts will not work.');
    return;
  }
  main.setAttribute(scope, 'watching');
  const siteObserver = new MutationObserver(() => {
    let page = 'unknown';
    const firstChild = main.firstChild as Element;
    if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE) {
      if (firstChild.className) {
        page = firstChild.className;
        const data: Navigation = {type: changeMenu, mode: page, root: firstChild};
        const event = new CustomEvent<Navigation>(changeMenu, {detail: data});
        document.dispatchEvent(event);
      }
    }
  });
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

/** Watch and report command panel change event */
function enablePanelCreationWatcher() {
  const PanelCreationObserver = new MutationObserver(panelCreationHandler);
  document.addEventListener(changeMenu, (e: Event) => {
    const src = e as CustomEvent<Navigation>;
    if (src.detail.type !== changeMenu) {
      return;
    }
    if (src.detail.mode === 'gameview') {
      // user has navigated in, start a new watch.
      PanelCreationObserver.disconnect();
      const pane = document.querySelector('.right-inner-leftpane');
      if (pane) {
        PanelCreationObserver.observe(pane, {childList: true});
      } else {
        console.warn('[Cyberfeeder] expected to find right-inner-leftpane, found none');
      }
    } else {
      // user has navigated away, no more control elements.
      PanelCreationObserver.disconnect();
    }
  });
}

/** Check if .right-inner-leftpane got a new .button-pane element. If it did, report it. */
function panelCreationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    let done = false;
    m.addedNodes.forEach(node => {
      if (done) {
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.className === 'button-pane') {
          const data: Navigation = {
            type: changePanel,
            mode: 'gameview',
            root: element,
          };
          const event = new CustomEvent(changePanel, {detail: data});
          document.dispatchEvent(event);
          done = true;
        }
      }
    });
  }
}
