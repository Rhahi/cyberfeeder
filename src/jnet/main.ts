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

/** create a ghost container to house animated entities */
if (!document.querySelector('#ghosts')) {
  const container = document.createElement('div');
  container.id = 'ghosts';
  container.setAttribute('style', 'position: absolute; top: 0; left: 0; overflow: visible; width: 1em; height: 1em;');
  document.body.appendChild(container);
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
  if (message.action === 'refresh') {
    css.onLoad();
    script.disableAll();
    script.onLoad();
  }
});
