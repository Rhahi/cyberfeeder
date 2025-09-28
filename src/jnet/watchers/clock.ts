import * as base from './base';

export const eventName = 'gameClock';
const selector = '.right-inner-leftpane .timer';
const regex = /(\d+h:)?(\d+m:)?(\d+)s/;

const clockObserver = new MutationObserver(tickHandler);
const menuWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: clockObserver,
    selector: selector,
    observeOptions: {characterData: true, subtree: true},
  });
};

export function watch() {
  document.addEventListener(base.eventName, menuWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) menuWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, menuWatcher);
  clockObserver.disconnect();
}

export interface Clock {
  type: 'clock';
  text: string;
  seconds: number;
}

function tickHandler(mutations: MutationRecord[]) {
  let text: string | undefined;
  for (const m of mutations) {
    const container = m.target.parentElement;
    if (container?.textContent) {
      text = container.textContent;
      break;
    }
  }
  if (!text) return;
  const seconds = parseTimerTimestamp(text);
  if (!seconds) return;
  const data: Clock = {type: 'clock', text, seconds};
  const event = new CustomEvent<Clock>(eventName, {detail: data});
  document.dispatchEvent(event);
}

export function readTimer() {
  const div = document.querySelector(selector);
  if (!div) return null;
  const text = div.textContent;
  if (!text) return null;
  return parseTimerTimestamp(text);
}

function parseTimerTimestamp(text: string) {
  let seconds = -1;
  const match = text.match(regex);
  if (!match) return null;
  if (match.length !== 4) return null;
  if (match[1]) {
    seconds += parseInt(match[1]) * 3600;
  }
  if (match[2]) {
    seconds += parseInt(match[2]) * 60;
  }
  if (match[3]) {
    seconds += parseInt(match[3]);
  }
  if (seconds > 0) {
    seconds += 1;
  }
  return seconds;
}
