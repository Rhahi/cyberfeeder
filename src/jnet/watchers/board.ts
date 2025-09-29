/// watch new cards appearing on the board, and then fire an event with it.
import * as base from './base';
import * as debug from '../debug';

export const EVENT_SERVER = 'board-server';
export const EVENT_ROOT = 'board-root';
export const EVENT_ICE = 'board-ice';
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
}

export interface BoardEvent {
  type: 'board-root' | 'board-ice' | 'board-facedown';
  card: Element;
  server: Element;
}

export interface RunEvent {
  type: 'board-run';
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
      else if (div.classList.contains('server-card')) installHandler(div);
      else if (div.classList.contains('ice')) installHandler(div);
    });
  }
}

/** Run detection. Triggers after passing any ice. */
function runHandler(arrow: Element) {
  // debug.log('[watcher/board] starting run detection...', arrow);
  const server = arrow.parentElement?.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: RunEvent = {type: EVENT_RUN, server};
  const event = new CustomEvent<RunEvent>(EVENT_RUN, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] run detected', server);
}

function faceupHandler(span: Element) {
  // debug.log('[watcher/board] starting faceup detection...', span);
  if (!span.textContent) return;
  const card = span.parentElement?.parentElement?.parentElement;
  if (!card?.classList.contains('server-card') && !card?.classList.contains('ice')) return;
  const server = card?.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: FaceupEvent = {type: EVENT_FACEUP, name: span.textContent, server, card};
  const event = new CustomEvent<FaceupEvent>(EVENT_FACEUP, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] faceup detected', card);
}

function installHandler(card: Element) {
  // debug.log('[watcher/board] starting install detection...', card);
  const server = card.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: BoardEvent = {type: EVENT_ROOT, card, server};
  const event = new CustomEvent<BoardEvent>(EVENT_ROOT, {detail: data});
  document.dispatchEvent(event);
  debug.log('[watcher/board] install detected', card);
}

function facedownHandler(img: Element) {
  // debug.log('[watcher/board] starting facedown detection...', img);
  const card = img.parentElement?.parentElement?.parentElement;
  if (!card?.classList.contains('ice') && !card?.classList.contains('server-card')) return;
  const server = card.parentElement?.parentElement;
  if (!server?.classList.contains('server')) return;

  const data: BoardEvent = {type: EVENT_FACEDOWN, card, server};
  const event = new CustomEvent<BoardEvent>(EVENT_FACEDOWN, {detail: data});
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
  rootCards.forEach(installHandler);
  const ices = server.querySelectorAll(':scope .ice');
  ices.forEach(installHandler);
}
