import * as util from './util';

interface CommandButton {
  text: string;
  age: number;
}

type MatchType = string | RegExp;
const doNotRecord = ['None', 'Cancel', 'Yes', 'No', 'Done'];
const maybeSecretPatterns: MatchType[] = [
  // these text will be excluded from being cached
  /^You accessed (?<card>.*)\.(?:$| Pay| Trash| Shuffle| Add| Spend)/,
  /^Add (?<card>.*) to bottom of (?:the )?(?<location>stack)\?$/,
  /top (?<number>\d )?cards? of (?:the )?(?<location>stack|R&D) (?:is|are|will be) (?<card>.*)$/,
];
export const lastClicks: CommandButton[] = [];
export let lastSecret: util.PanelInfo = {age: -1, text: '', buttons: [], location: 'unknown'};

export function enable() {
  const panel = util.getCommandPanel();
  if (!panel) {
    console.warn('[Cyberfeeder] Could not find control panel');
    return;
  }
  panel.setAttribute('secret', 'on');
  const panelObserver = new MutationObserver(mutations => {
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
    if (panel.getAttribute('secret') !== 'on') {
      panelObserver.disconnect();
      toggleFeatureObserver.disconnect();
      panel.removeAttribute('secret');
      console.log('[Cyberfeeder] Secret panel watcher has been disabled');
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
export function fetchSecret(message: Element, ageThreshold = 2) {
  const panel = util.getCommandPanelInfo();
  if (matchSecret(panel)) {
    return panel;
  }
  const currentAge = util.getChatAge(message);
  if (!util.withinAgeRange(lastSecret.age, currentAge, ageThreshold)) {
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
      const match = panel.text.match(pattern);
      if (match) {
        panel.match = match;
        return true;
      }
    }
  }
  return false;
}

function handleMutation(element: Element, isNew: boolean) {
  let didWatchButtons = false;
  if (element.tagName.toUpperCase() === 'SPAN') {
    // span changes are link styling, nothing to see here.
    return;
  }

  // entire panel has been changed or replaced
  if (element.className === 'panel blue-shade') {
    const panel = util.getCommandPanelInfo(element, '');
    updateSecretFromMutation(panel);
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

  // update secret's h4 text content
  else if (element.tagName.toUpperCase() === 'H4' && element.parentElement) {
    const panel = util.getCommandPanelInfo(element.parentElement, '');
    updateSecretFromMutation(panel);
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
}

function updateSecretFromMutation(panel: util.PanelInfo | undefined) {
  if (panel && matchSecret(panel)) {
    const groups = panel.match?.groups;
    if (groups) {
      const location = groups['location'];
      panel.location = util.toLocation(location);
    }
    lastSecret = panel;
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
      lastClicks.push({text: element.textContent, age: util.getChatAge()});
    }
  };
  element.addEventListener('click', tracker, {once: true});
  setTimeout(() => {
    // clean up the event after 2 minutes
    element.removeEventListener('click', tracker);
  }, 12000);
}
