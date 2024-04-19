import * as debug from '../debug';
import * as animation from './animation';
import {archive} from '../watchers';

const pileSelector = '.discard-container > .discard';
const eventName = 'animate-bin';
const archiveObserverOpponent = new MutationObserver(m => eventGenerator(m, 'opponent'));
const archiveObserverMe = new MutationObserver(m => eventGenerator(m, 'me'));
const heapRegex = /Heap \((?<faceUp>[0-9]+)\)/;
const archiveRegex = /Archives \((?<faceUp>[0-9]+)↑.*(?<faceDown>[0-9]+)↓\)/;

const animationGap = 150;
const animationDistance = 40;
const animationDuration = '0.3s';

let currentOpponentDiscardStat: DiscardStat = {faceUp: 0, faceDown: 0};
let currentMeDiscardStat: DiscardStat = {faceUp: 0, faceDown: 0};
let prevOpponentDiscardStat: DiscardStat = {faceUp: 0, faceDown: 0};
let prevMeDiscardStat: DiscardStat = {faceUp: 0, faceDown: 0};
type Side = 'me' | 'opponent';

interface DiscardStat {
  faceUp: number;
  faceDown: number;
}

interface Coordinate {
  top: number;
  left: number;
}

interface Metadata {
  cardName: string;
  isEntering: boolean;
  isFaceDown: boolean;
  isUnseen: boolean;
}

/** When archive container DOM is changed, restart the animation system */
const newArchiveHandler = (e: Event) => {
  const event = e as CustomEvent<archive.Archive>;
  if (!event.detail || event.detail.type !== archive.eventName) {
    return;
  }
  if (event.detail.side === 'me') {
    archiveObserverMe.disconnect();
    archiveObserverMe.observe(event.detail.element, {childList: true, subtree: true});
    return;
  }
  if (event.detail.side === 'opponent') {
    archiveObserverOpponent.disconnect();
    archiveObserverOpponent.observe(event.detail.element, {childList: true, subtree: true});
    return;
  }
};

export function enable() {
  document.addEventListener(archive.eventName, newArchiveHandler);
  document.addEventListener(eventName, animationHandlerOpponent);
  document.addEventListener(eventName, animationHandlerMe);
}

export function disable() {
  archiveObserverMe.disconnect();
  archiveObserverOpponent.disconnect();
  document.removeEventListener(archive.eventName, newArchiveHandler);
  document.removeEventListener(eventName, animationHandlerOpponent);
  document.removeEventListener(eventName, animationHandlerMe);
}

/** Detect animation condition and fire a bin animation event */
function eventGenerator(mutations: MutationRecord[], side: Side) {
  const sel = side === 'me' ? '.me ' + pileSelector : '.opponent ' + pileSelector;
  const discardPile = document.querySelector(sel);
  if (!discardPile) return;
  const distance = side === 'opponent' ? animationDistance : -animationDistance;
  const pendingEvents: CustomEvent<animation.Animation<Metadata>>[] = [];
  if (shouldIgnoreAnimations()) {
    debug.log('[animateBin] ignore animation on archive breach');
    return;
  }

  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      if (element.getAttribute('ghost') === 'yes') return;

      const event = new CustomEvent<animation.Animation<Metadata>>(eventName, {
        detail: {
          type: eventName,
          target: element,
          duration: animationDuration,
          source: {element: discardPile, offsetY: distance},
          destination: {element: discardPile},
          metadata: getCardMetadata(true, element),
        },
      });
      pendingEvents.push(event);
    });

    m.removedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      if (element.getAttribute('ghost') === 'yes') return;

      const event = new CustomEvent<animation.Animation<Metadata>>(eventName, {
        detail: {
          type: eventName,
          target: element,
          duration: animationDuration,
          source: {element: discardPile},
          destination: {element: discardPile, offsetY: distance},
          metadata: getCardMetadata(false, element),
        },
      });
      pendingEvents.push(event);
    });
  }
  updateDiscardStat(side);
  for (const event of pendingEvents) {
    if (shouldDispatchAnimation(event.detail, side)) document.dispatchEvent(event);
  }
}

function animationHandler(e: CustomEvent<animation.Animation<Metadata>>, delay: number) {
  const container = document.querySelector('#ghosts');
  if (!container) {
    debug.log('[animateBin] could not locate ghost container');
    return;
  }
  const ghost = e.detail.target.cloneNode(true) as Element;
  ghost.setAttribute('ghost', 'yes');
  ghost.classList.add('animate-bin');

  const from = getCssLocation(e.detail.source);
  const to = getCssLocation(e.detail.destination);
  const cssLocation = `top: ${from.top}px; left: ${from.left}px;`;
  const cssTransition = `transition-delay: ${delay}ms;`;
  const cssTransform = `transform: translateY(${to.top - from.top}px) translateX(${from.left - to.left}px); opacity: 0;`;
  ghost.setAttribute('style', cssLocation + cssTransition);
  container.appendChild(ghost);

  // give short sleep, since animation occurs only after the div's transform experiences a difference
  setTimeout(() => ghost.setAttribute('style', cssLocation + cssTransition + cssTransform), 10);
  setTimeout(() => container.removeChild(ghost), 1000);
}

/** Given a div, extract its bounding box and optional offsets to extract animation coordinates */
function getCssLocation(loc: animation.AnimationLocation): Coordinate {
  const box = loc.element.getBoundingClientRect();
  let top = box.top;
  let left = box.left;
  if (loc.offsetX) left = left + loc.offsetX;
  if (loc.offsetY) top = top + loc.offsetY;
  return {top, left};
}

let nextOpponentAnimationTime = Date.now();
function animationHandlerOpponent(e: Event) {
  const event = e as CustomEvent<animation.Animation<Metadata>>;
  if (!event.detail || event.detail.type !== eventName) return;

  const now = Date.now();
  const delay = clampAnimationDelay(now, nextOpponentAnimationTime);
  nextOpponentAnimationTime = Math.max(nextOpponentAnimationTime, now) + animationGap;
  animationHandler(event, delay);
}

let nextMeAnimationTime = Date.now();
function animationHandlerMe(e: Event) {
  const event = e as CustomEvent<animation.Animation<Metadata>>;
  if (!event.detail || event.detail.type !== eventName) return;

  const now = Date.now();
  const delay = clampAnimationDelay(now, nextMeAnimationTime);
  nextMeAnimationTime = Math.max(nextMeAnimationTime, now) + animationGap;
  animationHandler(event, delay);
}

function clampAnimationDelay(now: number, nextAnimationTime: number) {
  const delay = nextAnimationTime - now;
  if (delay > animationGap) return animationGap;
  if (delay < 0) return 0;
  return delay;
}

/** Identify whether the change detected in discard pile should be animated or not. */
function shouldDispatchAnimation(e: animation.Animation<Metadata>, side: Side): boolean {
  const previous = getPreviousDiscardStat(side);
  const current = getCurrentDiscardStat(side);

  if (e.metadata.isEntering) {
    if (e.metadata.isFaceDown && current.faceDown > previous.faceDown) return true;
    if (!e.metadata.isFaceDown && current.faceUp > previous.faceUp) return true;
    debug.log(`reject enter animation of ${e.metadata.cardName}`, previous, current);
    return false;
  } else {
    if (e.metadata.isFaceDown && current.faceDown < previous.faceDown) return true;
    if (!e.metadata.isFaceDown && current.faceUp < previous.faceUp) return true;
    debug.log(`reject exit animation of ${e.metadata.cardName}`, previous, current);
    return false;
  }
}

function getPreviousDiscardStat(side: Side): DiscardStat {
  if (side === 'me') return prevMeDiscardStat;
  if (side === 'opponent') return prevOpponentDiscardStat;
  return {faceUp: 0, faceDown: 0}; // should not happen
}

function getCurrentDiscardStat(side: Side): DiscardStat {
  if (side === 'me') return currentMeDiscardStat;
  if (side === 'opponent') return currentOpponentDiscardStat;
  return {faceUp: 0, faceDown: 0}; // should not happen
}

/** parse discard pile's header and extract information about faceup and facedown cards.
 *
 * Used to filter out errorneous animation events
 */
function getNewDiscardStat(side: Side): DiscardStat {
  const header = document.querySelector(`.${side} .discard-container .discard .header`)?.textContent;
  let faceUp = 0;
  let faceDown = 0;
  if (header) {
    const heapMatch = header.match(heapRegex);
    const archiveMatch = header.match(archiveRegex);
    if (heapMatch && heapMatch.groups) {
      faceUp = parseInt(heapMatch.groups['faceUp']);
    } else if (archiveMatch && archiveMatch.groups) {
      faceUp = parseInt(archiveMatch.groups['faceUp']);
      faceDown = parseInt(archiveMatch.groups['faceDown']);
    }
  } else {
    debug.log('[animateBin] Could not find discard pile header, animation will not work');
  }
  return {faceUp, faceDown};
}

/** helper function to update discard pile information once per a set of animation events */
function updateDiscardStat(side: Side) {
  if (side === 'me') {
    prevMeDiscardStat = currentMeDiscardStat;
    currentMeDiscardStat = getNewDiscardStat(side);
    return;
  }
  if (side === 'opponent') {
    prevOpponentDiscardStat = currentOpponentDiscardStat;
    currentOpponentDiscardStat = getNewDiscardStat(side);
    return;
  }
}

/** from given card div, extract card's metadata. Used to filter out errorenous animations */
function getCardMetadata(isEntering: boolean, card: Element): Metadata {
  const isUnseen = card.querySelector(':scope .unseen') ? true : false;
  const cardName = card.querySelector(':scope .cardname')?.textContent;
  const hasCardName = cardName ? true : false;
  const isFaceDown = isUnseen ? true : !hasCardName;
  const data = {cardName: cardName ? cardName : '', isEntering, isFaceDown, isUnseen};
  debug.log('[animateBin] card to be maybe animated ', card, data);
  return data;
}

function shouldIgnoreAnimations() {
  const lastChat = parseLatestChat();
  if (!lastChat) return false;
  if (lastChat.includes('breaches Archives')) return true;
  return false;
}

function parseLatestChat() {
  const systemMessages = document.querySelectorAll('.panel > .log > .messages > .system');
  const index = systemMessages.length - 1;
  const lastMessage = systemMessages.item(index);
  return chat.getText(lastMessage);
}
