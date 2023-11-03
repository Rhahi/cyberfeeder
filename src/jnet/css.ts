export function onLoad() {
  browser.storage.local
    .get('cachedCss')
    .then(item => {
      const css: string = item.cachedCss;
      applyStyle('cyberfeeder-style', css);
    })
    .catch(() => {
      console.log('[Cyberfeeder] Failed to apply cached CSS');
    });
}

export function applyStyle(id: string, css: string) {
  let styleElement = document.getElementById(id);
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = id;
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = css;
  console.info('[Cyberfeeder] CSS styles applied');
}
