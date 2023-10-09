interface Message {
  id: string;
  action: 'style';
  payload: string;
}

browser.runtime.onMessage.addListener((message: Message) => {
  console.log('got message');
  if (message.action === 'style') {
    let styleElement = document.getElementById(message.id);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = message.id;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = message.payload;
  }
});
