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
const PATTERNS_OPEN_INSTALL = [
  // Drafter, Powers, Ingatan
  /install (?<card>.*) from /,
  // Synapse
  /uses Synapse Global: Faster than Thought to reveal (?<card>.*) from HQ/,
];
const PATTERNS_ACCESS = [
  // Remotes. Will not handle stacked servers (they are always rezzed anyway)
  /access(?:es)? (?<card>.*) from (?<server>Server \d+)/,
  /access(?:es)? (?<card>.*) from the root of (?:the )?(?<server>R&D|Archives|HQ)\./,
];
const PATTERN_REFUSE = /do(?:es)? not access/;
const ATTR_WATCH = 'cyberfeeder-servernote-watch';
const ATTR_CLICK_AGE = 'cyberfeeder-clicked';
const ATTR_CARD_NAME = 'cyberfeeder-cardname';
const ATTR_CANDIDATE = 'cyberfeeder-candidate';
const ATTR_ONGOING_BREACH = 'cyberfeeder-breaching';
const ATTR_DATA_CARD = 'data-card-title';
const CHAT_HISTORY_TIME_LIMIT = 200;
const CHAT_HISTORY_LIMIT = 5;

const chatHistory: chat.ChatMessage[] = [];

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
  chatHistory.length = 0;
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

  appendChat(event.detail);
  debug.log(event.detail.text);
  if (event.detail.text.match(PATTERN_REFUSE)) {
    // find which card it was
  }
  const result = findAccessedCard(event.detail);
  if (result) {
    annotate(result.card, result.name);
    result.card.removeAttribute(ATTR_CANDIDATE);
    return;
  }
  const refused = findRefusedCard(event.detail);
  if (refused) refused.removeAttribute(ATTR_CANDIDATE);
}

function findRefusedCard(detail: chat.ChatMessage): Element | null {
  const server = document.querySelector(`[${ATTR_ONGOING_BREACH}]`);
  if (!server) return null;
  const candidates = findCandidates(server, detail.age);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return associateClickedCard(candidates);
}

function findAccessedCard(detail: chat.ChatMessage): AnnotationRequest | null {
  let match: RegExpMatchArray | null = null;
  for (const pattern of PATTERNS_ACCESS) {
    match = detail.text.match(pattern);
    if (match) break;
  }
  if (!match) return null;
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
  const target = associateClickedCard(candidates);
  if (!target) {
    debug.log('[serverNote] there is no target to annotate');
    return null;
  }
  return {card: target, name: cardName};
}

function associateClickedCard(cards: Element[]) {
  let latest = 0;
  let target: Element | null = null;
  for (const card of cards) {
    const ageText = card.getAttribute(ATTR_CLICK_AGE);
    if (!ageText) continue;
    const timestamp = parseInt(ageText);
    if (!isFinite(timestamp)) continue;
    if (timestamp < latest) continue;
    target = card;
    latest = timestamp;
  }
  return target;
}

function findOpenInstall() {
  debug.log('[serverNote] looking for open install...');
  if (!chatHistory) return null;
  // consume current chat history. Continue even after a match is found.
  let msg: chat.ChatMessage | undefined;
  let match: RegExpMatchArray | null = null;
  while (chatHistory.length > 0) {
    const _msg = chatHistory.shift();
    if (match) continue;
    if (!_msg) continue;
    for (const pattern of PATTERNS_OPEN_INSTALL) {
      const _match = _msg.text.match(pattern);
      if (_match) {
        debug.log('[serverNote] found match from', _msg.text);
        msg = _msg;
        match = _match;
        break;
      }
    }
  }
  if (!msg) return null;
  if (!match) return null;
  if (!match.groups) return null;
  const cardName = match.groups['card'];
  let verifiedName: string | null = null;
  // verify that the captured cardname is a valid card
  const query = msg.element.querySelectorAll(`:scope [${ATTR_DATA_CARD}]`);
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

/** store recent chat messages in an array */
function appendChat(msg: chat.ChatMessage) {
  const now = Date.now();
  if (chatHistory.length === 0) {
    chatHistory.push(msg);
    return;
  }
  while (chatHistory.length >= CHAT_HISTORY_LIMIT) {
    chatHistory.shift();
  }
  while (chatHistory.length > 0 && now - chatHistory[0].when > CHAT_HISTORY_TIME_LIMIT) {
    chatHistory.shift();
  }
  chatHistory.push(msg);
}

/** When a new card is installed in root, attach click listener on it */
function installHandler(e: Event) {
  const event = e as CustomEvent<board.InstallEvent>;
  if (!event.detail) return;
  if (!event.detail.isIce && event.detail.server.hasAttribute(ATTR_ONGOING_BREACH)) {
    debug.log('[serverNote] breach is ongoing, adding card to candidates', event.detail.card);
    event.detail.card.setAttribute(ATTR_CANDIDATE, '');
  }
  const name = findOpenInstall();
  if (name) annotate(event.detail.card, name);
  if (event.detail.isIce) return;
  watchCard(event.detail.card);
  debug.log('[serverNote] install detected, watching card', event.detail.card);
}

/** When a card goes face up, set attribute for it */
function faceupHandler(e: Event) {
  const event = e as CustomEvent<board.FaceupEvent>;
  if (!event.detail) return;
  debug.log('[serverNote] faceup detected', event.detail.card);
  // always annotate, as this is the best knowledge.
  annotate(event.detail.card, event.detail.name, true);
}

function annotate(card: Element, name: string, overwrite?: boolean) {
  if (name === '') return;
  debug.log('[serverNote] annotated card', card);
  if (!card.hasAttribute(ATTR_CARD_NAME) || overwrite) {
    card.setAttribute(ATTR_CARD_NAME, name);
    void window.getComputedStyle(card, '::after').content;
  }
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
  // always annotate if name is available -- this is the best information
  cards.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const card = node as Element;
    const name = card.querySelector(':scope .cardname')?.textContent;
    if (card && name) annotate(card, name, true);
    count += 1;
  });
  ices.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const card = node as Element;
    const name = card.querySelector(':scope .cardname')?.textContent;
    if (card && name) annotate(card, name, true);
    count += 1;
  });
  debug.log(`[serverNote] annotated ${count} cards`);
}
