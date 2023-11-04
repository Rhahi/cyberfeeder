import * as util from './util';

const turnRegex = /turn\s+(\d+)/;
const accessRegex = /accesses.*(?:from|in)\s+(HQ|R&D|Archives|Server)/;
const rndRegex = /You accessed +(.*)\./;

type Option = 'turnhighlight' | 'accesshighlight' | 'actionhighlight';

export function enable(type: Option) {
  const chat = util.getChat();
  if (!chat) {
    console.warn('[Cyberfeeder] Could not find chat');
    return;
  }
  chat.setAttribute(type, 'on');
  const newChatObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        const messageDiv = node as Element;
        if (!(messageDiv.tagName.toUpperCase() === 'DIV' && messageDiv.classList.contains('system'))) {
          // do not match user messages
          return;
        }
        if (type === 'turnhighlight') {
          turnHighlight(chat, messageDiv);
          return;
        }
        if (type === 'accesshighlight') {
          accessHighlight(messageDiv);
          return;
        }
        if (type === 'actionhighlight') {
          return;
        }
      });
    }
  });
  const toggleFeatureObserver = new MutationObserver(() => {
    if (chat.getAttribute(type) === 'off') {
      newChatObserver.disconnect();
      toggleFeatureObserver.disconnect();
      chat.removeAttribute(type);
    }
  });
  newChatObserver.observe(chat, {childList: true, subtree: true});
  toggleFeatureObserver.observe(chat, {attributes: true});
}

export function disable(type: Option) {
  const element = util.getChat();
  if (element?.getAttribute(type) === 'on') {
    element.setAttribute(type, 'off');
  }
}

function turnHighlight(chat: Element, message: Element) {
  const text = message.textContent;
  const shouldRescroll = util.isFullyDown(chat);
  if (text && text.includes('started their turn')) {
    const turn = findTurnInformation(text);
    if (turn !== 'unknown') {
      message.setAttribute('turn', turn);
    }
  }
  if (shouldRescroll) {
    chat.scrollTop = chat.scrollHeight;
  }
}

function findTurnInformation(text: string) {
  const match = text.match(turnRegex);
  if (match && match.length === 2) {
    return `Turn ${match[1]}`;
  }
  return 'unknown';
}

function accessHighlight(node: Element) {
  const text = node.textContent;
  if (text && text.includes('accesses')) {
    const target = findAccessTarget(text);
    if (target !== 'run-unknown') {
      node.classList.add(target);
    }
  }
}

function findAccessTarget(text: string): util.RunTarget {
  const match = text.match(accessRegex);
  if (match && match.length === 2) {
    const target = match[1];
    if (target === 'R&D') {
      return 'run-rnd';
    }
    if (target === 'HQ') {
      return 'run-hq';
    }
    if (target === 'Archives') {
      return 'run-archives';
    }
    if (target === 'Server') {
      return 'run-remote';
    }
  }
  return 'run-unknown';
}
