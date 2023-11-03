import * as util from './util';

export function enable() {
  const panel = util.getCommandPanel();
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

export function disable() {
  const element = util.getCommandPanel();
  if (element?.getAttribute('secret') === 'on') {
    element.setAttribute('secret', 'off');
  }
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

function appendChat(text: string, target: string) {
  const chat = util.getChat();
  if (!chat) {
    return;
  }
  const lastMessage = chat.lastChild;
  if (!lastMessage || lastMessage.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const shouldRescroll = util.isFullyDown(chat);
  const element = lastMessage as Element;
  if (element.hasAttribute('secret')) {
    console.log('already has attribute');
    return;
  }
  element.setAttribute('secret', `(Secret: ${text})`);
  element.classList.add(target);
  if (shouldRescroll) {
    chat.scrollTop = chat.scrollHeight;
  }
}
