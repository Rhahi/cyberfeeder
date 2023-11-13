/** Announce when a command panel has been created.
 *
 * This happens when switching replay views, and when a game starts. */

import * as base from './base';

export const eventName = 'change-panel';

export interface CommandPanel {
  type: 'change-panel';
  root: Element;
}

/** Watch and report command panel change event */
export function watch() {
  const PanelCreationObserver = new MutationObserver(panelCreationHandler);
  document.addEventListener(base.eventName, event => {
    base.conditionalObserver({
      event,
      type: base.eventName,
      targetMode: 'gameview',
      observer: PanelCreationObserver,
      selector: '.right-inner-leftpane',
      observeOptions: {childList: true},
    });
  });
  announce();
}

/** Check if .right-inner-leftpane got a new .button-pane element. If it did, report it. */
function panelCreationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    let done = false;
    m.addedNodes.forEach(node => {
      if (!done) {
        done = announce(node);
      }
    });
  }
}

function announce(node?: Node): boolean {
  let element: Element | null | undefined;
  if (!node) {
    element = document.querySelector('.right-inner-leftpane .button-pane');
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    element = node as Element;
  }
  if (element && element.className === 'button-pane') {
    const data: CommandPanel = {
      type: eventName,
      root: element,
    };
    const event = new CustomEvent(eventName, {detail: data});
    document.dispatchEvent(event);
    return true;
  }
  return false;
}
