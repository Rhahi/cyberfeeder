import {applyStyle} from './css';
import * as sortArchive from './features/sortArchive';

enum KnownScripts {
  sortAcrhive = 'UI-improvements-none-Sort-cards-in-archive',
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
  console.log(toggle);
  if (toggle.id === KnownScripts.sortAcrhive.valueOf()) {
    toggle.isEnabled ? sortArchive.enable() : sortArchive.disable();
  }
}
