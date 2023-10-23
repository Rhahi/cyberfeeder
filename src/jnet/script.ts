import {applyStyle} from './css';

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
}

export function setScript(toggle: Toggle) {
  // do something
}
