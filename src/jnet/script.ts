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
  features.annotateChat.disable();
  features.secret.disable();
}

export function setupScripts(toggles: Toggle[]) {
  let shouldWatchArchive = false;
  let shouldWatchChat = false;
  let shouldWatchHand = false;
  let shouldAnnotateChat = false;
  let shouldWatchCommand = false;

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
    if (toggle.id === KnownScripts.highlightAccess) {
      if (toggle.enabled) {
        shouldWatchChat = true;
        shouldAnnotateChat = true;
      }
      continue;
    }
    if (toggle.id === KnownScripts.secret) {
      if (toggle.enabled) {
        shouldWatchChat = true;
        shouldWatchCommand = true;
        features.secret.enable();
      } else {
        features.secret.disable();
      }
    }
  }
  if (shouldWatchArchive) watcher.archive.watch();
  if (shouldWatchChat) watcher.chat.watch();
  if (shouldWatchHand) watcher.hand.watch();
  if (shouldWatchCommand) watcher.command.watch();
  shouldAnnotateChat ? features.annotateChat.enable() : features.annotateChat.disable();
}
