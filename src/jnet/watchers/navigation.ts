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
  mode: string;
  root: Element;
}

export const eventName = 'watcher-site';

export function watch() {
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
        const data: Navigation = {mode: page, root: firstChild};
        const event = new CustomEvent<Navigation>(eventName, {detail: data});
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
