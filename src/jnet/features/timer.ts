import {chat, clock, base} from '../watchers';
import * as debug from '../debug';
import {ChatMessage} from '../watchers/chat';

type Side = 'corp' | 'runner' | 'unknown';
interface Time {
  h: number;
  m: number;
  s: number;
}

interface Clock {
  container: HTMLElement;
  current: HTMLElement | null;
  corp: HTMLElement;
  runner: HTMLElement;
  side: Side;
}

interface ClockState {
  side: Side;
  corp: SideClockState;
  runner: SideClockState;
  initial?: number;
}

interface SideClockState extends OptionalSideClockState {
  seconds: number;
  offset: number;
  span: number;
  committed: number;
}

interface OptionalSideClockState {
  seconds?: number;
  offset?: number;
  span?: number;
  committed?: number;
}

const turnRegex = /(?:started|ending) .* turn|wins the game/;
const timeRegex = /\[?(\d+:)(\d+):(\d{1,2})\]?/;
const SideAttribute = 'side';
const OffsetAttribute = 'offset';
const SpanAttribute = 'span';
const SecondsAttribute = 'total';
const CommittedAttribute = 'committed';
const divId = 'cyberfeeder-timer';
let reverseChatHandleCounter = 0;
const reverseChatHandleDelay = 0.1;
const secondsInCycle = 86400;
let lastProcessedRealTime: number | null = null;
let cycles = 0;
let highestSeconds = 0;
let gameEnd = false;

const menuWatcher = (event: Event) => {
  base.conditionalExecuter({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    callback: enable => {
      if (enable) refresh();
    },
  });
};

export function enable() {
  document.addEventListener(base.eventName, menuWatcher);
  document.addEventListener(chat.eventName, chatHandler);
  document.addEventListener(chat.eventNameReversed, chatHandler);
  document.addEventListener(clock.eventName, clockHandler);
}

export function disable() {
  document.removeEventListener(base.eventName, menuWatcher);
  document.removeEventListener(chat.eventName, chatHandler);
  document.removeEventListener(chat.eventNameReversed, chatHandler);
  document.removeEventListener(clock.eventName, clockHandler);
}

function createClock(): Clock | null {
  const div = document.querySelector('.right-inner-leftpane')?.firstChild;
  if (!div) {
    debug.warn('[timer] could not find RIL, cannot make timer');
    return null;
  }
  const container = document.createElement('div');
  container.id = divId;
  container.setAttribute(SideAttribute, 'unknown');
  container.classList.add('hide-cyberfeeder-clock');
  const corp = createSideClock('corp');
  const runner = createSideClock('runner');
  container.appendChild(corp);
  container.appendChild(runner);
  if (div.firstChild) {
    div.insertBefore(container, div.firstChild);
  } else {
    div.appendChild(container);
  }
  debug.log('[timer] created new clock', container);
  return {container, side: 'unknown', current: null, corp, runner};
}

function createSideClock(side: Side) {
  const div = document.createElement('div');
  div.id = sideClockId(side);
  div.setAttribute(OffsetAttribute, '-1');
  div.setAttribute(SecondsAttribute, '0');
  div.setAttribute(CommittedAttribute, '0');
  div.setAttribute(SpanAttribute, '0');
  div.textContent = '00:00';
  return div;
}

function getClock(): Clock | null {
  const container = document.getElementById(divId);
  const runner = document.getElementById(sideClockId('runner'));
  const corp = document.getElementById(sideClockId('corp'));
  let side = container?.getAttribute(SideAttribute) as Side;
  let current: HTMLElement | null = null;
  if (side === 'corp') current = corp;
  else if (side === 'runner') current = runner;
  else side = 'unknown';
  if (container && runner && corp) return {container, side, current, runner, corp};
  if (!container) {
    const newClock = createClock();
    if (!newClock) debug.warn('[timer] failed to create new clock');
    return newClock;
  }
  return null;
}

function sideClockId(side: Side) {
  return `cyberfeeder-${side}-timer`;
}

function chatHandler(e: Event) {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail) return;
  if (!event.detail.system) return;
  if (event.detail.type === 'removed-chat') {
    reverseChatHandleCounter += 1;
    debug.log(`[timer] requested reverse chat handler. Current queue: ${reverseChatHandleCounter}`);
    setTimeout(backwardChatHandler, reverseChatHandleDelay);
    return;
  }
  if (event.detail.type !== 'new-chat') return;
  const isReplay = !document.querySelector('.right-inner-leftpane .timer');
  const time = chatTime(event.detail.element);
  if (!time) return; // can't do anything without time
  const clk = getClock();
  if (!clk) {
    debug.log('[timer] did not find Clock, skipping chat handler');
    return;
  }
  lastProcessedRealTime = clock.readTimer();
  updateDiff(clk, time);
  const didChange = forwardChatHandler(clk, event.detail, time);
  if (didChange) saveReplayClockStartTime(clk);
  if (isReplay) updateClocks(clk);
}

/** When new chat message arrives, identify current side and start time. Return true if side has changed */
function forwardChatHandler(clk: Clock, msg: ChatMessage, time: Time): boolean {
  const match = msg.text.match(turnRegex);
  if (!match) return false;
  if (msg.text.includes('wins the game')) {
    gameEnd = true;
    debug.log('[timer] game end detected');
    return false;
  }
  const side = imminentSide(msg.text, msg.element);
  debug.log(`[timer] got message '${msg.text}' with side '${side}'`);
  if (side === 'unknown') return false;

  const oldSide = clk.container.getAttribute(SideAttribute) || 'unknown';
  if (oldSide !== side) {
    clk.container.setAttribute(SideAttribute, side);
    if (side === 'runner') {
      update(clk.runner, {offset: toSeconds(time)});
      update(clk.corp, {span: 0});
    } else if (side === 'corp') {
      update(clk.corp, {offset: toSeconds(time)});
      update(clk.runner, {span: 0});
    } else {
      debug.warn(`[timer] expected to see corp/runner side, got '${side}'`);
      return false;
    }
    debug.log(`[timer] current side set to '${side}'`);
    return true;
  }
  return false;
}

function backwardChatHandler() {
  reverseChatHandleCounter -= 1;
  if (reverseChatHandleCounter > 0) {
    debug.log(`[timer] backward chat handling queue is at ${reverseChatHandleCounter}, skip.`);
    return;
  }
  reverseChatHandleCounter = 0;
  refresh();
}

function refresh() {
  gameEnd = false;
  const clk = getClock();
  if (!clk) return;
  const hst = parseHistory();
  debug.log(`[clock] parsed full chat history with result ${JSON.stringify(hst)}`);
  if (!hst) return;
  clk.container.setAttribute(SideAttribute, hst.side);
  update(clk.corp, hst.corp);
  update(clk.runner, hst.runner);
}

function clockHandler(e: Event) {
  if (gameEnd) return;
  const clk = getClock();
  if (!clk) return;
  const current = clk.current;
  if (!current) return;
  const event = e as CustomEvent<clock.Clock>;
  if (!event.detail) return;

  const state = parseState(current);
  let offset = 0;
  if (lastProcessedRealTime !== null) {
    offset = event.detail.seconds - lastProcessedRealTime;
  }
  update(current, {seconds: state.committed + state.span + offset});
}

/** Given a text and chat element that is a turn start/end text,
 * return whose turn it should be at point of this chat. */
function imminentSide(text: string | null, element: Element): Side {
  if (!text) return 'unknown';
  if (text.includes('ending')) {
    if (element.querySelector(':scope .corp-username')) return 'runner';
    if (element.querySelector(':scope .runner-username')) return 'corp';
  }
  if (text.includes('started')) {
    if (element.querySelector(':scope .corp-username')) return 'corp';
    if (element.querySelector(':scope .runner-username')) return 'runner';
  }
  return 'unknown';
}

/* Parse timestamp of this chat log element */
function chatTime(element: Element): Time | null {
  const timeSpan = element.querySelector(':scope .timestamp');
  let time: Time | null = null;
  if (timeSpan) {
    time = parseTime(timeSpan.textContent);
    debug.log(`[timer] parsed time from ${timeSpan.textContent}`);
  }
  if (!time) return null;
  return time;
}

/** Parse entire chat history to find each player's clock. */
function parseHistory(): ClockState | null {
  cycles = 0;
  const chatDiv = document.querySelector('.right-pane .panel > .log > .messages');
  if (!chatDiv) return null;
  let side: Side = 'unknown';
  const corp: SideClockState = {seconds: 0, offset: -1, span: 0, committed: 0};
  const runner: SideClockState = {seconds: 0, offset: -1, span: 0, committed: 0};
  chatDiv.childNodes.forEach(node => {
    if (gameEnd) return;
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (!element.querySelector(':scope .timestamp')) return;
    const _time = chatTime(element);
    if (!_time) return;
    const timestamp = toSeconds(_time);

    // update time span (offset + span = seconds)
    if (side === 'corp') {
      if (corp.offset < 0) corp.offset = timestamp;
      corp.span = timestamp - corp.offset;
    } else if (side === 'runner') {
      if (runner.offset < 0) runner.offset = timestamp;
      runner.span = timestamp - runner.offset;
    }

    // side has changed. Save absolute seconds and switch side
    const match = element.textContent?.match(turnRegex);
    if (!match) return;
    if (element.textContent?.includes('wins the game')) {
      gameEnd = true;
      debug.log('[timer] game end detected');
      return;
    }
    const newSide = imminentSide(element.textContent, element);
    if (side !== newSide) {
      if (newSide === 'corp') {
        corp.offset = timestamp;
        runner.committed += runner.span;
        runner.span = 0;
        side = newSide;
      } else if (newSide === 'runner') {
        runner.offset = timestamp;
        corp.committed += corp.span;
        corp.span = 0;
        side = newSide;
      }
    }
  });
  corp.seconds = corp.committed + corp.span;
  runner.seconds = runner.committed + runner.span;
  return {side, corp, runner};
}

function updateDiff(clk: Clock, time: Time) {
  const current = clk.current;
  if (!current) {
    debug.log('[timer] Current clock not found, skipping replay clock update');
    return;
  }
  const state = parseState(current);
  if (state.offset === -1) {
    update(current, {span: 0, offset: toSeconds(time)});
  } else {
    const diff = toSeconds(time) - state.offset;
    update(current, {span: diff});
  }
}

function updateClocks(clk: Clock) {
  const current = clk.current;
  if (!current) return;
  const state = parseState(current);
  update(current, {seconds: state.committed + state.span});
}

function saveReplayClockStartTime(clk: Clock) {
  const corp = parseState(clk.corp);
  const runner = parseState(clk.runner);
  update(clk.corp, {committed: corp.seconds});
  update(clk.runner, {committed: runner.seconds});
  debug.log(`[timer] set replay start time to corp=${corp.seconds}, runner=${runner.seconds}`);
}

function parseTime(text: string | null): Time | null {
  if (!text) return null;
  const match = text.match(timeRegex);
  if (!match) return null;
  if (match.length !== 4) return null;
  return {
    h: match[1] ? parseInt(match[1]) : 0,
    m: match[2] ? parseInt(match[2]) : 0,
    s: match[3] ? parseInt(match[3]) : 0,
  };
}

function update(element: HTMLElement, state: OptionalSideClockState) {
  if (element.parentElement && element.parentElement.id !== divId) return;
  if (typeof state.seconds !== 'undefined') {
    element.setAttribute(SecondsAttribute, `${state.seconds}`);
    element.textContent = toTimestamp(state.seconds);
  }
  if (typeof state.committed !== 'undefined') element.setAttribute(CommittedAttribute, `${state.committed}`);
  if (typeof state.span !== 'undefined') element.setAttribute(SpanAttribute, `${state.span}`);
  if (typeof state.offset !== 'undefined') element.setAttribute(OffsetAttribute, `${state.offset}`);
}

function parseState(element: HTMLElement) {
  const secondsString = element.getAttribute(SecondsAttribute) || '0';
  const seconds = parseInt(secondsString);
  const committedString = element.getAttribute(CommittedAttribute) || '0';
  const committed = parseInt(committedString);
  const spanString = element.getAttribute(SpanAttribute) || '0';
  const span = parseInt(spanString);
  const offsetString = element.getAttribute(OffsetAttribute) || '-1';
  const offset = parseInt(offsetString);
  return {seconds, committed, span, offset};
}

function toSeconds(time: Time): number {
  const seconds = time.h * 3600 + time.m * 60 + time.s;
  if (seconds < highestSeconds) {
    // handle clock overflow
    cycles += 1;
    highestSeconds = 0;
  } else {
    highestSeconds = seconds;
  }
  return seconds + secondsInCycle * cycles;
}

function toTimestamp(time: number | Time) {
  if (typeof time === 'number') {
    const seconds = `${time % 60}`.padStart(2, '0');
    const minutes = `${Math.floor(time / 60)}`.padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
  return toTimestamp(toSeconds(time));
}
