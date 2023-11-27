import {chat} from '../watchers';
import {isFullyDown} from './newMessageIndicator';
import * as util from './util';

type MatchType = string | RegExp;

const turnRegex = /turn (\d+)/;
const accessRegex = [/accesses .*(?:from|in) (?:the root of )?(?<location>HQ|R&D|Archives|Server)/];
const exposeRegex = [/exposes .*(?<location>HQ|R&D|Archives|Server)/];
const revealRegex = [
  //
  /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(?<location>HQ|R&D|Archives|Server|stack)\b/,
  /reveals? that they drew/,
];
const addRegex = [/add .* to (?<location>HQ|R&D|Archives|grip|stack)/];
const bottomRegex = [/adds? .* to (?:the )?bottom of (?:the )?(?<location>stack|R&D)/];
const discardRegex = [/discards? .* from (?:their )(?<source>Grip|grip|HQ)/];

interface Annotation {
  done?: boolean;
  action?: Element;
  source?: Element;
  location?: Element;
  secret?: Element;
}

const annotate = (e: Event) => {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail || event.detail.type !== chat.eventName) {
    return;
  }
  if (!event.detail.system) {
    // ignore user messages
    return;
  }

  const shouldScroll = event.detail.element.parentElement ? isFullyDown(event.detail.element.parentElement) : false;
  const annotation: Annotation = {done: false};
  annotateTurn(annotation, event.detail);
  annotateGeneric(annotation, 'cf-access', accessRegex, event.detail);
  annotateGeneric(annotation, 'cf-expose', exposeRegex, event.detail);
  annotateGeneric(annotation, 'cf-reveal', revealRegex, event.detail);
  annotateGeneric(annotation, 'cf-bottom', bottomRegex, event.detail);
  annotateGeneric(annotation, 'cf-add', addRegex, event.detail);
  annotateGeneric(annotation, 'cf-discard', discardRegex, event.detail);
  const didAddIcons = addIcons(event.detail.element, annotation);
  if (didAddIcons && shouldScroll && event.detail.element.parentElement) {
    event.detail.element.parentElement.scrollTop = event.detail.element.parentElement.scrollHeight;
  }
};

export function enable() {
  document.addEventListener(chat.eventName, annotate);
}

export function disable() {
  document.removeEventListener(chat.eventName, annotate);
}

export function createIcon(text: string) {
  const icon = document.createElement('i');
  if (text === 'hq') icon.classList.add('fa-sharp', 'fa-solid', 'fa-building', 'icon-hq');
  else if (text === 'rnd') icon.classList.add('fa-solid', 'fa-flask', 'icon-rnd');
  else if (text === 'archives') icon.classList.add('fa-solid', 'fa-server', 'icon-archives');
  else if (text === 'remote') icon.classList.add('fa-sharp', 'fa-solid', 'fa-network-wired', 'icon-remote');
  else if (text === 'heap') icon.classList.add('fa-solid', 'fa-hard-drive', 'icon-stack');
  else if (text === 'stack') icon.classList.add('fa-solid', 'fa-layer-group', 'icon-stack');
  else if (text === 'grip') icon.classList.add('fa-solid', 'fa-hand', 'icon-grip');
  else if (text === 'right-arrow') icon.classList.add('fa-solid', 'fa-arrow-right', 'icon-right');
  else if (text === 'secret') icon.classList.add('fa-solid', 'fa-circle-question', 'icon-secret');
  else if (text === 'cf-turn') icon.classList.add('fa-solid', 'fa-hourglass-half', 'icon-turn');
  else if (text === 'cf-access') icon.classList.add('fa-solid', 'fa-bolt', 'icon-access');
  else if (text === 'cf-add') icon.classList.add('fa-solid', 'fa-circle-plus', 'icon-add');
  else if (text === 'cf-reveal') icon.classList.add('fa-regular', 'fa-eye', 'icon-reveal');
  else if (text === 'cf-expose') icon.classList.add('fa-solid', 'fa-eye', 'icon-expose');
  else if (text === 'cf-bottom') icon.classList.add('fa-solid', 'fa-download', 'icon-bottom');
  else if (text === 'cf-discard') icon.classList.add('fa-solid', 'fa-dumpster', 'icon-discard');
  else icon.classList.add('fa-solid', 'fa-question', 'icon-unknown');
  return icon;
}

export function addIcons(chatDiv: Element, annotation: Annotation) {
  if (!annotation.action && !annotation.source && !annotation.location) return false;

  let container = chatDiv.querySelector(':scope .cyberfeeder-icon');
  if (!container) {
    container = document.createElement('div');
    chatDiv.prepend(container);
  }
  container.classList.add('cyberfeeder-icon');
  container.setAttribute('style', 'display: none;');
  if (annotation.action) container.appendChild(annotation.action);
  if (annotation.source) {
    container.appendChild(annotation.source);
    if (annotation.location) container.appendChild(createIcon('right-arrow'));
  }
  if (annotation.location) container.appendChild(annotation.location);
  if (annotation.secret) container.appendChild(annotation.secret);
  return true;
}

/** annotate start of turn trigger. Returns true if it was indeed a start of turn trigger. */
function annotateTurn(annotation: Annotation, detail: chat.ChatMessage) {
  if (annotation.done) return;
  const match = detail.text.match(turnRegex);
  if (match) {
    annotation.done = true;
    annotation.action = createIcon('cf-turn');
  }
}

/** Generic annotation based on regex search */
function annotateGeneric(annotation: Annotation, type: string, regex: MatchType[], detail: chat.ChatMessage, final = false) {
  if (annotation.done) return;

  let match: RegExpMatchArray | null = null;
  for (const r of regex) {
    const candidate = detail.text.match(r);
    if (candidate) {
      match = candidate;
      break;
    }
  }
  if (!match) return;
  if (final) annotation.done = true;
  detail.element.classList.add(type);
  if (match.groups) {
    const location = util.toLocation(match.groups['location']);
    if (location !== 'unknown') {
      detail.element.setAttribute('location', location);
      if (!annotation.location) annotation.location = createIcon(location);
    }
  }
  if (!annotation.action) annotation.action = createIcon(type);
}
