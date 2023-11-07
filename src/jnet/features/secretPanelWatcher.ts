import * as util from './util';

type MatchType = string | RegExp;
const doNotRecord = ['None', 'Cancel', 'Yes', 'No', 'Done'];
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
    console.log('--- new mutation ---');
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // console.log('[addedNode]');
          handleMutation(node as Element, true);
        }
      });
      if (m.target.nodeType === Node.ELEMENT_NODE) {
        // console.log('[targetNode]');
        handleMutation(m.target as Element, false);
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
  const age = util.getChatAge();
  let didWatchButtons = false;

  // entire panel has been changed or replaced
  if (element.className === 'panel blue-shade') {
    const panel = util.getCommandPanelInfo(element, '');
    if (panel && matchSecret(panel)) {
      const groups = panel.match?.groups;
      if (groups) {
        const location = groups['location'];
        panel.location = util.toLocation(location);
      }
      lastSecret = panel;
    }
    const buttons = element.querySelectorAll(':scope > button');
    if (isNew) {
      buttons.forEach(b => {
        didWatchButtons = true;
        if (panel?.card) {
          watchButton(b);
        }
      });
    }
  }

  if (isNew && !didWatchButtons) {
    // assign watcher for all new buttons
    if (element.tagName.toUpperCase() === 'BUTTON') {
      watchButton(element);
    } else {
      const buttons = element.querySelectorAll(':scope button');
      buttons.forEach(b => {
        watchButton(b);
      });
    }
  }

  // update secret's h4 text content
  if (lastSecret.age === age) {
    let h4 = element.querySelector(':scope h4');
    if (element.tagName.toUpperCase() === 'H4') {
      h4 = element;
    }
    if (h4 && h4.textContent && lastSecret.text !== h4.textContent) {
      lastSecret.text = h4.textContent;
    }
  }
}

function watchButton(element: Element) {
  const text = element.textContent;
  if (!text) {
    return;
  }
  if (doNotRecord.includes(text)) {
    return;
  }
  const tracker = () => {
    if (element.textContent) {
      if (lastClicks.length > 7) {
        lastClicks.shift();
      }
      lastClicks.push(element.textContent);
    }
  };
  element.addEventListener('click', tracker, {once: true});
  setTimeout(() => {
    // clean up the event after 2 minutes
    element.removeEventListener('click', tracker);
  }, 12000);
}
