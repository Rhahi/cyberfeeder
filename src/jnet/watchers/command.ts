/** Announce when a command panel has been created.
 *
 * This happens when switching replay views, and when a game starts. */

import * as base from './base';

export interface CommandPanelContent extends PanelContent {
  type: 'content-command-panel';
}

export interface CommandPanelClick {
  type: 'click-command-panel';
  text: string;
}

export interface PanelContent {
  card?: string;
  text?: string;
  buttons?: string[];
}

export const contentEvent = 'content-command-panel';
export const clickEvent = 'click-command-panel';
const changePanelEvent = 'change-panel';

interface ChangePanel {
  type: 'change-panel';
  root: Element;
}

export function watch() {
  document.addEventListener(changePanelEvent, newPanelHandler);
  document.addEventListener(base.eventName, sideWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) sideWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(changePanelEvent, newPanelHandler);
  document.removeEventListener(base.eventName, sideWatcher);
  PanelCreationObserver.disconnect();
  PanelObserver.disconnect();
}

const PanelCreationObserver = new MutationObserver(panelCreationHandler);
const sideWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: PanelCreationObserver,
    selector: '.right-inner-leftpane',
    observeOptions: {childList: true},
    init: () => {
      const element = document.querySelector('.right-inner-leftpane .button-pane');
      if (element) announcePanel(element);
    },
  });
};

/** Check if .right-inner-leftpane got a new .button-pane element. If it did, report it. */
function panelCreationHandler(mutations: MutationRecord[]) {
  for (const m of mutations) {
    let done = false;
    m.addedNodes.forEach(node => {
      if (!done) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          done = announcePanel(element);
        }
      }
    });
  }
}

function announcePanel(element: Element): boolean {
  if (element.className === 'button-pane') {
    const data: ChangePanel = {
      type: changePanelEvent,
      root: element,
    };
    const event = new CustomEvent(changePanelEvent, {detail: data});
    document.dispatchEvent(event);
    return true;
  }
  return false;
}

/** Turn on/off observer when a new panel has been created or on user navigation */
const newPanelHandler = (e: Event) => {
  const event = e as CustomEvent<ChangePanel>;
  if (!event.detail || event.detail.type !== changePanelEvent) return;

  PanelObserver.disconnect();
  const panel = event.detail.root;
  PanelObserver.observe(panel, {childList: true, subtree: true, characterData: true});
};

/** When panel information has changed, fire an event notifying this. */
const PanelObserver = new MutationObserver(m => {
  const data = parsePanel(m);
  if (data.buttons || data.card || data.text) {
    const event = new CustomEvent<CommandPanelContent>(contentEvent, {
      detail: {type: contentEvent, ...data},
    });
    document.dispatchEvent(event);
  }
});

/** Parse mutation of a panel, and extract card, text, and buttons information in it */
function parsePanel(mutations: MutationRecord[]): PanelContent {
  const data: PanelContent = {};
  const dataButtons: string[] = [];

  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const {card, text, buttons} = handleMutation(node as Element);
        if (card) data.card = card;
        if (text) data.text = text;
        if (buttons) dataButtons.push(...buttons);
      }
    });
    if (m.target.nodeType === Node.ELEMENT_NODE) {
      const {card, text, buttons} = handleMutation(m.target as Element);
      if (card) data.card = card;
      if (text) data.text = text;
      if (buttons) dataButtons.push(...buttons);
    }
    if (m.target.nodeType === Node.TEXT_NODE) {
      const {card, text, buttons} = handleMutation(m.target.parentElement as Element);
      if (card) data.card = card;
      if (text) data.text = text;
      if (buttons) dataButtons.push(...buttons);
    }
  }
  if (dataButtons.length > 0) data.buttons = dataButtons;
  return data;
}

/** Core case-by-case extraction of panel mutation */
function handleMutation(element: Element) {
  const data: PanelContent = {};
  const buttons: string[] = [];
  if (element.tagName.toUpperCase() === 'SPAN') return data;

  // entire panel has been changed or replaced
  if (element.className === 'panel blue-shade') {
    const card = element.querySelector(':scope > div:first-child > span.fake-link')?.textContent;
    const buttonsRaw = element.querySelectorAll(':scope > button');
    const text = element.querySelector(':scope > h4')?.textContent;
    if (card) data.card = card;
    if (text) data.text = text;
    buttonsRaw.forEach(b => {
      const buttonText = watchButton(b);
      if (buttonText) buttons.push(buttonText);
    });
    if (buttons.length > 0) data.buttons = buttons;
    return data;
  }

  if (element.tagName.toUpperCase() === 'DIV' && element.getAttribute('style') === 'text-align: center;') {
    const card = element.querySelector(':scope span.fake-link')?.textContent;
    if (card) data.card = card;
    return data;
  }

  // update secret's h4 text content
  if (element.tagName.toUpperCase() === 'H4' && element.parentElement) {
    if (element.textContent) data.text = element.textContent;
    return data;
  }

  // assign watcher for all new buttons
  if (element.tagName.toUpperCase() === 'BUTTON') {
    const buttonText = watchButton(element);
    if (buttonText) buttons.push(buttonText);
    return data;
  }

  // general update
  const card = element.querySelector(':scope > div:first-child > span.fake-link')?.textContent;
  const text = element.querySelector(':scope h4')?.textContent;
  if (card) data.card = card;
  if (text) data.text = text;
  const buttonElements = element.querySelectorAll(':scope button');
  buttonElements.forEach(b => {
    const buttonText = watchButton(b);
    if (buttonText) buttons.push(buttonText);
  });
  if (buttons.length > 0) data.buttons = buttons;
  return data;
}

/** Watch click event of panel buttons, to track player choices */
function watchButton(element: Element) {
  if (element.hasAttribute('cyberfeeder')) return;
  element.setAttribute('cyberfeeder', 'watched');
  const tracker = () => {
    if (element.textContent) {
      const data: CommandPanelClick = {type: clickEvent, text: element.textContent};
      const event = new CustomEvent<CommandPanelClick>(clickEvent, {detail: data});
      document.dispatchEvent(event);
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
  return element.textContent;
}
