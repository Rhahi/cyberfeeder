/**
 * 1. Activate watcher when in Play mode.
 * 2. Watcher watches change in archive. If archive element changes, notify it.
 */

import * as base from './base';

export const eventName = 'change-archive';
const viewChangeObserver = new MutationObserver(viewChangeHandler);

export interface Archive {
  type: 'change-archive';
  side: 'me' | 'opponent';
  element: Element;
}

const archiveWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: viewChangeObserver,
    selector: '.gameview .centralpane',
    observeOptions: {childList: true},
  });
};

function viewChangeHandler(mutations: MutationRecord[]) {
  let me: Element | undefined;
  let opponent: Element | undefined;

  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.classList.contains('me')) {
          me = element;
          return;
        }
        if (element.classList.contains('opponent')) {
          opponent = element;
          return;
        }
      }
    });
  }
  if (me) {
    const data: Archive = {type: 'change-archive', side: 'me', element: me};
    const event = new CustomEvent<Archive>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
  if (opponent) {
    const data: Archive = {type: 'change-archive', side: 'opponent', element: opponent};
    const event = new CustomEvent<Archive>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
}

export function watch() {
  document.addEventListener(base.eventName, archiveWatcher);
}

export function stop() {
  document.removeEventListener(base.eventName, archiveWatcher);
}
