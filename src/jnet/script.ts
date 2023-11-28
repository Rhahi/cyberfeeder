import {applyStyle} from './css';
import * as features from './features';
import * as watcher from './watchers';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-archive-when-pressing-Control-(deprecated)',
  newMessageIndicator = 'Reminders-none-New-message-indicator',
  handsizeReminder = 'Reminders-none-Hand-size-reminder',
  newTurnHighlight = 'Information-none-Highlight-new-turns-in-chat',
  annotateChat = 'Information-none-Annotate-locations-with-icons',
  secret = 'Information-none-Remember-secret-information',
  zindex = 'Quality-of-life-none-Lower-centrals-when-pressing-Ctrl',
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
  const event = watcher.base.createNavigationEvent();
  if (event) {
    document.dispatchEvent(event);
  } else {
    console.error('[Cyberfeeder] could not initialize script event');
  }
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

export function disableAll() {
  watcher.archive.stop();
  watcher.chat.stop();
  watcher.hand.stop();
  watcher.command.stop();
  watcher.ril.stop();
  features.annotateChat.disable();
  features.secret.disable();
}

export function setupScripts(toggles: Toggle[]) {
  let shouldWatchArchive = false;
  let shouldWatchChat = false;
  let shouldWatchHand = false;
  let shouldWatchCommand = false;
  let shouldWatchRIL = false;

  for (const toggle of toggles) {
    if (toggle.id === KnownScripts.sortAcrhive) {
      if (toggle.enabled) {
        shouldWatchArchive = true;
        features.sortArchive.enable();
      } else {
        features.sortArchive.disable();
      }
      continue;
    }
    if (toggle.id === KnownScripts.newMessageIndicator) {
      if (toggle.enabled) {
        features.newMessageIndicator.enable();
        shouldWatchChat = true;
      } else {
        features.newMessageIndicator.disable();
      }
      continue;
    }
    if (toggle.id === KnownScripts.handsizeReminder) {
      if (toggle.enabled) {
        shouldWatchHand = true;
        features.handsizeReminder.enable();
      } else {
        features.handsizeReminder.disable();
      }
      continue;
    }
    if (toggle.id === KnownScripts.annotateChat) {
      if (toggle.enabled) {
        shouldWatchChat = true;
        features.annotateChat.enable();
      } else {
        features.annotateChat.disable();
      }
    }
    if (toggle.id === KnownScripts.secret) {
      if (toggle.enabled) {
        shouldWatchChat = true;
        shouldWatchCommand = true;
        shouldWatchRIL = true;
        features.secret.enable();
      } else {
        features.secret.disable();
      }
    }
    if (toggle.id === KnownScripts.zindex) {
      if (toggle.enabled) {
        features.zindex.enable();
      } else {
        features.zindex.disable();
      }
    }
  }
  if (shouldWatchArchive) watcher.archive.watch();
  if (shouldWatchChat) watcher.chat.watch();
  if (shouldWatchHand) watcher.hand.watch();
  if (shouldWatchCommand) watcher.command.watch();
  if (shouldWatchRIL) watcher.ril.watch();
}
