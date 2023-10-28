import {applyStyle} from './css';
import * as sortArchive from './features/sortArchive';
import * as chatScrollHighlight from './features/chatScrollHighlight';
import * as handsizeReminder from './features/handsizeReminder';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-cards-in-archive',
  newMessage = 'Reminders-none-New-message-indicator',
  handsizeReminder = 'Reminders-none-Hand-size-reminder',
}

export interface Toggle {
  id: string;
  isEnabled: boolean;
  args?: unknown;
}

export function onLoad() {
  browser.storage.local
    .get('cachedScriptCss')
    .then(item => {
      const css: string = item.cachedCss;
      applyStyle('cyberfeeder-script', css);
    })
    .catch(() => {
      console.log('Failed to apply cached script CSS');
    });
  setupScripts();
  watchNavigate();
}

export function setScript(toggle: Toggle) {
  if (toggle.id === KnownScripts.sortAcrhive.valueOf()) {
    toggle.isEnabled ? sortArchive.enable() : sortArchive.disable();
  }
  if (toggle.id === KnownScripts.newMessage.valueOf()) {
    toggle.isEnabled ? chatScrollHighlight.enable() : chatScrollHighlight.disable();
  }
  if (toggle.id === KnownScripts.handsizeReminder.valueOf()) {
    toggle.isEnabled ? handsizeReminder.enable() : handsizeReminder.disable();
  }
}

function setupScripts() {
  browser.storage.local.get('cachedScriptToggles').then(item => {
    const toggles: {[key: string]: Toggle} | null = item.cachedScriptToggles;
    if (!toggles) {
      return;
    }
    console.log(toggles);
    for (const toggle of Object.values(toggles)) {
      setScript(toggle);
      console.log(`set ${toggle.id} ${toggle.isEnabled}`);
    }
  });
}

function disableAll() {
  handsizeReminder.disable();
  chatScrollHighlight.disable();
  sortArchive.disable();
}

/**
 * Watch user navigating in/out of game, and re-enable scripts if they do
 */
function watchNavigate() {
  const item = document.querySelector('#main-content > #main > .item');
  if (item) {
    const observer = new MutationObserver(() => {
      console.log('User navigate event');
      disableAll();
      setupScripts();
    });
    observer.observe(item, {childList: true, subtree: false});
  } else {
    console.warn("Could not find .main .item, won't watch navigation");
  }
}
