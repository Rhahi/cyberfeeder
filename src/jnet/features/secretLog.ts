import * as util from './util';

interface SecretPattern {
  matcher: string | RegExp;
  dispatch: (chat: Element, info: PanelInfo) => void;
}

const secretPatterns: SecretPattern[] = [
  {
    matcher: 'unseen card from R&D',
    dispatch: handleRnDAccess,
  },
];

interface PanelInfo {
  card?: string;
  text?: string;
  buttons: string[];
}

export function processMessage(chat: Element) {
  console.log('process');
  const msg = chat.textContent;
  if (!msg) {
    return;
  }
  console.log(msg);
  const panel = parseCommandPanel();
  if (!panel) {
    return;
  }
  console.log(panel);
  const shouldRescroll = util.isFullyDown(chat);
  for (const pattern of secretPatterns) {
    const match = msg.match(pattern.matcher);
    console.log(match);
    if (!match) {
      continue;
    }
    pattern.dispatch(chat, panel);
    break;
  }
  if (shouldRescroll) {
    chat.scrollTop = chat.scrollHeight;
  }
}

function parseCommandPanel() {
  const panel = util.getCommandPanel();
  if (!panel) {
    return;
  }
  const info: PanelInfo = {
    card: getPanelCardName(panel),
    text: getPanelText(panel),
    buttons: getPanelButtons(panel),
  };
  return info;
}

function getPanelCardName(panel: Element) {
  const card = panel.querySelector(':scope > .panel > div:first-child > span.fake-link');
  if (card?.textContent) {
    return card.textContent;
  }
  return;
}

function getPanelText(panel: Element) {
  const text = panel.querySelector(':scope > .panel > h4');
  if (text?.textContent) {
    return text.textContent;
  }
  return;
}

function getPanelButtons(panel: Element) {
  const buttons: string[] = [];
  const elements = panel.querySelectorAll(':scope > .panel > button');
  elements.forEach(button => {
    if (button.textContent) {
      buttons.push(button.textContent);
    }
  });
  return buttons;
}

function handleRnDAccess(message: Element, info: PanelInfo) {
  if (!info.text) {
    return;
  }
  addChatSecretData(message, info.text, 'run-rnd');
}

/**
 * Inspect run arrow to determine target server
 */
function getRunServer(): util.RunTarget {
  const arrow = util.getArrow();
  if (!arrow) {
    return 'not-in-a-run';
  }

  let server = arrow.parentElement?.parentElement;
  if (server?.className === 'ices') {
    server = server.parentElement;
  }
  if (!server) {
    return 'run-unknown';
  }
  const archiveOrRnD = server.querySelector(':scope > .content > div[data-server]');
  if (archiveOrRnD) {
    const target = archiveOrRnD.getAttribute('data-server');
    if (target === 'R&D') {
      return 'run-rnd';
    }
    if (target === 'Archives') {
      return 'run-archives';
    }
    return 'run-unknown';
  }
  const HQ = server.querySelector(':scope > .content > .identity');
  if (HQ) {
    return 'run-hq';
  }
  const remote = server.querySelector(':scope > .content > .server-label');
  if (remote) {
    if (remote.textContent?.includes('Server')) {
      return 'run-remote';
    }
  }
  return 'run-unknown';
}

/**
 * Add secret metadata to the latest chat message
 */
function addChatSecretData(message: Element, text: string, target: util.RunTarget) {
  if (message.hasAttribute('secret')) {
    console.log('[Cyberfeeder] Skipping secret data attribute, it already has one');
    return;
  }
  message.setAttribute('secret', `(Secret: ${text})`);
  message.classList.add(target);
}
