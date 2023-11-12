import * as navigation from './navigation';

export interface ChatMessage {
  system: boolean;
  text: string;
  age: number;
}

export const newChatEvent = 'new-chat';
const newChatObserver = new MutationObserver(newChatHandler);
const announcer = (event: Event) => {
  navigation.conditionalObserver({
    event,
    type: navigation.changeMenuEvent,
    targetMode: 'gameview',
    observer: newChatObserver,
    selector: '.panel > .log > .messages',
    observeOptions: {childList: true},
  });
};

export function enable() {
  document.addEventListener(navigation.changeMenuEvent, announcer);
}

export function disable() {
  document.removeEventListener(navigation.changeMenuEvent, announcer);
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
    const event = new CustomEvent<ChatMessage>(newChatEvent, {detail: data});
    document.dispatchEvent(event);
    offset += 1;
  }
}
