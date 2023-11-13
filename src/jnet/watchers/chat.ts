import * as base from './base';

export const eventName = 'new-chat';

export interface ChatMessage {
  system: boolean;
  text: string;
  age: number;
}

const newChatObserver = new MutationObserver(newChatHandler);
const announcer = (event: Event) => {
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
  document.addEventListener(base.eventName, announcer);
}

export function stop() {
  document.removeEventListener(base.eventName, announcer);
}

function newChatHandler(mutations: MutationRecord[]) {
  const messages: ChatMessage[] = [];
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const div = node as Element;
      const system = div.classList.contains('system');
      const text = div.textContent;
      const age = div.parentNode?.children.length;
      if (text && age) {
        const data: ChatMessage = {system, text, age: age};
        messages.push(data);
      }
    });
  }
  let offset = 1 - messages.length;
  for (const data of messages) {
    data.age = data.age + offset;
    const event = new CustomEvent<ChatMessage>(eventName, {detail: data});
    document.dispatchEvent(event);
    offset += 1;
  }
}
