import * as util from './util';
import * as watcher from './secretPanelWatcher';

type MatchType = string | RegExp;

/**
 * Finding a match in these patterns will prompt chat observer to look for secret information and add it to metadata
 */
const secrets: KnownSecrets[] = [
  {
    patterns: ['unseen card from R&D'],
    dispatch: handleRnDAccess,
  },
  {
    patterns: [
      // moving cards to bottom of deck
      'adds one to the bottom of the stack',
      /add( \d+)? cards? from HQ to the bottom of R&D/,
    ],
    dispatch: handleBottom,
  },
  {
    patterns: [
      // looking at the top cards of the stack or R&D
      /looks? at the top( \d+)? cards? of/,
      /rearranges? the top( \d+)? cards? of/,
      /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(HQ|R&D|Archives|Server|stack|Stack)\b/,
    ],
    dispatch: handleTop,
  },
];

interface KnownSecrets {
  patterns: MatchType[];
  dispatch: (message: Element) => void;
  validate?: string | RegExp;
}

export function processMessage(message: Element) {
  const msg = message.textContent;
  if (!msg) {
    return;
  }
  for (const secret of secrets) {
    for (const pattern of secret.patterns) {
      const match = msg.match(pattern);
      if (match) {
        secret.dispatch(message);
        return;
      }
    }
  }
}

/** R&D accesses information can always be fetched from currently visible panel */
function handleRnDAccess(message: Element) {
  const panel = util.getCommandPanelInfo();
  if (panel && watcher.matchSecret(panel)) {
    addChatSecretData(message, panel.text, 'rnd');
  }
}

function handleBottom(message: Element) {
  const panel = watcher.fetchSecret(message);
  if (panel) {
    addChatSecretData(message, panel.text, panel.location);
    return;
  }
  let count = 1;
  const selections: string[] = [];
  while (count > 0) {
    const button = watcher.lastClicks.pop();
    const chatAge = util.getChatAge();
    if (button && util.withinAgeRange(button.age, chatAge, 2)) {
      selections.push(button.text);
    }
    count--;
  }
  if (selections.length > 0) {
    addChatSecretData(message, selections.join(', '), 'unknown');
  }
}

function handlePeek(message: Element) {
  const panel = watcher.fetchSecret(message);
  if (panel) {
    addChatSecretData(message, panel.text, panel.location);
  }
}

/**
 * Add secret metadata to the latest chat message
 */
function addChatSecretData(message: Element, text: string, target: util.Location) {
  if (message.hasAttribute('secret')) {
    console.log('[Cyberfeeder] Skipping secret data attribute, it already has one');
    return;
  }
  message.setAttribute('secret', `(Secret: ${text})`);
  message.classList.add(target);
  message.classList.add('secret');
}
