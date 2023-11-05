import * as util from './util';

type MatchType = string | RegExp;

const genericButtons = ['Remove Tag', 'Run', 'Draw', 'Gain Credit', 'Done', 'No'];
const maybeSecretPatterns: MatchType[] = [
  // these text will be excluded from being cached
  /^You accessed (?<card>.*)\.$/,
  /^Add (?<card>.*) to bottom of (?:the )?(?<location>stack)\?$/,
  /top (?<number> \d)? cards? of (?:the )?(?<location>stack|R&D) (?:is|are|will be) (?<card>.*)$/,
];
export const lastClicks: string[] = [];
export let lastSecret: util.PanelInfo = {age: -1, text: '', buttons: [], location: 'unknown'};

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

/** Given current chat message div, get secret information from cached secret of current panel */
export function fetchSecret(message: Element, ageThreshold = 5) {
  const panel = util.getCommandPanelInfo();
  if (matchSecret(panel)) {
    return panel;
  }
  const currentAge = util.getChatAge(message);
  if (currentAge - lastSecret.age > ageThreshold || lastSecret.age > currentAge) {
    console.log(`rejected by age CUR${currentAge}, PAN${lastSecret.age}`);
    return;
  }
  if (matchSecret(lastSecret)) {
    return lastSecret;
  }
  return;
}

/** Scan given panel and if it matches secret profile, update its match field and return true */
export function matchSecret(panel: util.PanelInfo | undefined) {
  if (panel && panel.text) {
    for (const pattern of maybeSecretPatterns) {
      const match = panel.text.match(pattern)
      if (match) {
        panel.match = match;
        return true;
      }
    }
  }
  return false;
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
