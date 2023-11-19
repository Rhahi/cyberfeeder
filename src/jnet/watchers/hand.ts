import * as base from './base';

export const eventName = 'change-hand';
const selector = '.hand-container .panel.hand';
const viewChangeObserver = new MutationObserver(m => base.viewChangeHandler(eventName, selector, m));

export interface Hand {
  type: 'change-hand';
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
  const me = document.querySelector('.me ' + selector);
  const opponent = document.querySelector('.opponent ' + selector);
  const {meEvent, opponentEvent} = base.createViewChageEvents(eventName, me, opponent);
  if (meEvent) sideWatcher(meEvent);
  if (opponentEvent) sideWatcher(opponentEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, sideWatcher);
}

function init() {
  const me = document.querySelector('.me ' + selector);
  const opponent = document.querySelector('.opponent ' + selector);
  if (me) {
    const data: Hand = {type: eventName, side: 'me', element: me};
    const event = new CustomEvent<Hand>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
  if (opponent) {
    const data: Hand = {type: eventName, side: 'opponent', element: opponent};
    const event = new CustomEvent<Hand>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
}
