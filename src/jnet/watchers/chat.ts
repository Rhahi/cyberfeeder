import * as base from './base';

export const eventName = 'new-chat';
export const eventNameReversed = 'removed-chat';

export interface ChatMessage {
  type: 'new-chat' | 'removed-chat';
  system: boolean;
  text: string;
  age: number;
  element: Element;
  when: number;
}

const newChatObserver = new MutationObserver(newChatHandler);
const menuWatcher = (event: Event) => {
  base.conditionalObserver({
    event,
    type: base.eventName,
    targetMode: 'gameview',
    observer: newChatObserver,
    selector: '.panel > .log > .messages',
    observeOptions: {childList: true},
  });
};

export function watch() {
  document.addEventListener(base.eventName, menuWatcher);
  const localEvent = base.createNavigationEvent();
  if (localEvent) menuWatcher(localEvent);
}

export function stop() {
  document.removeEventListener(base.eventName, menuWatcher);
  newChatObserver.disconnect();
}

function newChatHandler(mutations: MutationRecord[]) {
  const messages: ChatMessage[] = [];
  const removedMessages: ChatMessage[] = [];
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const div = node as Element;
      const system = div.classList.contains('system');
      const text = getText(div);
      const age = div.parentNode?.children.length;
      if (text && age) {
        const data: ChatMessage = {
          type: 'new-chat',
          system,
          text,
          age: age,
          element: div,
          when: Date.now(),
        };
        messages.push(data);
      }
    });
    m.removedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      console.log(node);
      const div = node as Element;
      const system = div.classList.contains('system');
      const text = getText(div);
      let age = -1;
      try {
        const textAge = div.getAttribute('age');
        if (textAge) {
          age = parseInt(textAge);
        }
      } catch {
        // do nothing
      }
      if (text && age) {
        const data: ChatMessage = {
          type: 'removed-chat',
          system,
          text,
          age: age,
          element: div,
          when: Date.now(),
        };
        removedMessages.push(data);
      }
    });
  }
  let offset = 1 - messages.length;
  for (const data of messages) {
    data.age = data.age + offset;
    const event = new CustomEvent<ChatMessage>(eventName, {detail: data});
    data.element.setAttribute('age', `${data.age}`);
    document.dispatchEvent(event);
    offset += 1;
  }
  for (const data of removedMessages.reverse()) {
    const event = new CustomEvent<ChatMessage>(eventName, {detail: data});
    document.dispatchEvent(event);
  }
}

/** parse icons into plain text */
export function getText(div: Element): string | null {
  if (!div.textContent) return null;
  let text = '';
  div.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.classList.contains('anr-icon')) {
        const label = element.getAttribute('aria-label');
        text += `[${label}]`;
      } else {
        text += node.textContent;
      }
    } else {
      text += node.textContent;
    }
  });
  return text;
}
