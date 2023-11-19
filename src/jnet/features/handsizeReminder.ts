/**
 * 1. Receive new hand container
 * 2. Start watching its indicator. On change, apply hand size reminder
 */

import {hand} from '../watchers';

const regex = /\(\d+\/(\d+)\)/;
const indicatorObserverOpponent = new MutationObserver(mutationHandler);
const indicatorObserverMe = new MutationObserver(mutationHandler);

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
    indicatorHandler(indicator, container);
    indicatorObserverMe.observe(indicator, {subtree: true, characterData: true});
    return;
  }
  if (event.detail.side === 'opponent') {
    indicatorObserverOpponent.disconnect();
    indicatorHandler(indicator, container);
    indicatorObserverOpponent.observe(indicator, {subtree: true, characterData: true});
    return;
  }
};

export function enable() {
  document.addEventListener(hand.eventName, newHandHandler);
  const {meEvent, opponentEvent} = hand.getEvent();
  if (meEvent) newHandHandler(meEvent);
  if (opponentEvent) newHandHandler(opponentEvent);
}

export function disable() {
  document.removeEventListener(hand.eventName, newHandHandler);
  indicatorObserverMe.disconnect();
  indicatorObserverOpponent.disconnect();
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

function mutationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    if (m.target.nodeType === Node.TEXT_NODE) {
      indicatorHandler(m.target);
    }
  }
}

function indicatorHandler(node: Node, container?: Element | null) {
  if (!node) return;
  const text = node.textContent;
  if (!container) {
    const indicator = node.parentElement;
    container = indicator?.parentElement;
  }
  if (container) {
    const handsize = getHandsizeNumber(text);
    updateHandsize(container, handsize);
  }
}
