import * as css from './css';
import * as script from './script';

css.onLoad();
script.onLoad();

interface Message {
  id: string;
  action: 'style' | 'script';
  toggles?: script.Toggle[];
  css: string;
}

browser.runtime.onMessage.addListener((message: Message) => {
  if (message.action === 'style') {
    css.applyStyle(message.id, message.css);
    return;
  }
  if (message.action === 'script') {
    css.applyStyle(message.id, message.css);
    if (!message.toggles) {
      return;
    }
    script.disableAll();
    for (const toggle of message.toggles) {
      script.setScript(toggle);
    }
    return;
  }
  if (message.action === 'refresh') {
    script.disableAll();
    script.setupScripts();
  }
});
