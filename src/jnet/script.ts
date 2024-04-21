import {applyStyle} from './css';
import * as features from './features';
import * as watcher from './watchers';
import * as debug from './debug';
import * as card from './cardDB';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-archive-when-pressing-Control-key',
  newMessageIndicator = 'Reminders-none-New-message-indicator',
  handsizeReminder = 'Reminders-none-Hand-size-reminder',
  annotateChat = 'Information-none-Annotate-locations-with-icons',
  secret = 'Information-none-Remember-secret-information',
  zindex = 'Quality-of-life-none-Lower-centrals-when-pressing-Ctrl',
  autoscroll = 'Quality-of-life-none-Fix-chat-auto-scroll',
  debug = 'Debug-none-Enable-debug-mode',
  animateHand = 'Animation-none-Animate-cards-in-hand-(beta)',
  animateBin = 'Animation-none-Animate-discard-entry-and-exit',
  archiveTracker = 'Information-none-Track-points-in-Archives',
}

export interface Toggle {
  id: string;
  enabled: boolean;
  args?: unknown;
}

export function onLoad() {
  applyCssFromCache();
  card.load();
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
  features.sortArchive.disable();
  features.newMessageIndicator.disable();
  features.handsizeReminder.disable();
  features.annotateChat.disable();
  features.secret.disable();
  features.zindex.disable();
  features.autoscroll.disable();
  features.animateHand.disable();
  features.animateBin.disable();
  features.archivePoints.disable();
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
    if (toggle.id === KnownScripts.autoscroll) {
      if (toggle.enabled) {
        features.autoscroll.enable();
      } else {
        features.autoscroll.disable();
      }
    }
    if (toggle.id === KnownScripts.debug) {
      if (toggle.enabled) {
        debug.enable();
        debug.log('Debug mode enabled');
      } else {
        debug.log('Debug mode disabled');
        debug.disable();
      }
    }
    if (toggle.id === KnownScripts.animateHand) {
      if (toggle.enabled) {
        shouldWatchHand = true;
        features.animateHand.enable();
      } else {
        features.animateHand.disable();
      }
    }
    if (toggle.id === KnownScripts.animateBin) {
      if (toggle.enabled) {
        shouldWatchArchive = true;
        features.animateBin.enable();
      } else {
        features.animateBin.disable();
      }
    }
    if (toggle.id === KnownScripts.archiveTracker) {
      if (toggle.enabled) {
        shouldWatchArchive = true;
        features.archivePoints.enable();
      } else {
        features.archivePoints.disable();
      }
    }
  }
  if (shouldWatchArchive) watcher.archive.watch();
  if (shouldWatchChat) watcher.chat.watch();
  if (shouldWatchHand) watcher.hand.watch();
  if (shouldWatchCommand) watcher.command.watch();
  if (shouldWatchRIL) watcher.ril.watch();
}
