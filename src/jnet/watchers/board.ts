/// watch new cards appearing on the board, and then fire an event with it.
import * as base from './base';
import * as debug from '../debug';

export const EVENT_SERVER = 'board-server';
export const EVENT_INSTALL = 'board-install';
export const EVENT_RUN = 'board-run';
export const EVENT_FACEUP = 'board-faceup';
export const EVENT_FACEDOWN = 'board-facedown';

const boardObserver = new MutationObserver(dispatchBoardEvent);
const menuWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: boardObserver,
    selector: '.corp-board.opponent',
    observeOptions: {characterData: true, subtree: true, childList: true},
  });
};

export function watch() {
  document.addEventListener(base.eventName, menuWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) menuWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, menuWatcher);
  boardObserver.disconnect();
}

export interface FaceupEvent {
  type: 'board-faceup';
  name: string;
  card: Element;
  server: Element;
  isIce: boolean;
}

export interface FacedownEvent {
  type: 'board-facedown';
  card: Element;
  server: Element;
  isIce: boolean;
}

export interface InstallEvent {
  type: 'board-install';
  card: Element;
  server: Element;
  isIce: boolean;
}

export interface RunEvent {
  type: 'board-run';
  phase: 'unknown' | 'encounter' | 'movement' | 'approach';
  server: Element;
}

export interface ServerEvent {
  type: 'board-server';
  server: Element;
}

function dispatchBoardEvent(mutations: MutationRecord[]) {
  for (const m of mutations) {
    m.addedNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n as Text;
        const cardname = text.parentElement;
        if (cardname?.classList.contains('cardname')) faceupHandler(cardname);
        return;
      }

      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const div = n as Element;
      if (div.classList.contains('run-arrow')) runHandler(div);
      else if (div.classList.contains('server')) serverHandler(div);
      else if (div.getAttribute('alt') === 'Facedown corp card') facedownHandler(div);
      else if (div.classList.contains('server-card')) installHandler(div, false);
      else if (div.classList.contains('ice')) installHandler(div, true);
    });
  }
}

/** Run detection. Triggers after passing any ice. */
function runHandler(arrow: Element) {
  // debug.log('[watcher/board] starting run detection...', arrow);
  const server = arrow.parentElement?.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;
  const phase = arrow.firstElementChild?.className;
  const data: RunEvent = {type: EVENT_RUN, server, phase: 'unknown'};
  if (phase === 'movement' || phase === 'approach' || phase === 'encounter') {
    data.phase = phase;
  }
  const event = new CustomEvent<RunEvent>(EVENT_RUN, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] run detected', server);
}

function faceupHandler(span: Element) {
  // debug.log('[watcher/board] starting faceup detection...', span);
  if (!span.textContent) return;
  const card = span.parentElement?.parentElement?.parentElement;
  let isIce: boolean;
  if (card?.classList.contains('ice')) isIce = true;
  else if (card?.classList.contains('server-card')) isIce = false;
  else return;
  const server = card?.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: FaceupEvent = {type: EVENT_FACEUP, name: span.textContent, server, card, isIce};
  const event = new CustomEvent<FaceupEvent>(EVENT_FACEUP, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] faceup detected', card);
}

function installHandler(card: Element, isIce: boolean) {
  // debug.log('[watcher/board] starting install detection...', card);
  const server = card.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: InstallEvent = {type: EVENT_INSTALL, isIce, card, server};
  const event = new CustomEvent<InstallEvent>(EVENT_INSTALL, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] install detected', card);
}

function facedownHandler(img: Element) {
  // debug.log('[watcher/board] starting facedown detection...', img);
  const card = img.parentElement?.parentElement?.parentElement;
  let isIce: boolean;
  if (card?.classList.contains('ice')) isIce = true;
  else if (card?.classList.contains('server-card')) isIce = false;
  else return;
  const server = card.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: FacedownEvent = {type: EVENT_FACEDOWN, isIce, card, server};
  const event = new CustomEvent<FacedownEvent>(EVENT_FACEDOWN, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] facedown detected', card);
}

function serverHandler(server: Element) {
  // debug.log('[watcher/board] starting server detection...', server);
  const data: ServerEvent = {type: EVENT_SERVER, server};
  const event = new CustomEvent<ServerEvent>(EVENT_FACEDOWN, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] server detected', server);

  const rootCards = server.querySelectorAll(':scope .server-card');
  rootCards.forEach(n => installHandler(n, false));
  const ices = server.querySelectorAll(':scope .ice');
  ices.forEach(n => installHandler(n, true));
}
