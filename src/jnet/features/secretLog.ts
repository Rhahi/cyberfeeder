import * as util from './util';
import * as watcher from './secretPanelWatcher';

const secretPatterns: SecretPattern[] = [
  {
    matcher: 'unseen card from R&D',
    dispatch: handleRnDAccess,
  },
  {
    matcher: 'adds one to the bottom of the stack',
    dispatch: handleBottom,
  },
  {
    matcher: /looks? at the top( \d+)? cards? of/,
    dispatch: handlePeek,
  },
];

interface SecretPattern {
  matcher: string | RegExp;
  dispatch: (message: Element, info: util.PanelInfo) => void;
  validate?: string | RegExp;
}

export function processMessage(chat: Element) {
  const msg = chat.textContent;
  if (!msg) {
    return;
  }
  const panel = util.getCommandPanelInfo();
  if (!panel) {
    return;
  }
  console.log(msg);
  console.log(panel);
  for (const pattern of secretPatterns) {
    const match = msg.match(pattern.matcher);
    if (!match) {
      continue;
    }
    pattern.dispatch(chat, panel);
    break;
  }
}

function handleRnDAccess(message: Element, info: util.PanelInfo) {
  if (info.text === '') {
    return;
  }
  addChatSecretData(message, info.text, 'rnd');
}

function handleBottom(message: Element, info: util.PanelInfo) {
  const text = watcher.lastClicks.pop();
  console.log(`-> Handle Bottom: ${text}`);
  if (text) {
    addChatSecretData(message, text, info.location);
  }
}

function handlePeek(message: Element, info: util.PanelInfo) {
  if (!info.text) {
    console.log('-> handlePeek');
    console.log(watcher.lastSecret);
    const panel = watcher.lastSecret.panel;
    if (!watcher.lastSecret.handled) {
      if (panel.text) {
        addChatSecretData(message, panel.text, panel.location);
        watcher.lastSecret.handled = true;
        return;
      }
    }
  } else {
    addChatSecretData(message, info.text, info.location);
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
}
