import {applyStyle} from './css';
import * as features from './features';
import * as watcher from './watchers';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-archive-when-pressing-Control-(deprecated)',
  newMessageIndicator = 'Reminders-none-New-message-indicator',
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
  applyCssFromCache();
  watcher.base.watch();
  setupScriptsFromCache();
  watcher.base.announce();
}

function applyCssFromCache() {
  browser.storage.local
    .get('cachedScriptCss')
    .then(item => {
      const css: string = item.cachedScriptCss;
      applyStyle('cyberfeeder-script', css);
    })
    .catch(() => {
      console.log('[Cyberfeeder] Failed to apply cached script CSS');
    });
}

function setupScriptsFromCache() {
  browser.storage.local.get('cachedScriptToggles').then(item => {
    const toggles: {[key: string]: Toggle} | null = item.cachedScriptToggles;
    if (toggles) {
      setupScripts(Object.values(toggles));
    }
  });
}

function disableAll() {
  watcher.archive.stop();
  watcher.chat.stop();
}

export function setupScripts(toggles: Toggle[]) {
  disableAll();
  let shouldWatchArchive = false;
  let shouldWatchChat = false;

  for (const toggle of toggles) {
    if (toggle.id === KnownScripts.sortAcrhive) {
      shouldWatchArchive = true;
      toggle.enabled ? features.sortArchive.enable() : features.sortArchive.disable();
      continue;
    }
    if (toggle.id === KnownScripts.newMessageIndicator) {
      shouldWatchChat = true;
      toggle.enabled ? features.chatScrollHighlight.enable() : features.chatScrollHighlight.disable();
      continue;
    }
  }

  if (shouldWatchArchive) watcher.archive.watch();
  if (shouldWatchChat) watcher.chat.watch();
}
