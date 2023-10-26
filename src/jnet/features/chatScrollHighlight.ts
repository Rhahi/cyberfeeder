export function enable() {
  const chat = getChat();
  const input = getChatInputbox();
  if (!chat || !input) {
    console.warn('Could not find chat content or input box');
    return;
  }
  input.setAttribute('cyberfeeder', 'on');
  const onScroll = () => {
    if (isFullyDown(chat)) {
      input.setAttribute('newchat', 'no');
      input.setAttribute('placeholder', 'Say something...');
    }
  };
  chat.addEventListener('scroll', onScroll);

  const newChatObserver = new MutationObserver(() => {
    if (!isFullyDown(chat)) {
      input.setAttribute('newchat', 'yes');
      input.setAttribute('placeholder', 'Scroll down for new messages');
    }
  });
  const toggleFeatureObserver = new MutationObserver(() => {
    if (input.getAttribute('cyberfeeder') === 'off') {
      newChatObserver.disconnect();
      toggleFeatureObserver.disconnect();
      chat.removeEventListener('scroll', onScroll);

      input.removeAttribute('cyberfeeder');
      input.removeAttribute('newchat');
      input.setAttribute('placeholder', 'Say something...');
    }
  });
  newChatObserver.observe(chat, {childList: true, subtree: true});
  toggleFeatureObserver.observe(input, {attributes: true});
}

function isFullyDown(element: Element) {
  return element.scrollHeight - element.clientHeight - element.scrollTop < 1;
}

export function disable() {
  const element = getChatInputbox();
  if (element?.getAttribute('cyberfeeder') === 'on') {
    element.setAttribute('cyberfeeder', 'off');
  }
}

function getChat() {
  return document.querySelector('.panel > .log > .messages');
}

function getChatInputbox() {
  return document.getElementById('log-input');
}
