/**
 * Watch hand. This will detect new cards appearing and disappearing
 * When a card disappears, animate it towards up or down, depending on side.
 */

import {hand} from '../watchers';
import * as debug from '../debug';

const animateAttribute = 'cyberfeeder-animate';
const handObserverOpponent = new MutationObserver(m => mutationHandler(m, 'down'));
const handObserverMe = new MutationObserver(m => mutationHandler(m, 'up'));
const mePreviousHand: string[] = [];
const opponentPreviousHand: string[] = [];

export function enable() {
  debug.log('Animate hand enabled');
  document.addEventListener(hand.eventName, newHandHandler);
  const {meEvent, opponentEvent} = hand.getEvent();
  if (meEvent) newHandHandler(meEvent);
  if (opponentEvent) newHandHandler(opponentEvent);
}

export function disable() {
  debug.log('Animate hand disabled');
  document.removeEventListener(hand.eventName, newHandHandler);
  handObserverMe.disconnect();
  handObserverOpponent.disconnect();
}

/** Fire when hadn has been changed due to navigation or side switches. Restart. */
const newHandHandler = (e: Event) => {
  const event = e as CustomEvent<hand.Hand>;
  if (!event.detail || event.detail.type !== hand.eventName) {
    return;
  }
  const container = event.detail.element;

  if (event.detail.side === 'me') {
    handObserverMe.disconnect();
    handObserverMe.observe(container, {subtree: true, childList: true});
    return;
  }
  if (event.detail.side === 'opponent') {
    handObserverOpponent.disconnect();
    handObserverOpponent.observe(container, {subtree: true, childList: true});
    return;
  }
};

function mutationHandler(mutations: MutationRecord[], direction: 'up' | 'down') {
  const cache = direction === 'up' ? mePreviousHand : opponentPreviousHand;

  for (const m of mutations) {
    const container = m.target as Element;

    m.removedNodes.forEach(async node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const removed = node as Element;
      if (!removed.classList.contains('card-wrapper')) return;
      if (removed.getAttribute(animateAttribute) === 'animated') return;

      const shadow = createShadow(removed, cache);
      placeShadow(container, shadow.element, shadow.index);
      updateCardsInHand(container, cache);
      shadow.element.classList.add(`animate-${direction}`);
      setTimeout(() => container.removeChild(shadow.element), 200);
    });

    if (m.addedNodes.length > 0) {
      updateCardsInHand(container, cache);
    }
  }
}

function updateCardsInHand(container: Element, cache: string[]) {
  const names = container.querySelectorAll(':scope .cardname');
  cache.length = 0;
  names.forEach(div => {
    cache.push(div.textContent || '');
  });
  debug.log(cache);
}

function createShadow(removed: Element, cache: string[]) {
  const shadow = removed.cloneNode(true) as HTMLDivElement;
  shadow.setAttribute(animateAttribute, 'animated');
  const name = removed.querySelector(':scope .cardname')?.textContent || '';
  const idx = cache.indexOf(name);
  return {element: shadow, index: idx};
}

function placeShadow(parent: Element, shadow: Element, idx: number) {
  debug.log(parent);
  debug.log(parent.children);
  const target = parent.children[idx];
  if (!target) {
    parent.appendChild(shadow);
  } else {
    parent.insertBefore(shadow, target);
  }
}
