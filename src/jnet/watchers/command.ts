/** Announce when a command panel has been created.
 *
 * This happens when switching replay views, and when a game starts. */

import * as base from './base';

export const eventName = 'change-panel';
export interface CommandPanel {
  type: 'change-panel';
  root: Element;
}

const PanelCreationObserver = new MutationObserver(panelCreationHandler);
const sideWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: PanelCreationObserver,
    selector: '.right-inner-leftpane',
    observeOptions: {childList: true},
    init: () => {
      const element = document.querySelector('.right-inner-leftpane .button-pane');
      if (element) announce(element);
    },
  });
};

/** Watch and report command panel change event */
export function watch() {
  document.addEventListener(base.eventName, sideWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) sideWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, sideWatcher);
}

/** Check if .right-inner-leftpane got a new .button-pane element. If it did, report it. */
function panelCreationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    let done = false;
    m.addedNodes.forEach(node => {
      if (!done) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          done = announce(element);
        }
      }
    });
  }
}

function announce(element: Element): boolean {
  if (element.className === 'button-pane') {
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
