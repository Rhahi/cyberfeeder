import * as util from './util';

export function enable() {
  const chat = util.getChat();
  const input = util.getChatInputbox();
  if (!chat || !input) {
    console.warn('[Cyberfeeder] Could not find chat content or input box');
    return;
  }
  input.setAttribute('scrollhighlight', 'on');
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
    if (input.getAttribute('scrollhighlight') !== 'on') {
      newChatObserver.disconnect();
      toggleFeatureObserver.disconnect();
      chat.removeEventListener('scroll', onScroll);

      input.removeAttribute('scrollhighlight');
      input.removeAttribute('newchat');
      input.setAttribute('placeholder', 'Say something...');
      console.log('[Cyberfeeder] Chat scroll highlight has been disabled');
    }
  });
  newChatObserver.observe(chat, {childList: true, subtree: true});
  toggleFeatureObserver.observe(input, {attributes: true});
}

function isFullyDown(element: Element) {
  return element.scrollHeight - element.clientHeight - element.scrollTop < 2;
}

export function disable() {
  const element = util.getChatInputbox();
  if (element?.getAttribute('scrollhighlight') === 'on') {
    element.setAttribute('scrollhighlight', 'off');
  }
}
