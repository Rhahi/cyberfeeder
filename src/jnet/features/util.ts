export type Location = 'rnd' | 'hq' | 'archives' | 'remote' | 'unknown' | 'stack' | 'heap' | 'grip' | 'no-target';

export interface PanelInfo {
  age: number;
  context?: number;
  card?: string;
  text: string;
  buttons: string[];
  location: Location;
  match?: RegExpMatchArray;
}

export function getChat() {
  return document.querySelector('.panel > .log > .messages');
}

export function getCommandPanel() {
  return document.querySelector('.leftpane .inner-leftpane .right-inner-leftpane .button-pane');
}

export function isFullyDown(element: Element, tolerance = 2) {
  return Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= tolerance;
}

export function getArrow() {
  return document.querySelector('.run-arrow');
}

export function getChatInputbox() {
  return document.getElementById('log-input');
}

export function toLocation(text?: string | null): Location {
  if (text) {
    text = text.toLowerCase();
  }
  if (text === 'r&d') {
    return 'rnd';
  }
  if (text === 'archives') {
    return 'archives';
  }
  if (text === 'hq') {
    return 'hq';
  }
  if (text === 'server') {
    return 'remote';
  }
  if (text === 'stack') {
    return 'stack';
  }
  if (text === 'heap') {
    return 'heap';
  }
  return 'unknown';
}

export function getCommandPanelInfo(element?: Element, prefix = '> .panel') {
  let panel: Element | null;
  if (!element) {
    panel = getCommandPanel();
  } else {
    panel = element;
  }
  if (!panel) {
    return;
  }
  const info: PanelInfo = {
    age: getChatAge(),
    card: getPanelCardName(panel, prefix),
    text: getPanelText(panel, prefix),
    buttons: getPanelButtons(panel, prefix),
    location: 'unknown',
  };
  return info;
}

function getPanelCardName(panel: Element, prefix = '> .panel') {
  const card = panel.querySelector(`:scope ${prefix} > div:first-child > span.fake-link`);
  if (card?.textContent) {
    return card.textContent;
  }
  return;
}

function getPanelText(panel: Element, prefix = '> .panel') {
  const text = panel.querySelector(`:scope ${prefix} > h4`);
  if (text?.textContent) {
    return text.textContent;
  }
  return '';
}

function getPanelButtons(panel: Element, prefix = '> .panel') {
  const buttons: string[] = [];
  const elements = panel.querySelectorAll(`:scope ${prefix} > button`);
  elements.forEach(button => {
    if (button.textContent) {
      buttons.push(button.textContent);
    }
  });
  return buttons;
}

export function getChatAge(message?: Element) {
  let age: number | undefined;
  if (message) {
    age = message.parentNode?.children.length;
  } else {
    age = getChat()?.children.length;
  }
  if (typeof age === 'number') {
    return age;
  }
  return -1;
}

