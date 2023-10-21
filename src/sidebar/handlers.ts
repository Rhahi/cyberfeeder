import {sendIt, saveUserToggles, saveCustom} from './operations';
import {getStyleUI, rebuildStyle} from './html';
import {getStyles} from './data';

export async function registerHandlers() {
  registerStyleToggleEvent();
  registerCustomizeToggleEvent();
  registerCustomizeResetEvent();
  registerCustomizeSaveEvent();
  registerBackupEvent();
  registerImportEvent();
  registerRebuildHandler();
  registerResetHandler();
  registerPurgeHandler();
  await registerMessageHandler();
}

/**
 * Activates when user changes CSS toggles
 */
function registerStyleToggleEvent() {
  const styleCheckboxes = document.getElementsByClassName('style-enable');
  for (let i = 0; i < styleCheckboxes.length; i++) {
    styleCheckboxes[i].addEventListener('change', async () => {
      const style = rebuildStyle();
      await saveUserToggles();
      await sendIt(style);
    });
  }
}

/**
 * Activates when user toggles CSS customization
 */
function registerCustomizeToggleEvent() {
  const customCheckboxes = document.getElementsByClassName('style-customize');
  for (let i = 0; i < customCheckboxes.length; i++) {
    customCheckboxes[i].addEventListener('change', async () => {
      const element = customCheckboxes[i];
      const li = element.closest('li');
      const style = getStyleUI(li?.id);
      if (!style) {
        console.warn('Enable/disable target not found');
        return;
      }

      const styles = await getStyles();
      style.textarea.disabled = !style.customize.checked;
      style.resetButton.disabled = !style.customize.checked;
      style.saveButton.disabled = !style.customize.checked;
      if (style.customize.checked) {
        // only enable editing but do not send the styles to jnet
        if (style.id in styles.userStyles) {
          style.textarea.value = styles.userStyles[style.id].css;
        }
      } else {
        // reset textarea to bundled style
        if (style.id in styles.bundledStyles) {
          style.textarea.value = styles.bundledStyles[style.id].css;
        } else {
          console.warn('bundled style not found, do not modify text area');
        }
      }
      await saveUserToggles();
      if (style.enable.checked) {
        await sendIt(rebuildStyle());
      }
    });
  }
}

/**
 * Activates when user presses "reset" on customization
 */
function registerCustomizeResetEvent() {
  const applyButtons = document.getElementsByClassName('style-reset');
  for (let i = 0; i < applyButtons.length; i++) {
    applyButtons[i].addEventListener('click', async () => {
      const element = applyButtons[i];
      const li = element.closest('li');
      const style = getStyleUI(li?.id);
      if (!style) {
        return;
      }
      const styles = await getStyles();
      if (style.id in styles.bundledStyles) {
        style.textarea.value = styles.bundledStyles[style.id].css;
      } else {
        console.info('Tried to revert to bundled style, but there was none.');
      }
    });
  }
}

/**
 * Activates when user presses "save" button on customization
 */
function registerCustomizeSaveEvent() {
  const applyButtons = document.getElementsByClassName('style-save');
  for (let i = 0; i < applyButtons.length; i++) {
    applyButtons[i].addEventListener('click', async () => {
      const element = applyButtons[i];
      const li = element.closest('li');
      const style = getStyleUI(li?.id);
      if (!style) {
        return;
      }
      // update style
      await saveCustom(style);
      await saveUserToggles();
      if (style.enable.checked) {
        const style = rebuildStyle();
        await sendIt(style);
      }
    });
  }
}

function registerBackupEvent() {
  const button = document.getElementById('backup');
  if (!button) {
    console.error('Backup button not found');
    return;
  }
  button?.addEventListener('click', async () => {
    const storage = await browser.storage.local.get(null as any);
    const data = JSON.stringify(storage);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.id = 'download';
    a.href = url;
    a.download = 'cyberfeeder-backup.json';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function registerImportEvent() {
  const button = document.getElementById('import') as HTMLElement;
  const input = document.getElementById('importInput') as HTMLInputElement;
  if (!button || !input) {
    console.error('Import button not found');
    return;
  }
  button.addEventListener('click', async () => {
    let reloadNeeded = false;
    if (!input.files || input.files?.length === 0) {
      console.info('No files selected');
      return;
    }
    const file = input.files[0];
    if (file && file.type === 'application/json') {
      const content = await readFile(file);
      if (!content) {
        console.warn('failed to read loaded file');
        return;
      }
      try {
        const jsonData = JSON.parse(content);
        await browser.storage.local.set(jsonData);
        reloadNeeded = true;
      } catch (e) {
        console.debug(e);
        console.warn('Failed to parse JSON data');
      }
    }
    if (reloadNeeded) {
      browser.runtime.reload();
    }
  });
}

async function registerMessageHandler() {
  browser.runtime.onMessage.addListener(async message => {
    console.info('Got initialize request from jnet, sending style');
    if (message.action === 'init') {
      await sendIt(rebuildStyle());
    }
  });
}

function registerResetHandler() {
  const button = document.getElementById('settings-reset');
  if (!button) {
    console.warn("Couldn't find reset button");
    return;
  }
  button.addEventListener('click', async () => {
    await sendIt('');
  });
}

function registerPurgeHandler() {
  const button = document.getElementById('settings-purge');
  if (!button) {
    console.warn("Couldn't find purge button");
    return;
  }
  button.addEventListener('click', async () => {
    await sendIt('');
    await browser.storage.local.clear();
    browser.runtime.reload();
  });
}

function registerRebuildHandler() {
  const button = document.getElementById('settings-rebuild');
  if (!button) {
    console.warn("Couldn't find rebuild button");
    return;
  }
  button.addEventListener('click', async () => {
    await sendIt(rebuildStyle());
  });
}

function readFile(file: File): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString());
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
