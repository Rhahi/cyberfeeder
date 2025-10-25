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

/** Auto inject on user navigation */
browser.tabs.onUpdated.addListener(autoInject);

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
    if (!tab.url) return;
    const url = new URL(tab.url);
    const stringUrl = `${url.protocol}//${url.host}/*`;
    console.log('[background] Asking permission for', stringUrl);
    browser.permissions.request({origins: [stringUrl]});
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

async function autoInject(tabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo, tab: browser.tabs.Tab) {
  // ignore all events other than change in url
  if (!changeInfo.url) return;
  if (changeInfo.status !== 'complete') return;

  // check if Cyberfeeder is already running
  if (!tab.url) return;
  console.log('[background] new url', changeInfo.url);
  const url = new URL(tab.url);
  const stringUrl = `${url.protocol}//${url.host}/*`;
  try {
    const response = await browser.tabs.sendMessage(tabId, {action: 'ping'});
    if (response) {
      console.log('[background] Cyberfeeder is already running');
      return;
    }
  } catch (e) {
    console.log('[background] Cyberfeeder is not up for', stringUrl);
  }
  console.log('[background] Checking permission...');
  const hasPermission = await browser.permissions.contains({origins: [stringUrl]});
  if (!hasPermission) {
    console.log("[background] don't have permission, nothing to do.");
    return;
  }
  console.log('[background] Have permission, injecting Cyberfeeder');
  browser.scripting.executeScript({
    target: {tabId: tabId},
    files: ['js/jnet.js'],
  });
}
