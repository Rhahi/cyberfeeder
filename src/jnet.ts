interface Message {
  id: string;
  action: 'style';
  payload: string;
}

browser.storage.local.get('cachedCss')
  .then(item => {
    const css: string = item.cachedCss;
    applyStyle('style', css);
  })
  .catch(() => {
    console.log('Failed to apply cached CSS');
  });

function applyStyle(id: string, css: string) {
  let styleElement = document.getElementById(id);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = id;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
}

browser.runtime.onMessage.addListener((message: Message) => {
  console.info('Got new style');
  if (message.action === 'style') {
    applyStyle(message.id, message.payload);
  }
});
