import {applyStyle} from './css';
import * as sortArchive from './features/sortArchive';
import * as chatScrollHighlight from './features/chatScrollHighlight';
import * as handsizeReminder from './features/handsizeReminder';
import * as chatLog from './features/chatLog';
import * as secretWatcher from './features/secretPanelWatcher';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-cards-in-archive',
  newMessage = 'Reminders-none-New-message-indicator',
  handsizeReminder = 'Reminders-none-Hand-size-reminder',
  newTurnHighlight = 'Information-none-Highlight-new-turns-in-chat',
  playerActionHighlight = 'Information-none-Highlight-player-actions-in-chat',
  highlightAccess = 'Information-none-Highlight-accesses',
  highlightOther = 'Information-none-Highlight-other-abilities',
  secret = 'Information-none-Remember-secret-information',
}

export interface Toggle {
  id: string;
  enabled: boolean;
  args?: unknown;
}

export function onLoad() {
  browser.storage.local
    .get('cachedScriptCss')
    .then(item => {
      const css: string = item.cachedScriptCss;
      applyStyle('cyberfeeder-script', css);
    })
    .catch(() => {
      console.log('[Cyberfeeder] Failed to apply cached script CSS');
    });
  setupScripts();
  watchNavigate();
}

export function setScript(toggle: Toggle) {
  if (toggle.id === KnownScripts.sortAcrhive.valueOf()) {
    toggle.enabled ? sortArchive.enable() : sortArchive.disable();
  }
  if (toggle.id === KnownScripts.newMessage.valueOf()) {
    toggle.enabled ? chatScrollHighlight.enable() : chatScrollHighlight.disable();
  }
  if (toggle.id === KnownScripts.handsizeReminder.valueOf()) {
    toggle.enabled ? handsizeReminder.enable() : handsizeReminder.disable();
  }
  if (toggle.id === KnownScripts.newTurnHighlight.valueOf()) {
    toggle.enabled ? chatLog.enable('turnhighlight') : chatLog.disable('turnhighlight');
  }
  if (toggle.id === KnownScripts.highlightAccess.valueOf()) {
    toggle.enabled ? chatLog.enable('accesshighlight') : chatLog.disable('accesshighlight');
  }
  if (toggle.id === KnownScripts.highlightOther.valueOf()) {
    toggle.enabled ? chatLog.enable('otherhighlight') : chatLog.disable('otherhighlight');
  }
  if (toggle.id === KnownScripts.secret.valueOf()) {
    if (toggle.enabled) {
      chatLog.enable('secret');
      secretWatcher.enable();
    } else {
      chatLog.disable('secret');
      secretWatcher.disable();
    }
  }
}

export function setupScripts() {
  browser.storage.local.get('cachedScriptToggles').then(item => {
    const toggles: {[key: string]: Toggle} | null = item.cachedScriptToggles;
    if (!toggles) {
      return;
    }
    for (const toggle of Object.values(toggles)) {
      setScript(toggle);
    }
  });
}

export function disableAll() {
  handsizeReminder.disable();
  chatScrollHighlight.disable();
  sortArchive.disable();
  chatLog.disable('turnhighlight');
  chatLog.disable('accesshighlight');
  chatLog.disable('otherhighlight');
  chatLog.disable('secret');
  secretWatcher.disable();
}

/**
 * Watch user navigating in/out of game, and re-enable scripts if they do
 */
function watchNavigate() {
  const item = document.querySelector('#main-content > #main > .item');
  if (item) {
    const observer = new MutationObserver(() => {
      disableAll();
      setupScripts();
    });
    observer.observe(item, {childList: true, subtree: false});
  } else {
    console.warn("[Cyberfeeder] Could not find .main .item, won't watch navigation");
  }
}
