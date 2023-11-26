/**
 * 1. Detect navigation event
 * 2. Detect observer mode changes.
 * 3. Detect creation of a new area
 * 4. Setup click tracker for each card in the new card, and new cards entering this area.
 * 5. Self destruct click tracker after 2 minutes.
 */
import * as base from './base';
type ContainerType = 'rfg' | 'set-aside' | 'play-area' | 'unknown';

export interface SetAside {
  type: 'select-set-aside';
  card: string;
}

export interface NewArea {
  type: 'new-RIL-area';
  root: Element;
  containerType: ContainerType;
}

interface NewWrapper {
  type: 'new-RIL-wrapper';
  root: Element;
}

export const setAsideEvent = 'select-set-aside'; // fire when user clicks on aside cards
export const newAreaEvent = 'new-RIL-area'; // fire when a new RIL container is added
const newWrapperEvent = 'new-RIL-wrapper'; // fire when the RIL wrapper has changed.

export function watch() {
  document.addEventListener(newAreaEvent, newAsideHandler);
  document.addEventListener(newWrapperEvent, newWrapperHandler);
  document.addEventListener(base.eventName, sideWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) sideWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(newAreaEvent, newAsideHandler);
  document.removeEventListener(newWrapperEvent, newWrapperHandler);
  document.removeEventListener(base.eventName, sideWatcher);
}

function wrapperCreationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    let done = false;
    m.addedNodes.forEach(node => {
      if (!done) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          done = announceWrapper(element);
        }
      }
    });
  }
}

/** when side is chagned. .right-left-innerpane > div:first-child is created.
 * watch this div, which will contain the set aside zone.
 */
const wrapperCreationObserver = new MutationObserver(wrapperCreationHandler);
const sideWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: wrapperCreationObserver,
    selector: '.right-inner-leftpane',
    observeOptions: {childList: true},
    init: () => {
      const container = findPanelContainer();
      if (container) announceWrapper(container);
    },
  });
};

function findPanelContainer(element?: Element) {
  let panel: Element | null = null;
  if (element) {
    panel = element.querySelector(':scope > div:first-child');
  } else {
    panel = document.querySelector('.right-inner-leftpane > div:first-child');
  }
  if (panel) {
    if (panel.classList.contains('button-pane')) return; // should not happen, but just in case. This is a command panel.
    return panel;
  }
  return;
}

function announceWrapper(element: Element): boolean {
  if (element.parentElement?.className !== 'right-inner-leftpane') return false;
  const data: NewWrapper = {
    type: newWrapperEvent,
    root: element,
  };
  const event = new CustomEvent(newWrapperEvent, {detail: data});
  document.dispatchEvent(event);
  return true;
}

function getContainerType(text: string | null | undefined): ContainerType {
  if (text) {
    if (text.includes('Removed from the game')) return 'rfg';
    else if (text.includes('Set aside')) return 'set-aside';
    else if (text.includes('Play area')) return 'play-area';
  }
  return 'unknown';
}

/** watch the content of .right-inner-leftpane > div:first-child.
 * This zone can contain RFG, set-aside, and play-area. */
const newAreaHandler = (mutations: MutationRecord[]) => {
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;

      const headerText = element.querySelector(':scope > .header.darkbg')?.textContent;
      const containerType = getContainerType(headerText);
      if (containerType === 'unknown') return;
      const data: NewArea = {type: newAreaEvent, root: element, containerType};
      const event = new CustomEvent<NewArea>(newAreaEvent, {detail: data});
      document.dispatchEvent(event);
    });
  }
};

const wrapperWatcher = new MutationObserver(newAreaHandler);
const newWrapperHandler = (e: Event) => {
  const event = e as CustomEvent<NewWrapper>;
  if (!event.detail || event.detail.type !== newWrapperEvent) return;

  wrapperWatcher.disconnect();
  wrapperWatcher.observe(event.detail.root, {childList: true});
  announceCurrentAreas();
};

function announceCurrentAreas() {
  const headers = document.querySelectorAll('.right-inner-leftpane > div:first-child .header.darkbg');
  headers.forEach(h => {
    const container = h.parentElement;
    const containerType = getContainerType(h.textContent);
    if (containerType === 'unknown' || !container) return;
    const data: NewArea = {type: newAreaEvent, root: container, containerType};
    const event = new CustomEvent<NewArea>(newAreaEvent, {detail: data});
    document.dispatchEvent(event);
  });
}

const asideHandler = (mutations: MutationRecord[]) => {
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      const card = element.querySelector(':scope .blue-shade.card');
      if (!card) return;
      watchCard(card);
    });
  }
};

const asideObserver = new MutationObserver(asideHandler);
const newAsideHandler = (e: Event) => {
  const event = e as CustomEvent<NewArea>;
  if (!event.detail || event.detail.type !== newAreaEvent) return;
  if (event.detail.containerType !== 'set-aside') return;

  asideObserver.disconnect();
  asideObserver.observe(event.detail.root, {childList: true, subtree: true});
  event.detail.root.childNodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (!element.classList.contains('card-wrapper')) return;
    const card = element.querySelector(':scope .blue-shade.card');
    if (!card) return;
    watchCard(card);
  });
};

function watchCard(element: Element) {
  if (element.hasAttribute('cyberfeeder')) return;
  console.log('watch-card', element);
  element.setAttribute('cyberfeeder', 'watched');
  const tracker = () => {
    if (element.textContent) {
      const data: SetAside = {type: setAsideEvent, card: element.textContent};
      const event = new CustomEvent<SetAside>(setAsideEvent, {detail: data});
      document.dispatchEvent(event);
      console.log('click-card', data);
    }
    element.removeEventListener('click', tracker);
    element.removeAttribute('cyberfeeder');
  };
  element.addEventListener('click', tracker);
  setTimeout(() => {
    // clean up the event after 2 minutes
    element.removeEventListener('click', tracker);
    element.removeAttribute('cyberfeeder');
  }, 120000);
  return;
}
