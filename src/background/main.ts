/**
 * Open sidebar when clicking the extension logo on the addons list
 */
browser.browserAction.onClicked.addListener(handleClick);

/**
 * Open sidebar when clicking the extension logo on the URL bar
 * 0 = left
 * 1 = middle
 */
browser.pageAction.onClicked.addListener(handleClick);

function handleClick(tab: browser.tabs.Tab, click?: browser.pageAction.OnClickData | browser.browserAction.OnClickData) {
  if (!click) return;
  if (click.button !== 0) return;
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
  if (click.modifiers.includes('Alt')) {
    injectAnywhere(tab);
  }
}

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

function injectAnywhere(tab: browser.tabs.Tab) {
  if (!tab.id) {
    console.warn('could not find currently open tab id');
    return;
  }
  browser.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['js/jnet.js'],
  });
}
