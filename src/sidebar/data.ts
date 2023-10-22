import {CollectedStyle, IdStyle, IdToggle, SavedToggles, StyleData} from './types';

/**
 * Read json file from app's data directory
 */
async function readJson(name: string): Promise<StyleData> {
  const jsonUrl = browser.runtime.getURL(`data/${name}.json`);
  return fetch(jsonUrl)
    .then(async response => {
      if (!response.ok) {
        throw new Error('Failed to load JSON' + response.statusText);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error.message);
      return {
        style: [],
      };
    });
}

/**
 * There are 4 storage keys:
 *
 * - version = simple version string
 * - toggles = save toggle status per style ID
 * - styles = styles packaged with the app, not controlled by user
 * - userstyles = styles that the user has modified or created. untouched by updates.
 */
export async function initializeLocalStorage() {
  const jsonData = await readJson('style');
  const prevVersion = await browser.storage.local.get('version').then(item => item.version);
  if (!prevVersion) {
    console.info('There is no bundled style data definition. Initialize.');
    await saveBundled(jsonData);
    return;
  }
  if (jsonData.version === 'override') {
    console.info('Overriding stored styles with development override. Update.');
    await browser.storage.local.clear();
    await saveBundled(jsonData);
    return;
  }
  if (jsonData.version === prevVersion) {
    console.info('Bundled style version matches previous version');
    return;
  }
  console.info('New style definition found. Update.');
  await saveBundled(jsonData);
}

/** Read the bundled style and put them in local storage */
async function saveBundled(jsonData: StyleData) {
  const bundledStyles: IdStyle[] = [];
  const bundledTogglesFlat: IdToggle[] = [];
  let styleCount = 0;
  for (const style of jsonData.style) {
    styleCount++;
    const id = `${style.category}-${style.series}-${style.name}`.replaceAll(' ', '-').trim();
    const data: IdStyle = {
      id: id,
      ...style,
    };
    const toggle: IdToggle = {
      id: id,
      enabled: style.default,
      customize: false,
    };
    bundledStyles.push(data);
    bundledTogglesFlat.push(toggle);
  }
  console.info(`Found ${styleCount} bundled styles`);
  const bundledToggles: SavedToggles = {};
  for (const item of Object.values(bundledTogglesFlat)) {
    bundledToggles[item.id] = item;
  }
  await browser.storage.local.set({
    version: jsonData.version,
    bundledStyles: bundledStyles,
    bundledToggles: bundledToggles,
  });
  console.info('Saved version, bundledStyles, bundledToggles');
}

/** Read id-toggle relationship from localstorage */
export async function getStyleToggles() {
  const bundledToggles = await browser.storage.local.get('bundledToggles').then(item => item.bundledToggles as SavedToggles);
  if (!bundledToggles) {
    console.error('Bundled toggles are expected, but there is none.');
    return;
  }
  const userToggles = await browser.storage.local.get('userToggles').then(item => item.userToggles as SavedToggles);
  if (!userToggles) {
    return bundledToggles;
  }
  let userTogglesLoadCount = 0;
  const combinedToggles: SavedToggles = {};
  for (const item of Object.values(bundledToggles)) {
    combinedToggles[item.id] = item;
  }
  for (const item of Object.values(userToggles)) {
    userTogglesLoadCount++;
    combinedToggles[item.id] = item;
  }
  console.info(`Loaded ${userTogglesLoadCount} user defined toggles`);
  return combinedToggles;
}

function populateStyleData(collection: CollectedStyle, primary: {[key: string]: IdStyle}, secondary: {[key: string]: IdStyle}, strategy: 'overwrite-with-secondary' | 'userdata') {
  for (const [key, s] of Object.entries(primary)) {
    if (strategy === 'userdata' && key in secondary) {
      continue;
    }
    // initialize
    if (!(s.category in collection)) {
      collection[s.category] = {
        checkBoxes: [],
        radioButton: {},
      };
    }
    // populate checkbox items
    if (s.series === 'none') {
      if (key in secondary) {
        s.css = secondary[key].css;
      }
      collection[s.category].checkBoxes.push(s);
      continue;
    }
    // initialize radio button array
    if (!(s.series in collection[s.category].radioButton)) {
      collection[s.category].radioButton[s.series] = [];
    }
    // populate radio button items
    if (key in secondary) {
      s.css = secondary[key].css;
    }
    collection[s.category].radioButton[s.series].push(s);
  }
}

export function getCategorizedStyles(data: {[key: string]: IdStyle}, userdata: {[key: string]: IdStyle}) {
  const collection: CollectedStyle = {};
  populateStyleData(collection, data, userdata, 'overwrite-with-secondary');
  populateStyleData(collection, userdata, data, 'userdata');
  return collection;
}

export function toList(styles: {[key: string]: IdStyle}) {
  return Object.values(styles);
}

function toDict(styles?: IdStyle[]) {
  const dict: {[key: string]: IdStyle} = {};
  if (styles !== undefined) {
    for (const style of styles) {
      dict[style.id] = style;
    }
  }
  return dict;
}

/**
 * get bundledStyles and userStyles data as dictionary
 */
export async function getStyles() {
  const data = await browser.storage.local.get(['bundledStyles', 'userStyles']);
  const bundledStyles = toDict(data.bundledStyles);
  const userStyles = toDict(data.userStyles);
  return {bundledStyles, userStyles};
}
