import * as css from './css';
import * as script from './script';
import * as fontawesome from './fontawesome';

css.onLoad();
script.onLoad();
fontawesome.onLoad();

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
    if (message.toggles) {
      script.disableAll();
      script.setupScripts(message.toggles);
    }
    return;
  }
});
