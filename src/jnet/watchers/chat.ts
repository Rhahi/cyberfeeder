import * as navigation from './navigation';

export interface ChatMessage {
  system: boolean;
  text: string;
  age: number;
}

export const newChatEvent = 'new-chat';

export function enable() {
  const newChatObserver = new MutationObserver(newChatHandler);
  document.addEventListener(navigation.changeMenuEvent, event => {
    navigation.conditionalObserver({
      event,
      type: navigation.changeMenuEvent,
      targetMode: 'gameview',
      observer: newChatObserver,
      selector: '.panel > .log > .messages',
      observeOptions: {childList: true},
    });
  });
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
    console.log(data);
    offset += 1;
  }
}
