import {applyStyle} from './css';
import * as sortArchive from './features/sortArchive';
import * as chatScrollHighlight from './features/chatScrollHighlight';
import * as handsizeReminder from './features/handsizeReminder';

enum KnownScripts {
  sortAcrhive = 'Quality-of-life-none-Sort-cards-in-archive',
  newMessage = 'Reminder-none-New-message-indicator',
  handsizeReminder = 'Reminder-none-Hand-size-reminder',
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

  browser.storage.local.get('cachedScriptToggles').then(item => {
    const toggles: Toggle[] = item.cachedScriptToggles;
    for (const toggle of toggles) {
      setScript(toggle);
    }
  });
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
