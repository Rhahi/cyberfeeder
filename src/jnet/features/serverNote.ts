import {chat, board, base} from '../watchers';
import * as debug from '../debug';
import {getChatAge} from './util';

/** Known matches:
 * - uses Drafter to install Vovô Ozetti from Archives in the root of Server 8 (new remote).
 * - uses The Powers That Be to install a card from Archives in the root of Server 6 (new remote).
 * - uses Project Ingatan to install Drago Ivanov from Archives in the root of Server 5 (new remote).
 * - uses Synapse Global: Faster than Thought to reveal Sericulture Expansion from HQ.
 *   -> uses Synapse Global: Faster than Thought to install a card in the root of Server 2 (new remote).
 */
const OPEN_INSTALL_REGEX = /install (?<card>.*) from /;
const ACCESS_REMOTE_REGEX = /access(?:es)? (?<card>.*) from (?<server>Server \d+)/;
const ACCESS_CENTRAL_REGEX = /access(?:es)? (?<card>.*) from the root of (?:the )?(?<server>R&D|Archives|HQ)\./;
const ATTR_WATCH = 'cyberfeeder-servernote-watch';
const ATTR_CLICK_AGE = 'cyberfeeder-clicked';
const ATTR_CARD_NAME = 'cyberfeeder-cardname';
const ATTR_CANDIDATE = 'cyberfeeder-candidate';
const ATTR_ONGOING_BREACH = 'cyberfeeder-breaching';
const ATTR_DATA_CARD = 'data-card-title';
let lastChat: chat.ChatMessage | null = null;

interface AnnotationRequest {
  card: Element;
  name: string;
}

const menuWatcher = (event: Event) => {
  base.conditionalExecuter({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    callback: enable => {
      if (enable) reset();
    },
  });
};

export function enable() {
  reset();
  document.addEventListener(base.eventName, menuWatcher);
  document.addEventListener(chat.eventName, runHandler);
  document.addEventListener(chat.eventName, chatHandler);
  document.addEventListener(board.EVENT_INSTALL, installHandler);
  document.addEventListener(board.EVENT_FACEUP, faceupHandler);
}

export function disable() {
  document.removeEventListener(base.eventName, menuWatcher);
  document.removeEventListener(chat.eventName, runHandler);
  document.removeEventListener(chat.eventName, chatHandler);
  document.removeEventListener(board.EVENT_INSTALL, installHandler);
  document.removeEventListener(board.EVENT_FACEUP, faceupHandler);
}

/** called when starting or navigating */
function reset() {
  lastChat = null;
  clearAttribute('server-card', ATTR_CANDIDATE);
  clearAttribute('server-card', ATTR_CLICK_AGE);
  watchAllRootCards();
  markAllRezzedCards();
}

/** When a run arrow appears clear access candidate */
function runHandler(e: Event) {
  const event = e as CustomEvent<board.RunEvent>;
  if (!event.detail) return;
  // unknown event occurs every access, but movement only occurs when declaring and between ice.
  if (event.detail.phase === 'movement') {
    clearAttribute('server-card', ATTR_CANDIDATE);
    clearAttribute('server', ATTR_ONGOING_BREACH);
  }
}

/** Whenever a new chat mentions accesses, queue it up for note taking */
function chatHandler(e: Event) {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail) return;
  if (!event.detail.system) return;

  lastChat = event.detail;
  debug.log(event.detail.text);
  const result = findAccessedCard(event.detail);
  if (result) annotate(result.card, result.name);
}

function findAccessedCard(detail: chat.ChatMessage): AnnotationRequest | null {
  let match = detail.text.match(ACCESS_REMOTE_REGEX);
  if (!match) match = detail.text.match(ACCESS_CENTRAL_REGEX);
  if (!match?.groups) return null;
  debug.log('[serverNote] access detected', detail.age);

  const cardName = match.groups['card'];
  if (cardName === 'an unseen card') return null;
  const serverName = match.groups['server'];
  const server = getServer(serverName);
  const candidates = findCandidates(server, detail.age);
  debug.log(`[serverNote] found ${candidates.length} candidates`);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    return {card: candidates[0], name: cardName};
  }

  let latest = 0;
  let target: Element | null = null;
  for (const card of candidates) {
    const ageText = card.getAttribute(ATTR_CLICK_AGE);
    if (!ageText) continue;
    const timestamp = parseInt(ageText);
    if (!isFinite(timestamp)) continue;
    if (timestamp < latest) continue;
    target = card;
    latest = timestamp;
  }

  if (!target) {
    debug.log('[serverNote] there is no target to annotate');
    return null;
  }
  return {card: target, name: cardName};
}

function findOpenInstall(detail: chat.ChatMessage): string | null {
  const match = detail.text.match(OPEN_INSTALL_REGEX);
  if (!match) return null;
  if (!match.groups) return null;
  debug.log('[serverNote] open install detected');
  const cardName = match.groups['card'];
  const query = detail.element.querySelectorAll(`:scope [${ATTR_DATA_CARD}]`);
  let verifiedName: string | null = null;
  query.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (verifiedName) return;
    const attrName = node.getAttribute(ATTR_DATA_CARD);
    if (attrName === cardName) verifiedName = attrName;
  });
  if (!verifiedName) return null;
  debug.log('[serverNote] found open install', verifiedName);
  return verifiedName;
}

/** Look for all cards in this server. If there are any marked cards,
 * return those cards. Otherwise, mark them and return the newly marked cards.*/
function findCandidates(server: Element | null, age: number) {
  debug.log('[serverNote] looking for cards in server', server);
  if (!server) return [];
  const {cards, candidates} = cardsInServer(server);
  if (cards.length === 1) return cards;
  if (candidates.length > 0) return candidates;
  for (const card of cards) {
    card.setAttribute(ATTR_CANDIDATE, `${age}`);
  }
  server.setAttribute(ATTR_ONGOING_BREACH, `${age}`);
  return cards;
}

function cardsInServer(server: Element) {
  const query = server.querySelectorAll(':scope .server-card');
  const cards: Element[] = [];
  const candidates: Element[] = [];
  query.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as Element;
    cards.push(e);
    if (node.hasAttribute(ATTR_CANDIDATE)) candidates.push(e);
  });
  return {cards, candidates};
}

function getServer(name: string) {
  const labels = document.querySelectorAll('.corp-board.opponent .server .content .server-label');
  let label: Element | undefined;
  labels.forEach(node => {
    const e = node as Element;
    if (label) return;
    if (e.textContent?.includes(name)) label = e;
  });

  if (!label) return null;
  let e = label;
  while (e.parentElement) {
    e = e.parentElement;
    if (e.classList.contains('server')) return e;
  }
  return null;
}

/** When a new card is installed in root, attach click listener on it */
function installHandler(e: Event) {
  const event = e as CustomEvent<board.InstallEvent>;
  if (!event.detail) return;
  if (lastChat) {
    const name = findOpenInstall(lastChat);
    if (name) {
      annotate(event.detail.card, name);
    }
  }
  lastChat = null;
  if (event.detail.isIce) return;
  if (event.detail.server.hasAttribute(ATTR_ONGOING_BREACH)) {
    event.detail.card.setAttribute(ATTR_CANDIDATE, '');
  }
  watchCard(event.detail.card);
  debug.log('[serverNote] install detected, watching card', event.detail.card);
}

/** When a card goes face up, set attribute for it */
function faceupHandler(e: Event) {
  const event = e as CustomEvent<board.FaceupEvent>;
  if (!event.detail) return;
  debug.log('[serverNote] faceup detected', event.detail.card);
  annotate(event.detail.card, event.detail.name);
}

function annotate(card: Element, name: string) {
  if (name === '') return;
  debug.log('[serverNote] annotated card', card);
  card.setAttribute(ATTR_CARD_NAME, name);
  card.removeAttribute(ATTR_CANDIDATE);
}

/** Mark the recently clicked card */
function handleClick(this: Element) {
  const age = getChatAge();
  this.setAttribute(ATTR_CLICK_AGE, `${age}`);
}

/** Attach click event listener for this card */
function watchCard(card: Element) {
  if (card.getAttribute(ATTR_WATCH) === 'watching') return 0;
  card.setAttribute(ATTR_WATCH, 'watching');
  card.addEventListener('click', handleClick);
  return 1;
}

function clearAttribute(klass: string, attr: string) {
  debug.log('[serverNote] clearing attribute', klass, attr);
  const clicked = document.querySelectorAll(`.${klass}[${attr}]`);
  clicked.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    node.removeAttribute(attr);
  });
}

/** Attach click event listener for all opponent corp root cards */
function watchAllRootCards() {
  debug.log('[serverNote] adding click tracker for installed cards');
  const cards = document.querySelectorAll('.corp-board.opponent .server .server-card');
  let count = 0;
  cards.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    count += watchCard(node as Element);
  });
  debug.log(`[serverNote] added watcher for ${count} cards`);
}

function markAllRezzedCards() {
  const cards = document.querySelectorAll('.corp-board.opponent .server .server-card');
  const ices = document.querySelectorAll('.corp-board.opponent .server .ice');
  let count = 0;
  cards.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const card = node as Element;
    if (card.hasAttribute(ATTR_CARD_NAME)) return;
    const name = card.querySelector(':scope .cardname')?.textContent;
    if (card && name) annotate(card, name);
    count += 1;
  });
  ices.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const card = node as Element;
    if (card.hasAttribute(ATTR_CARD_NAME)) return;
    const name = card.querySelector(':scope .cardname')?.textContent;
    if (card && name) annotate(card, name);
    count += 1;
  });
  debug.log(`[serverNote] annotated ${count} cards`);
}
