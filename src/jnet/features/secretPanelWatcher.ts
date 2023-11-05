import * as util from './util';

const topCardRegex = /top(?: \d+)? cards? of (?:the )?(stack|R&D)/;
const genericButtons = ['Remove Tag', 'Run', 'Draw', 'Gain Credit', 'Done', 'No'];

export const lastClicks: string[] = [];
export const lastSecret: SecretPanelInfo = {
  age: 0,
  panel: {text: '', buttons: [], location: 'unknown'},
  handled: true,
};

interface SecretPanelInfo {
  age: number;
  panel: util.PanelInfo;
  handled: boolean;
}

export function enable() {
  const panel = util.getCommandPanel();
  if (!panel) {
    console.warn('[Cyberfeeder] Could not find control panel');
    return;
  }
  panel.setAttribute('secret', 'on');
  const panelObserver = new MutationObserver(mutations => {
    let done = false;
    console.log('--- new mutation ---');
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (!done && node.nodeType === Node.ELEMENT_NODE) {
          console.log('[addedNode]');
          done = handleMutation(node as Element, true);
        }
      });
      if (!done && m.target.nodeType === Node.ELEMENT_NODE) {
        console.log('[targetNode]');
        done = handleMutation(m.target as Element, false);
      }
    }
  });
  const toggleFeatureObserver = new MutationObserver(() => {
    if (panel.getAttribute('secret') === 'off') {
      panelObserver.disconnect();
      toggleFeatureObserver.disconnect();
      panel.removeAttribute('secret');
    }
  });
  panelObserver.observe(panel, {childList: true, subtree: true});
  toggleFeatureObserver.observe(panel, {attributes: true});
}

export function disable() {
  const element = util.getCommandPanel();
  if (element?.getAttribute('secret') === 'on') {
    element.setAttribute('secret', 'off');
  }
}

function handleMutation(element: Element, isNew: boolean) {
  console.log(element);
  const text = element.textContent;

  // the panel itself has been added or modified
  if (element.className === 'panel blue-shade') {
    const info = util.getCommandPanelInfo(element, '');
    if (info) {
      const match = info.text.match(topCardRegex);
      if (match) {
        info.location = util.toLocation(match[1]);
        lastSecret.panel = info;
        if (isNew) {
          lastSecret.age = 0;
          lastSecret.handled = false;
        } else {
          lastSecret.age += 1;
        }
      }
    }
    // add button monitoring for subitems
  }

  // text area is added or changed
  if (element.tagName.toUpperCase() === 'H4') {
    // do something
  }

  // buttons are added or changed
  if (element.tagName.toUpperCase() === 'BUTTON') {
    if (isNew) {
      if (text && !genericButtons.includes(text)) {
        console.log(`register monitor for ${text}`);
        monitorClick(element);
      }
    }
  }
  return false;
}

function monitorClick(element: Element) {
  element.addEventListener('click', () => {
    if (element.textContent) {
      if (lastClicks.length > 7) {
        lastClicks.shift();
      }
      lastClicks.push(element.textContent);
    }
  });
}
