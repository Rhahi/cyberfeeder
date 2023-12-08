import {isFullyDown} from './newMessageIndicator';
import * as base from '../watchers/base';

const observer = new ResizeObserver(resizeHandler);
// wasn't able to find a way to persist side effects without using these lets.
let shouldScroll = false;
let chat: Element | null = null;
let prevDivSize = 0;

const menuWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: observer,
    selector: '.panel > .log > .messages',
    observeOptions: {childList: true},
    init: selector => {
      const div = document.querySelector(selector);
      if (div) {
        chat = div;
      }
    },
  });
};

export function enable() {
  document.addEventListener(base.eventName, menuWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) menuWatcher(localEvent);
}

export function disable() {
  document.removeEventListener(base.eventName, menuWatcher);
  observer.disconnect();
}

function resizeHandler(entries: ResizeObserverEntry[]) {
  if (!chat) return;
  for (const entry of entries) {
    const size = entry.borderBoxSize[0].blockSize;
    if (size > prevDivSize) {
      // div got larger, save scroll state.
      shouldScroll = isFullyDown(chat);
    } else {
      // div got smaller, correct scroll if we should.
      if (shouldScroll) {
        chat.scrollTop = chat.scrollHeight;
      }
    }
    prevDivSize = size;
    break;
  }
}
