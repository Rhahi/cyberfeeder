/**
 * Open sidebar when clicking the extension logo on the addons list
 */
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.open();
});

/**
 * Open sidebar when clicking the extension logo on the URL bar
 * 0 = left
 * 1 = middle
 */
browser.pageAction.onClicked.addListener(async (_, click) => {
  if (click) {
    if (click.button === 0) {
      if (click.modifiers.length === 0) {
        browser.sidebarAction.open();
        return;
      }
      if (click.modifiers.includes('Ctrl')) {
        browser.sidebarAction.close();
        return;
      }
      if (click.modifiers.includes('Shift')) {
        reloadScripts();
        return;
      }
    }
  }
});

function reloadScripts() {
  browser.tabs
    .query({active: true, currentWindow: true})
    .then(async tabs => {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        browser.tabs.sendMessage(tabs[0].id, {action: 'refresh'}).catch();
      }
    })
    .catch(() => console.warn('Could not send style to Jnet. Is jnet open?'));
}
