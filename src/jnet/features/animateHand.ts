/**
 * Watch hand. This will detect new cards appearing and disappearing
 * When a card disappears, animate it towards up or down, depending on side.
 */

import {hand} from '../watchers';
import * as debug from '../debug';

const handObserverOpponent = new MutationObserver(m => mutationHandler(m, 'down'));
const handObserverMe = new MutationObserver(m => mutationHandler(m, 'up'));
const mePreviousHand: HandCard[] = [];
const opponentPreviousHand: HandCard[] = [];

interface HandAnimation {
  container: Element;
  index: number;
  target: Element;
}

interface HandCard {
  name: string;
  target: Element;
  animated: boolean;
}

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
  const cacheOrigin = direction === 'up' ? mePreviousHand : opponentPreviousHand;
  const cache = cacheOrigin.slice();
  const queue: HandAnimation[] = [];
  let _container: Element | undefined;
  debug.log('[animateHand] previous cache', cache);

  for (const m of mutations) {
    const container = m.target as Element;
    if (!_container) _container = container;

    m.removedNodes.forEach(async node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const target = node as Element;
      if (!target.classList.contains('card-wrapper')) return;
      if (target.getAttribute('ghost') === 'yes') return;

      const index = getCardIndex(target, cache);
      queue.push({
        container,
        target,
        index,
      });
    });

    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const target = node as Element;
      if (!target.classList.contains('card-wrapper')) return;
      if (target.getAttribute('ghost') === 'yes') return;
      target.addEventListener('click', () => target.setAttribute('animation-clicked', 'yes'), {once: true});
    });
  }

  for (const anim of queue) {
    const ghost = anim.target.cloneNode(true) as HTMLDivElement;
    ghost.setAttribute('ghost', 'yes');
    placeGhost(anim, ghost);
    ghost.classList.add(`animate-${direction}`);
  }
  if (_container) updateCardsInHand(_container, cacheOrigin);
}

function getCardIndex(target: Element, cache: HandCard[]) {
  const name = target.querySelector('.cardname')?.textContent;

  // prioritize clicked items
  for (const [index, card] of cache.entries()) {
    if (card.animated) continue;
    if (card.target.getAttribute('animation-clicked') !== 'yes') continue;
    if (card.name === name) {
      card.animated = true;
      return index;
    }
  }

  // or just matching cards, reverse order.
  for (const [index, card] of cache.entries()) {
    if (card.animated) continue;
    if (card.name === name) {
      card.animated = true;
      return index;
    }
  }
  return -1;
}

function updateCardsInHand(container: Element, cache: HandCard[]) {
  const cards = container.querySelectorAll(':scope .card-wrapper');
  cache.length = 0;
  cards.forEach(card => {
    if (card.getAttribute('ghost') === 'yes') return;
    const name = card.querySelector(':scope .cardname')?.textContent;
    cache.push({
      name: name ? name : '',
      target: card,
      animated: false,
    });
  });
  debug.log('[animateHand] new cache', cache);
}

function placeGhost(anim: HandAnimation, ghost: Element) {
  debug.log('[animateHand] placing hand ghost', anim);
  const target = anim.container.children[anim.index];
  if (!target) {
    anim.container.appendChild(ghost);
  } else {
    anim.container.insertBefore(ghost, target);
  }
  setTimeout(() => anim.container.removeChild(ghost), 200);
}
