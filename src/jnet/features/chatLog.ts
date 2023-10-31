const turnRegex = /turn\s+(\d+)/;
const accessRegex = /accesses.*(?:from|in)\s+(HQ|R&D|Archives|Server)/;
const rndRegex = /You accessed +(.*)\./;

type Option = 'turnhighlight' | 'accesshighlight' | 'actionhighlight';
type RunTarget = 'run-rnd' | 'run-hq' | 'run-archives' | 'run-remote' | 'run-unknown' | 'not-in-a-run';

export function enable(type: Option) {
  const chat = getChat();
  if (!chat) {
    console.warn('Could not find chat');
    return;
  }
  chat.setAttribute(type, 'on');
  const newChatObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (type === 'turnhighlight') {
          turnHighlight(node as Element);
          return;
        }
        if (type === 'accesshighlight') {
          accessHighlight(node as Element);
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
  const element = getChat();
  if (element?.getAttribute(type) === 'on') {
    element.setAttribute(type, 'off');
  }
}

export function secretEnable() {
  const panel = getPanel();
  if (!panel) {
    console.warn('Could not find control');
    return;
  }
  panel.setAttribute('secret', 'on');
  const panelObserver = new MutationObserver(mutations => {
    let done = false;
    for (const m of mutations) {
      if (done) {
        return;
      }
      // check newly added nodes for target text
      m.addedNodes.forEach(node => {
        if (done) {
          return;
        }
        done = processSecretNode(node);
      });
      if (done) {
        return;
      }
      done = processSecretNode(m.target);
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

export function secretDisable() {
  const element = getPanel();
  if (element?.getAttribute('secret') === 'on') {
    element.setAttribute('secret', 'off');
  }
}

function turnHighlight(node: Element) {
  const text = node.textContent;
  if (text && text.includes('started their turn')) {
    const turn = findTurnInformation(text);
    if (turn !== 'unknown') {
      node.setAttribute('turn', turn);
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

function accessHighlight(node: Element) {
  const text = node.textContent;
  if (text && text.includes('accesses')) {
    const target = findAccessTarget(text);
    if (target !== 'run-unknown') {
      node.classList.add(target);
    }
  }
}

function findAccessTarget(text: string): RunTarget {
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

function getChat() {
  return document.querySelector('.panel > .log > .messages');
}

function getPanel() {
  return document.querySelector('.leftpane .inner-leftpane .right-inner-leftpane .button-pane');
}

function processSecretNode(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const element = node as Element;
  let candidate: string | null | undefined;
  if (element.className === 'panel blue-shade') {
    candidate = element.querySelector(':scope > h4')?.textContent;
  } else if (element.tagName === 'h4') {
    candidate = element.textContent;
  }
  if (candidate) {
    if (candidate.includes('You accessed') && getRunServer() === 'run-rnd') {
      appendChat(candidate, 'R&D');
      return true;
    }
  }
  return false;
}

function getRunServer(): RunTarget {
  const arrow = document.querySelector('.run-arrow');
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

function appendChat(text: string, target: string) {
  const chat = getChat();
  if (!chat) {
    return;
  }
  const lastMessage = chat.lastChild;
  if (!lastMessage || lastMessage.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const element = lastMessage as Element;
  if (element.hasAttribute('secret')) {
    console.log('already has attribute');
    return;
  }
  element.setAttribute('secret', `(Secret: ${text})`);
  element.classList.add(target);
}
