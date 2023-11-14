import * as archive from '../watchers/archive';

export const archiveEvent = 'new-chat';
const selector = '.discard-container .panel.popup';
const archiveObserverOpponent = new MutationObserver(newCardHandler('opponent'));
const archiveObserverMe = new MutationObserver(newCardHandler('me'));

interface Card {
  div: Element;
  name: string;
}

const newArchiveHandler = (e: Event) => {
  const event = e as CustomEvent<archive.Archive>;
  if (!event.detail || event.detail.type !== archive.eventName) {
    return;
  }
  if (event.detail.side === 'me') {
    archiveObserverMe.disconnect();
    archiveObserverMe.observe(event.detail.element, {childList: true, subtree: true});
    assignOrders(event.detail.element);
    return;
  }
  if (event.detail.side === 'opponent') {
    archiveObserverOpponent.disconnect();
    archiveObserverOpponent.observe(event.detail.element, {childList: true, subtree: true});
    assignOrders(event.detail.element);
    return;
  }
};

const keyDownWatcher = (ev: KeyboardEvent) => {
  if (ev.key === 'Control') {
    setFlex();
  }
};

const keyUpWatcher = (ev: KeyboardEvent) => {
  if (ev.key === 'Control') {
    unsetFlex();
  }
};

export function enable() {
  document.addEventListener(archive.eventName, newArchiveHandler);
  document.addEventListener('keydown', keyDownWatcher);
  document.addEventListener('keyup', keyUpWatcher);
}

export function disable() {
  archiveObserverMe.disconnect();
  archiveObserverOpponent.disconnect();
  document.removeEventListener(archive.eventName, newArchiveHandler);
  document.removeEventListener('keydown', keyDownWatcher);
  document.removeEventListener('keyup', keyUpWatcher);
}

function newCardHandler(side: 'me' | 'opponent') {
  const sel = side === 'me' ? '.me ' + selector : '.opponent ' + selector;
  return () => {
    const discard = document.querySelector(sel);
    if (!discard) {
      console.warn('[Cyberfeeder] Could not find discard pile, archive sorting will not work');
      return;
    }
    assignOrders(discard);
  };
}

function assignOrders(container: Element) {
  const cards: Card[] = [];
  container.childNodes.forEach((childNode, i) => {
    if (i === 0) {
      // first item is a UI element, do not assign order to this one.
      return;
    }
    if (childNode && childNode.nodeType === Node.ELEMENT_NODE) {
      const div = childNode as Element;
      const span = div.querySelector(':scope .card > span.cardname');
      const cardName = span?.textContent;
      const card = cardName ? {div: div, name: cardName} : {div: div, name: ''};
      cards.push(card);
    }
  });
  cards.sort((a, b) => {
    if (a.name === '' && b.name === '') return 0;
    if (a.name === '') return 1;
    if (b.name === '') return -1;
    return a.name.localeCompare(b.name);
  });
  for (const [index, card] of cards.entries()) {
    card.div.setAttribute('style', `order: ${index + 1}`);
  }
}

function setFlex() {
  const containers = document.querySelectorAll(selector);
  containers.forEach(container => {
    const oldStyle = container.getAttribute('style');
    if (oldStyle?.includes('display: block;')) {
      container.setAttribute('style', 'display: flex; flex-wrap: wrap;');
    }
  });
}

function unsetFlex() {
  const containers = document.querySelectorAll(selector);
  containers.forEach(container => {
    const oldStyle = container.getAttribute('style');
    if (oldStyle?.includes('flex;')) {
      container.setAttribute('style', 'display: block;');
    }
  });
}
