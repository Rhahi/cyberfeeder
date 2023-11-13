import * as base from '../watchers/base';

export const archiveEvent = 'new-chat';
const selector = '.discard-container .panel.popup';
const archiveObserverOpponent = new MutationObserver(archiveHandler('opponent'));
const archiveObserverMe = new MutationObserver(archiveHandler('me'));

interface Card {
  div: Element;
  name: string;
}

const announcerOpponent = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: archiveObserverOpponent,
    selector: '.opponent ' + selector,
    observeOptions: {childList: true, subtree: true},
  });
};

const announcerMe = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: archiveObserverMe,
    selector: '.me ' + selector,
    observeOptions: {childList: true, subtree: true},
  });
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
  document.addEventListener(base.eventName, announcerOpponent);
  document.addEventListener(base.eventName, announcerMe);
  document.addEventListener('keydown', keyDownWatcher);
  document.addEventListener('keyup', keyUpWatcher);
}

export function disable() {
  document.removeEventListener(base.eventName, announcerOpponent);
  document.removeEventListener(base.eventName, announcerMe);
  document.removeEventListener('keydown', keyDownWatcher);
  document.removeEventListener('keyup', keyUpWatcher);
}

function archiveHandler(side: 'me' | 'opponent') {
  const selector = side === 'me' ? '.me .discard-container .panel.popup' : '.opponent .discard-container .panel.popup';
  return () => {
    const discard = document.querySelector(selector);
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
