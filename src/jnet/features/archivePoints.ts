import * as archive from '../watchers/archive';
import * as cardDB from '../cardDB';
import * as debug from '../debug';

const selector = '.corp-board .discard-container .panel.popup';

const archiveObserver = new MutationObserver(archiveChangeHandler);

export function enable() {
  document.addEventListener(archive.eventName, newArchiveHandler);
  cardDB.load().catch();
}

export function disable() {
  archiveObserver.disconnect();
  document.removeEventListener(archive.eventName, newArchiveHandler);
  removeBanner();
}

const newArchiveHandler = (e: Event) => {
  const event = e as CustomEvent<archive.Archive>;
  if (!event.detail || event.detail.type !== archive.eventName) return;
  archiveObserver.disconnect();
  const container = document.querySelector(selector);
  if (container) {
    archiveObserver.observe(container, {childList: true, subtree: true});
    archiveChangeHandler();
  }
};

function archiveChangeHandler() {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn('[Cyberfeeder] Could not find discard pile, archive tracking will not work');
    return;
  }
  const cardDivs = container.querySelectorAll(':scope .cardname');
  let points = 0;
  cardDivs.forEach(div => {
    const name = div.textContent;
    if (!name) return;
    const card = cardDB.query(name);
    if (!card) return;
    if (card.type === 'Agenda') {
      const point = (card as cardDB.Agenda).agendapoints;
      if (point) points += point;
    }
  });
  setPoints(container, points);
}

function setPoints(container: Element, points: number) {
  const pile = container.parentElement;
  if (!pile) {
    debug.warn('[archivePoints] Could not find discard pile');
    return;
  }
  let banner = getBanner();
  if (!banner) banner = createBanner(pile);
  if (points === 0) {
    banner.classList.add('hidden');
  } else {
    banner.classList.remove('hidden');
  }
  const span = banner.querySelector(':scope > span');
  if (span) span.textContent = `${points}`;
}

const getBanner = () => document.querySelector('#archive-points');
const removeBanner = () => getBanner()?.remove();

function createBanner(pile: Element) {
  const div = document.createElement('div');
  div.id = 'archive-points';
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-trophy');
  const num = document.createElement('span');
  num.textContent = '0';
  div.appendChild(icon);
  div.appendChild(num);
  pile.appendChild(div);
  return div;
}
