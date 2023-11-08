import * as util from './util';
import * as secretLog from './secretLog';

const turnRegex = /turn (\d+)/;
const accessRegex = /accesses .*(?:from|in) (?:the root of )?(HQ|R&D|Archives|Server)/;
const exposeRegex = /exposes .*(HQ|R&D|Archives|Server)/;
const revealRegex = /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(HQ|R&D|Archives|Server|stack)\b/;
const addRegex = /add .* to (HQ|R&D|Archives|grip|stack)/;

type Option = 'turnhighlight' | 'accesshighlight' | 'otherhighlight' | 'secret';

export function enable(type: Option) {
  const chat = util.getChat();
  if (!chat) {
    return;
  }
  chat.setAttribute(type, 'on');
  const newChatObserver = new MutationObserver(mutations => {
    // the tolerance here should be adjusted empirically
    const shouldRescroll = util.isFullyDown(chat, 20);
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
          turnHighlight(messageDiv);
          return;
        }
        if (type === 'accesshighlight') {
          highlight(messageDiv, type, accessRegex);
          return;
        }
        if (type === 'otherhighlight') {
          highlight(messageDiv, type, exposeRegex, revealRegex, addRegex);
          return;
        }
        if (type === 'secret') {
          secretLog.processMessage(messageDiv);
          return;
        }
      });
    }
    if (shouldRescroll) {
      chat.scrollTop = chat.scrollHeight;
    }
  });
  const toggleFeatureObserver = new MutationObserver(() => {
    if (chat.getAttribute(type) !== 'on') {
      newChatObserver.disconnect();
      toggleFeatureObserver.disconnect();
      toggleFeatureObserver.takeRecords();
      chat.removeAttribute(type);
      console.log(`[Cyberfeeder] ${type} has been disabled`);
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

function turnHighlight(message: Element) {
  const text = message.textContent;
  if (text && text.includes('started their turn')) {
    const turn = findTurnInformation(text);
    if (turn !== 'unknown') {
      message.setAttribute('turn', turn);
    }
  }
}

function findTurnInformation(text: string) {
  const match = text.match(turnRegex);
  if (match && match.length === 2) {
    return `Turn ${match[1]}`;
  }
  return 'unknown';
}

function highlight(message: Element, type: Option, ...patterns: RegExp[]) {
  const text = message.textContent;
  if (!text) {
    return;
  }
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match.length === 2) {
      const target = util.toLocation(match[1]);
      if (target !== 'unknown') {
        message.classList.add(target);
        message.classList.add(type);
        break;
      }
    }
  }
}
