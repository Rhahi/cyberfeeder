import {chat} from '../watchers';
import * as debug from '../debug';

const turnRegex = /turn (?<turn>\d+)/;
const divId = 'cyberfeeder-turn';

export function enable() {
  document.addEventListener(chat.eventName, handler);
}

export function disable() {
  document.removeEventListener(chat.eventName, handler);
}

function handler(e: Event) {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail || event.detail.type !== chat.eventName) return;
  if (!event.detail.system) return;

  debug.log(`[turn] got message ${event.detail.text}`);
  const match = event.detail.text.match(turnRegex);
  if (match) {
    const turn = match.groups?.turn;
    debug.log(`[turn] Turn number detected, turn is ${turn}`);
    if (turn) setTurnNumber(turn);
  }
}

function createTurnDiv() {
  debug.log('There is no turn div, creating one');
  const selector = '.content-pane .panel-bottom.content';
  const div = document.querySelector(selector);
  if (!div) {
    debug.log('Could not find chat content div');
    return;
  }
  const container = document.createElement('div');
  container.textContent = '?';
  container.setAttribute('style', 'display: none;');
  container.setAttribute('id', divId);
  div.appendChild(container);
  return container;
}

function getTurnDiv() {
  const div = document.getElementById(divId);
  if (div) return div;
  return createTurnDiv();
}

function setTurnNumber(turn?: string) {
  if (!turn) return;
  const div = getTurnDiv();
  if (!div) return;
  div.textContent = turn;
}
