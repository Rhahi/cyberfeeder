export function onLoad() {
  if (!document.getElementById('cyberfeeder-fa1')) {
    const link = document.createElement('link');
    link.href = browser.runtime.getURL('css/fontawesome.min.css');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.id = 'cyberfeeder-fa1';
    document.head.appendChild(link);
  }

  if (!document.getElementById('cyberfeeder-fa2')) {
    const link = document.createElement('link');
    link.href = browser.runtime.getURL('css/solid.min.css');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.id = 'cyberfeeder-fa2';
    document.head.appendChild(link);
  }
}
