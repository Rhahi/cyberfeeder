/**
 * Open sidebar when clicking the extension logo on the addons list
 */
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.open();
});

/**
 * Open sidebar when clicking the extension logo on the URL bar
 */
browser.pageAction.onClicked.addListener(() => {
  browser.sidebarAction.open();
});
