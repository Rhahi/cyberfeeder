import {getStyles, toList} from './data';
import {getStyleUI} from './html';
import {SavedToggles, StyleItemUI} from './types';

/**
 * Inject CSS style into jinteki.net background listener
 */
export async function sendIt(type: 'style' | 'script', css?: string, toggles?: unknown) {
  if (css !== undefined) {
    if (type === 'style') {
      await browser.storage.local.set({cachedCss: css});
    } else {
      await browser.storage.local.set({cachedScriptCss: css});
    }
  } else {
    if (type === 'style') {
      css = await browser.storage.local.get('cachedCss').then(item => item.cachedCss);
    } else {
      css = await browser.storage.local.get('cachedScriptCss').then(item => item.cachedScriptCss);
    }
  }
  if (css === undefined) {
    console.warn('cannot send CSS when there is no cached css and no style was given');
    return;
  }
  let textArea: HTMLTextAreaElement;
  if (type === 'style') {
    textArea = document.getElementById('currentStyle') as HTMLTextAreaElement;
  } else {
    textArea = document.getElementById('currentScriptStyle') as HTMLTextAreaElement;
  }
  if (textArea) {
    textArea.value = css;
  }
  await browser.tabs
    .query({active: true, currentWindow: true})
    .then(async tabs => {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        await browser.tabs.sendMessage(tabs[0].id, {
          id: `cyberfeeder-${type}`,
          action: type,
          toggles: toggles,
          css: css,
        });
      }
    })
    .catch(() => console.warn('Could not send style to Jnet. Is jnet open?'));
}

/**
 * save user's custom css data
 */
export async function saveCustom(type: 'style' | 'script', style: StyleItemUI) {
  const {bundledStyles, userStyles} = await getStyles(type);
  if (style.id in userStyles) {
    userStyles[style.id].css = style.textarea.value;
  } else if (style.id in bundledStyles) {
    userStyles[style.id] = bundledStyles[style.id];
    userStyles[style.id].css = style.textarea.value;
  } else {
    console.warn('Tried to save style with unknown ID, do not save.');
  }
  const userStylesList = toList(userStyles);
  if (type === 'style') {
    await browser.storage.local.set({
      userStyles: userStylesList,
    });
  } else {
    await browser.storage.local.set({
      userScriptStyles: userStylesList,
    });
  }
  console.info(`Saved ${userStylesList.length} user ${type}Styles`);
}

/**
 * save user's custom css toggles
 */
export async function saveUserToggles(type: 'style' | 'script') {
  let bundledToggles: SavedToggles;
  if (type === 'style') {
    bundledToggles = await browser.storage.local.get('bundledToggles').then(item => item.bundledToggles as SavedToggles);
  } else {
    bundledToggles = await browser.storage.local.get('bundledScriptToggles').then(item => item.bundledScriptToggles as SavedToggles);
  }
  if (!bundledToggles) {
    console.warn("Couldn't find bundled toggles, saving all settings");
    bundledToggles = {};
  }
  const userToggles: SavedToggles = {};
  const items = document.querySelectorAll<HTMLElement>(`.${type}-item`);
  let toggleSaveCount = 0;
  items.forEach(element => {
    const id = element.id;
    const style = getStyleUI(id, type);
    if (style && !isDefault(style, bundledToggles)) {
      toggleSaveCount += 1;
      userToggles[id] = {
        id: id,
        enabled: style.enable.checked,
        customize: style.customize.checked,
      };
    }
  });
  if (type === 'style') {
    await browser.storage.local.set({
      userToggles: userToggles,
    });
  } else {
    await browser.storage.local.set({
      userScriptToggles: userToggles,
    });
  }
  console.info(`Saved ${toggleSaveCount} user toggles`);
}

function isDefault(style: StyleItemUI, bundledToggles: SavedToggles) {
  const id = style.id;
  if (!(id in bundledToggles)) {
    return false;
  }
  if (bundledToggles[id].enabled !== style.enable.checked) {
    return false;
  }
  if (bundledToggles[id].customize !== style.customize.checked) {
    return false;
  }
  return true;
}
