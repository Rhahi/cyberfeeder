import {chat} from '../watchers';
import {isFullyDown} from './newMessageIndicator';
import * as util from './util';

const turnRegex = /turn (\d+)/;
const accessRegex = /accesses .*(?:from|in) (?:the root of )?(?<location>HQ|R&D|Archives|Server)/;
const exposeRegex = /exposes .*(?<location>HQ|R&D|Archives|Server)/;
const revealRegex = /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(?<location>HQ|R&D|Archives|Server|stack)\b/;
const addRegex = /add .* to (?<location>HQ|R&D|Archives|grip|stack)/;

const annotate = (e: Event) => {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail || event.detail.type !== chat.eventName) {
    return;
  }
  if (!event.detail.system) {
    // ignore user messages
    return;
  }
  if (annotateTurn(event.detail)) return;
  annotateGeneric('access', accessRegex, event.detail);
  annotateGeneric('expose', exposeRegex, event.detail);
  annotateGeneric('reveal', revealRegex, event.detail);
  annotateGeneric('add', addRegex, event.detail);
};

export function enable() {
  document.addEventListener(chat.eventName, annotate);
}

export function disable() {
  document.removeEventListener(chat.eventName, annotate);
}

function setFontAwesomeIcon(element: Element, params: {action?: string; location?: util.Location; source?: util.Location}) {
  const container = document.createElement('div');
  container.classList.add('cyberfeeder-icon');
  container.setAttribute('style', 'display: none;');
  if (params.action) addFontAwesomeIcon(container, params.action);
  if (params.source && params.source !== 'unknown') {
    addFontAwesomeIcon(container, params.source);
    if (params.location && params.location !== 'unknown') addFontAwesomeIcon(container, 'right-arrow');
  }
  if (params.location && params.location !== 'unknown') addFontAwesomeIcon(container, params.location);
  element.prepend(container);
}

export function addFontAwesomeIcon(element: Element, text: string) {
  let container = element.querySelector(':scope > .cyberfeeder-icon');
  if (!container) container = element;
  const i = document.createElement('i');
  iconize(i, text);
  container.appendChild(i);
}

function iconize(icon: Element, text: string) {
  if (text === 'hq') return icon.classList.add('fa-sharp', 'fa-solid', 'fa-building', 'icon-hq');
  if (text === 'rnd') return icon.classList.add('fa-solid', 'fa-flask', 'icon-rnd');
  if (text === 'archives') return icon.classList.add('fa-solid', 'fa-server', 'icon-archives');
  if (text === 'remote') return icon.classList.add('fa-sharp fa-solid', 'fa-network-wired', 'icon-remote');

  if (text === 'heap') return icon.classList.add('fa-solid', 'fa-hard-drive', 'icon-stack');
  if (text === 'stack') return icon.classList.add('fa-solid', 'fa-layer-group', 'icon-stack');
  if (text === 'grip') return icon.classList.add('fa-solid', 'fa-hand', 'icon-grip');

  if (text === 'right-arrow') return icon.classList.add('fa-solid', 'fa-arrow-right', 'icon-right');
  if (text === 'secret') return icon.classList.add('fa-solid', 'fa-circle-question', 'icon-secret');
  if (text === 'turn') return icon.classList.add('fa-solid', 'fa-hourglass-half', 'icon-turn');

  if (text === 'access') return icon.classList.add('fa-solid', 'fa-bolt', 'icon-access');
  if (text === 'add') return icon.classList.add('fa-solid', 'fa-circle-plus', 'icon-add');
  if (text === 'reveal') return icon.classList.add('fa-regular', 'fa-eye', 'icon-reveal');
  if (text === 'expose') return icon.classList.add('fa-solid', 'fa-eye', 'icon-expose');
  return icon.classList.add('fa-solid', 'fa-question', 'icon-unknown');
}

/** annotate start of turn trigger. Returns true if it was indeed a start of turn trigger. */
function annotateTurn(detail: chat.ChatMessage) {
  if (detail.text.includes('started their turn')) {
    const shouldScroll = detail.element.parentElement ? isFullyDown(detail.element.parentElement) : false;
    const match = detail.text.match(turnRegex);
    if (match && match.length === 2) {
      const turn = match[1];
      detail.element.setAttribute('turn', `Turn ${turn}`);
      setFontAwesomeIcon(detail.element, {action: 'turn'});
      if (shouldScroll && detail.element.parentElement) {
        detail.element.parentElement.scrollTop = detail.element.parentElement.scrollHeight;
      }
    }
    return true;
  }
  return false;
}

/** Generic annotation based on regex search */
function annotateGeneric(type: string, regex: RegExp | string, detail: chat.ChatMessage) {
  const match = detail.text.match(regex);
  if (!match) return;
  const shouldScroll = detail.element.parentElement ? isFullyDown(detail.element.parentElement) : false;
  detail.element.classList.add(type);
  if (match.groups) {
    match.groups['shouldnotfail'];
    const location = util.toLocation(match.groups['location']);
    if (location !== 'unknown') {
      detail.element.setAttribute('location', location);
      setFontAwesomeIcon(detail.element, {action: type, location});
    }
    if (shouldScroll && detail.element.parentElement) {
      detail.element.parentElement.scrollTop = detail.element.parentElement.scrollHeight;
    }
  }
}
