import {chat} from '../watchers';
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

/** annotate start of turn trigger. Returns true if it was indeed a start of turn trigger. */
function annotateTurn(detail: chat.ChatMessage) {
  if (detail.text.includes('started their turn')) {
    const match = detail.text.match(turnRegex);
    if (match && match.length === 2) {
      const turn = match[1];
      detail.element.setAttribute('turn', `Turn ${turn}`);
    }
    return true;
  }
  return false;
}

/** Generic annotation based on regex search */
function annotateGeneric(type: string, regex: RegExp | string, detail: chat.ChatMessage) {
  const match = detail.text.match(regex);
  if (!match) return;
  detail.element.classList.add(type);
  if (match.groups) {
    match.groups['shouldnotfail'];
    const location = util.toLocation(match.groups['location']);
    if (location !== 'unknown') {
      detail.element.setAttribute('location', location);
    }
  }
}
