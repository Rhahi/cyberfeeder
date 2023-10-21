import {getStyles, toList} from './data';
import {getStyleUI} from './html';
import {SavedToggles, StyleItemUI} from './types';

/**
 * Inject CSS style into jinteki.net background listener
 */
export async function sendIt(css?: string) {
  if (css !== undefined) {
    await browser.storage.local.set({cachedCss: css});
  } else {
    css = await browser.storage.local.get('cachedCss').then(item => item.cachedCss);
  }
  if (css === undefined) {
    console.warn('cannot send CSS when there is no cached css and no style was given');
    return;
  }
  const currentStyleTextArea = document.getElementById('currentStyle') as HTMLTextAreaElement;
  if (currentStyleTextArea) {
    currentStyleTextArea.value = css;
  }
  await browser.tabs
    .query({active: true, currentWindow: true})
    .then(async tabs => {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        await browser.tabs.sendMessage(tabs[0].id, {
          id: 'cyberfeeder-style',
          action: 'style',
          payload: css,
        });
      }
    })
    .catch(e => console.warn('Could not send style to Jnet. Is jnet open?'));
}

/**
 * save user's custom css data
 */
export async function saveCustom(style: StyleItemUI) {
  const {bundledStyles, userStyles} = await getStyles();
  if (style.id in userStyles) {
    userStyles[style.id].css = style.textarea.value;
  } else if (style.id in bundledStyles) {
    userStyles[style.id] = bundledStyles[style.id];
    userStyles[style.id].css = style.textarea.value;
  } else {
    console.warn('Tried to save style with unknown ID, do not save.');
  }
  const userStylesList = toList(userStyles);
  await browser.storage.local.set({
    userStyles: userStylesList,
  });
  console.info(`Saved ${userStylesList.length} userStyles`);
}

/**
 * save user's custom css toggles
 */
export async function saveUserToggles() {
  let bundledToggles = await browser.storage.local.get('bundledToggles').then(item => item.bundledToggles as SavedToggles);
  if (!bundledToggles) {
    console.warn("Couldn't find bundled toggles, saving all settings");
    bundledToggles = {};
  }
  const userToggles: SavedToggles = {};
  const styleItems = document.querySelectorAll<HTMLElement>('.style-item');
  let toggleSaveCount = 0;
  styleItems.forEach(element => {
    const id = element.id;
    const style = getStyleUI(id);
    if (style && !isDefault(style, bundledToggles)) {
      toggleSaveCount += 1;
      userToggles[id] = {
        id: id,
        enabled: style.enable.checked,
        customize: style.customize.checked,
      };
    }
  });
  await browser.storage.local.set({
    userToggles: userToggles,
  });
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
