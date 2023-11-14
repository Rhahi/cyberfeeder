/**
 * 1. Receive new hand container
 * 2. Start watching its indicator. On change, apply hand size reminder
 */

import {hand} from '../watchers';

const regex = /\(\d+\/(\d+)\)/;
const indicatorObserverOpponent = new MutationObserver(indicatorHandler);
const indicatorObserverMe = new MutationObserver(indicatorHandler);

const newHandHandler = (e: Event) => {
  const event = e as CustomEvent<hand.Hand>;
  if (!event.detail || event.detail.type !== hand.eventName) {
    return;
  }
  const container = event.detail.element;
  const indicator = container.querySelector(':scope > .header');
  if (!indicator) {
    return;
  }
  if (event.detail.side === 'me') {
    indicatorObserverMe.disconnect();
    indicatorObserverMe.observe(indicator, {subtree: true, characterData: true});
    return;
  }
  if (event.detail.side === 'opponent') {
    indicatorObserverOpponent.disconnect();
    indicatorObserverOpponent.observe(indicator, {subtree: true, characterData: true});
    return;
  }
};

export function enable() {
  document.addEventListener(hand.eventName, newHandHandler);
  hand.init();
}

export function disable() {
  document.removeEventListener(hand.eventName, newHandHandler);
}

function updateHandsize(container: Element, handsize: number) {
  if (handsize < 5 && handsize >= 0) {
    container.setAttribute('handsize', handsize.toString());
  } else {
    container.removeAttribute('handsize');
  }
}

function getHandsizeNumber(text: string | null) {
  if (text) {
    const result = text.match(regex);
    if (result && result.length === 2) {
      try {
        return parseInt(result[1]);
      } catch {
        // do nothing
      }
    }
  }
  console.warn('[Cyberfeeder] Failed to parse hand size, no reminder will be showed');
  return 5;
}

function indicatorHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    if (m.target.nodeType === Node.TEXT_NODE) {
      const text = m.target.textContent;
      const indicator = m.target.parentElement;
      const container = indicator?.parentElement;
      if (indicator && container) {
        const handsize = getHandsizeNumber(text);
        updateHandsize(container, handsize);
      }
    }
  }
}
