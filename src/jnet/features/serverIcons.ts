import {changePanelEvent, ChangePanel} from '../watchers/command';
import {hand} from '../watchers';
import * as debug from '../debug';

const panelObserver = new MutationObserver(panelMutationHandler);
const handObserver = new MutationObserver(() => handMutationHandler(false));
let panel: Element | undefined;
const remoteRegex = /Server (?<num>[0-9]+)/;
const numberRegex = /(\d+)/g;
const centrals = ['Archives', 'HQ', 'R&D'];

export function enable() {
  document.addEventListener(changePanelEvent, newPanelHandler);
  const panel = document.querySelector('.right-inner-leftpane .button-pane');
  if (panel) {
    panelMutationHandler(null, null, true);
    panelObserver.observe(panel, {childList: true, subtree: true, characterData: true});
  }

  document.addEventListener(hand.eventName, newHandHandler);
  handMutationHandler(true);
  const container = document.querySelector('.me .hand-container > .hand-controls > .hand > div');
  if (container) {
    handObserver.observe(container, {subtree: true, childList: true});
  } else {
    debug.warn('[serverIcons] Could not find hand container for initial observer start');
  }
}

export function disable() {
  document.removeEventListener(changePanelEvent, newPanelHandler);
  document.removeEventListener(hand.eventName, newHandHandler);
  panelObserver.disconnect();
  handObserver.disconnect();
}

function newPanelHandler(e: Event) {
  const event = e as CustomEvent<ChangePanel>;
  if (!event.detail || event.detail.type !== changePanelEvent) return;

  panelObserver.disconnect();
  panel = event.detail.root;
  panelMutationHandler(null, null, true);
  panelObserver.observe(panel, {childList: true, subtree: true, characterData: true});
  debug.log('[serverIcons] got new panel, now watching', panel);
}

function panelMutationHandler(_1: unknown, _2: unknown, override = false) {
  if (!panel) {
    debug.log('[serverIcons] There is no panel to observe');
    return;
  }
  const serversMenu = panel.querySelector(':scope .servers-menu');
  const outerButtons = panel.querySelectorAll(':scope > .panel > button');
  outerButtons.forEach(element => handleButton(element, override));
  if (serversMenu) {
    const innerButtons = serversMenu.querySelectorAll(':scope li');
    innerButtons.forEach(element => handleButton(element, override));
  }
}

function handleButton(button: Element, override = false) {
  if (!button.textContent) return;
  if (isMatching(button) && !override) {
    debug.log('[serverIcons] button already has matching icon, skip');
    return;
  }
  const server = findTargetServer(button.textContent);
  if (!server) {
    button.querySelectorAll(':scope > i').forEach(e => e.remove());
    debug.log('[serverIcons] server icon no longer matches a server, remove icons');
    return;
  }

  if (!isMatching(button) || override) {
    button.querySelectorAll(':scope > i').forEach(e => e.remove());
    addServerIcon(button, button.textContent);
    button.setAttribute('target-server', button.textContent);
  }

  if (button.getAttribute('target-server-event') !== 'yes' || override) {
    button.setAttribute('target-server-event', 'yes');
    button.addEventListener('mouseover', () => {
      if (!button.textContent) return;
      const server = findTargetServer(button.textContent);
      server?.classList.remove('server-highlight');
      server?.classList.add('server-highlight');
    });
    button.addEventListener('mouseout', () => {
      if (!button.textContent) return;
      const server = findTargetServer(button.textContent);
      server?.classList.remove('server-highlight');
    });
  }
}

function isMatching(button: Element): boolean {
  return button.getAttribute('target-server') === button.textContent;
}

function findTargetServer(text: string) {
  const servers = document.querySelectorAll('.corp-board > div.server');
  if (!servers) return;

  // check centrals first
  if (centrals.includes(text)) {
    for (const server of Array.from(servers)) {
      const label = server.querySelector(':scope .content .server-label');
      if (label?.textContent?.includes(text)) return server;
    }
  }

  // check remotes
  const targetMatch = text.match(remoteRegex);
  if (!targetMatch || !targetMatch.groups) return;
  const target = targetMatch.groups['num'];
  for (const server of Array.from(servers)) {
    const label = server.querySelector(':scope .content .server-label');
    if (!label) continue;
    if (!label.textContent?.includes('Server')) continue;
    const match = label.textContent?.match(numberRegex);
    if (match && match.includes(target)) return server;
  }
  return;
}

function addServerIcon(e: Element, text: string) {
  const icon = document.createElement('i');
  icon.setAttribute('style', 'pointer-event: none; visibility: hidden;');

  switch (true) {
    case text === 'Archives':
      icon.classList.add('fa-solid', 'fa-server', 'icon-archives');
      break;
    case text === 'R&D':
      icon.classList.add('fa-solid', 'fa-flask', 'icon-rnd');
      break;
    case text === 'HQ':
      icon.classList.add('fa-sharp', 'fa-solid', 'fa-building', 'icon-hq');
      break;
    case !!text.match(remoteRegex):
      icon.classList.add('fa-sharp', 'fa-solid', 'fa-network-wired', 'icon-remote');
      break;
  }
  e.appendChild(icon);
}

function newHandHandler(e: Event) {
  const event = e as CustomEvent<hand.Hand>;
  if (!event.detail || event.detail.type !== hand.eventName) return;
  if (event.detail.side !== 'me') return;

  handObserver.disconnect();
  handMutationHandler(true);
  handObserver.observe(event.detail.element, {subtree: true, childList: true});
  debug.log('[serverIcons] got new hand container,', event.detail.element);
}

function handMutationHandler(override: boolean) {
  const cards = document.querySelectorAll('.me .hand-container .card-wrapper');
  if (!cards) return;
  debug.log('[serverIcons] Card mutation detected, renewing target highlights');

  for (const card of Array.from(cards)) {
    const serversMenu = card.querySelector(':scope .servers-menu');
    if (!serversMenu) continue;
    const buttons = serversMenu.querySelectorAll(':scope li');
    buttons.forEach(element => handleButton(element, override));
  }
}
