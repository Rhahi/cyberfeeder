/**
 * A. subscribe to navigation event
 * B. when we are on gameboard, activate highlight feature, otherwise, turn it off.
 *
 * 1. Subscribe to new chat messages
 * 2. Whenever there is a new chat message, check scroll position and scroll if necessary.
 */

import * as util from './util';
import * as watcher from '../watchers';

const onScroll = () => {
  const chat = util.getChat();
  const input = util.getChatInputbox();
  if (chat && input && isFullyDown(chat)) {
    input.setAttribute('newchat', 'no');
    input.setAttribute('placeholder', 'Say something...');
  }
};

const newBoxHandler = (event: Event) => {
  watcher.base.conditionalExecuter({
    event,
    type: watcher.base.eventName,
    targetMode: 'gameview',
    callback: enable => {
      const chat = util.getChat();
      if (!chat) {
        return;
      }
      if (enable) {
        chat.addEventListener('scroll', onScroll);
      } else {
        chat.removeEventListener('scroll', onScroll);
      }
    },
  });
};

const newChatHandler = () => {
  const chat = util.getChat();
  const input = util.getChatInputbox();
  if (!chat || !input) {
    return;
  }
  if (!isFullyDown(chat)) {
    input.setAttribute('newchat', 'yes');
    input.setAttribute('placeholder', 'Scroll down for new messages');
  }
};

export function enable() {
  document.addEventListener(watcher.base.eventName, newBoxHandler);
  document.addEventListener(watcher.chat.eventName, newChatHandler);
}

export function disable() {
  document.removeEventListener(watcher.base.eventName, newBoxHandler);
  document.removeEventListener(watcher.chat.eventName, newChatHandler);
  const chat = util.getChat();
  const input = util.getChatInputbox();
  if (chat) {
    chat.removeEventListener('scroll', onScroll);
  }
  if (input) {
    input.removeAttribute('newchat');
    input.setAttribute('placeholder', 'Say something...');
  }
}

function isFullyDown(element: Element) {
  return element.scrollHeight - element.clientHeight - element.scrollTop < 2;
}