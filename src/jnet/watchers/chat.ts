import * as base from './base';

export const eventName = 'new-chat';

export interface ChatMessage {
  type: 'new-chat';
  system: boolean;
  text: string;
  age: number;
  element: Element;
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
        const data: ChatMessage = {type: 'new-chat', system, text, age: age, element: div};
        messages.push(data);
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
}
