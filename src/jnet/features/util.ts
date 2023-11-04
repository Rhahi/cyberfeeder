export type RunTarget = 'run-rnd' | 'run-hq' | 'run-archives' | 'run-remote' | 'run-unknown' | 'not-in-a-run';

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
