export type Location = 'rnd' | 'hq' | 'archives' | 'remote' | 'unknown' | 'stack' | 'heap' | 'grip' | 'no-target';

export function getChat() {
  return document.querySelector('.panel > .log > .messages');
}

export function getArrow() {
  return document.querySelector('.run-arrow');
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
