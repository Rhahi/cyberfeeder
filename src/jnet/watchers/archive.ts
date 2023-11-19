/**
 * 1. Activate watcher when in Play mode.
 * 2. Watcher watches change in archive. If archive element changes, notify it.
 */

import * as base from './base';

export const eventName = 'change-archive';
const selector = '.discard-container .panel.popup';
const viewChangeObserver = new MutationObserver(m => base.viewChangeHandler(eventName, selector, m));

export interface Archive {
  type: 'change-archive';
  side: 'me' | 'opponent';
  element: Element;
}

const sideWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: viewChangeObserver,
    selector: '.gameview .centralpane',
    observeOptions: {childList: true},
    init: init,
  });
};

export function watch() {
  document.addEventListener(base.eventName, sideWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) sideWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, sideWatcher);
  viewChangeObserver.disconnect();
}

/** A one time event that will prompt new archives */
function init() {
  const me = document.querySelector('.me ' + selector);
  const opponent = document.querySelector('.opponent ' + selector);
  if (me) {
    const data: Archive = {type: eventName, side: 'me', element: me};
    const event = new CustomEvent<Archive>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
  if (opponent) {
    const data: Archive = {type: eventName, side: 'opponent', element: opponent};
    const event = new CustomEvent<Archive>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
}
