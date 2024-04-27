import {changePanelEvent, ChangePanel} from '../watchers/command';
import {hand} from '../watchers';
import * as debug from '../debug';

const panelObserver = new MutationObserver(panelMutationHandler);
const handObserver = new MutationObserver(handMutationHandler);
let panel: Element | undefined;

export function enable() {
  document.addEventListener(changePanelEvent, newPanelHandler);
  const panel = document.querySelector('.right-inner-leftpane .button-pane');
  if (panel) panelObserver.observe(panel, {childList: true, subtree: true});

  document.addEventListener(hand.eventName, newCardHandler);
  handMutationHandler(null, null, true);
}

export function disable() {
  document.removeEventListener(changePanelEvent, newPanelHandler);
  document.removeEventListener(hand.eventName, newCardHandler);
  panelObserver.disconnect();
  handObserver.disconnect();
}

function newPanelHandler(e: Event) {
  const event = e as CustomEvent<ChangePanel>;
  if (!event.detail || event.detail.type !== changePanelEvent) return;

  panelObserver.disconnect();
  panel = event.detail.root;
  panelObserver.observe(panel, {childList: true, subtree: true});
  panelMutationHandler();
  debug.log('[serverIcons] got new panel, now watching', panel);
}

function panelMutationHandler() {
  if (!panel) {
    debug.log('[serverIcons] There is no panel to observe');
    return;
  }
  const serversMenu = panel.querySelector(':scope .servers-menu');
  if (!serversMenu) return;
  const buttons = serversMenu.querySelectorAll(':scope li');
  buttons.forEach(element => handleButton(element));
}

function handleButton(button: Element, override = false) {
  if (!override && button.getAttribute('target-server-icon') === 'yes') return; // already has icon, skip
  if (!button.textContent) return;
  const server = findTargetServer(button.textContent);
  if (!server) return;

  if (button.getAttribute('target-server-icon') !== 'yes') addServerIcon(button, button.textContent);
  button.setAttribute('target-server-icon', 'yes');
  button.addEventListener('mouseover', () => server.classList.add('server-highlight'));
  button.addEventListener('mouseout', () => server.classList.remove('server-highlight'));
}

function findTargetServer(text: string) {
  const servers = document.querySelectorAll('.corp-board > div.server');
  if (!servers) return;
  for (const server of Array.from(servers)) {
    const label = server.querySelector(':scope .content .server-label');
    if (!label) continue;
    if (label.textContent?.includes(text)) return server;
  }
  return;
}

function addServerIcon(e: Element, text: string) {
  const icon = document.createElement('i');
  icon.setAttribute('style', 'pointer-event: none; visibility: hidden;');

  switch (true) {
    case text === 'Archives':
      icon.classList.add('fa-sharp', 'fa-solid', 'fa-building', 'icon-hq');
      break;
    case text === 'R&D':
      icon.classList.add('fa-solid', 'fa-flask', 'icon-rnd');
      break;
    case text === 'HQ':
      icon.classList.add('fa-solid', 'fa-server', 'icon-archives');
      break;
    case text.includes('Server'):
      icon.classList.add('fa-sharp', 'fa-solid', 'fa-network-wired', 'icon-remote');
      break;
  }
  e.appendChild(icon);
}

function newCardHandler(e: Event) {
  const event = e as CustomEvent<hand.Hand>;
  if (!event.detail || event.detail.type !== hand.eventName) return;

  handObserver.disconnect();
  handObserver.observe(event.detail.element, {subtree: true, childList: true});
  handMutationHandler(null, null, false);
  debug.log('[serverIcons] got new card,', event.detail.element);
}

function handMutationHandler(_1: unknown, _2: unknown, override = false) {
  const cards = document.querySelectorAll('.me .hand-container .card-wrapper');
  if (!cards) return;

  for (const card of Array.from(cards)) {
    const serversMenu = card.querySelector(':scope .servers-menu');
    if (!serversMenu) continue;
    const buttons = serversMenu.querySelectorAll(':scope li');
    buttons.forEach(element => handleButton(element, override));
  }
}
