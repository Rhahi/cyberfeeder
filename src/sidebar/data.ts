import {CollectedStyle, IdStyle, IdStyleDict, IdToggle, SavedToggles, StyleData, TabType} from './types';

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
 * Local storage names:
 *
 * (styles tab)
 * version
 * bundledStyles
 * bundledToggles
 * userStyles
 * userToggles
 *
 * (scripts tab)
 * scriptVersion
 * bundledScriptStyles
 * bundledScriptToggles
 * userScriptStyles
 * userScriptToggles
 */
export async function initializeLocalStorage() {
  const prevStyleVersion = await browser.storage.local.get('version').then(item => item.version);
  const prevScriptVersion = await browser.storage.local.get('scriptVersion').then(item => item.scriptVersion);
  if (prevStyleVersion === 'override' || prevScriptVersion === 'override') {
    await browser.storage.local.clear();
    console.info('Overriding stored styles with development override.');
  }
  await initializeLocalStorageStyle(prevStyleVersion);
  await initializeLocalStorageScript(prevScriptVersion);
}

async function initializeLocalStorageStyle(prevVersion: string) {
  const data = await readJson('style');
  if (!prevVersion || prevVersion === 'override') {
    console.info('Initialize bundled style');
    await saveBundledStyle(data);
    return;
  }
  if (data.version === prevVersion) {
    console.info('Bundled style OK');
    return;
  }
  console.info('Update bundled style');
  await saveBundledStyle(data);
}

async function initializeLocalStorageScript(prevVersion: string) {
  const data = await readJson('script');
  if (!prevVersion || prevVersion === 'override') {
    console.info('Initialize bundled script style');
    await saveBundledScript(data);
    return;
  }
  if (data.version === prevVersion) {
    console.info('Bundled script style OK');
    return;
  }
  console.info('Update bundled script style');
  await saveBundledScript(data);
}

/** Read the bundled style and put them in local storage */
async function saveBundledStyle(data: StyleData) {
  const {styles: bundledStyles, toggles: bundledToggles} = processBundled(data);
  await browser.storage.local.set({
    version: data.version,
    bundledStyles: bundledStyles,
    bundledToggles: bundledToggles,
  });
  console.info('Saved bundled data (style)');
}

async function saveBundledScript(data: StyleData) {
  const {styles: bundledScriptStyles, toggles: bundledScriptToggles} = processBundled(data);
  await browser.storage.local.set({
    scriptVersion: data.version,
    bundledScriptStyles: bundledScriptStyles,
    bundledScriptToggles: bundledScriptToggles,
  });
  console.info('Saved bundled data (script)');
}

function processBundled(jsonData: StyleData) {
  const styles: IdStyle[] = [];
  const toggles: SavedToggles = {};
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
    styles.push(data);
    bundledTogglesFlat.push(toggle);
  }
  console.info(`Found ${styleCount} bundled styles/scripts`);
  for (const item of Object.values(bundledTogglesFlat)) {
    toggles[item.id] = item;
  }
  return {styles, toggles};
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
  return combineToggles(bundledToggles, userToggles);
}

export async function getScriptToggles() {
  const bundledToggles = await browser.storage.local.get('bundledScriptToggles').then(item => item.bundledScriptToggles as SavedToggles);
  if (!bundledToggles) {
    console.error('Bundled toggles are expected, but there is none.');
    return;
  }
  const userToggles = await browser.storage.local.get('userScriptToggles').then(item => item.userScriptToggles as SavedToggles);
  if (!userToggles) {
    return bundledToggles;
  }
  return combineToggles(bundledToggles, userToggles);
}

function combineToggles(bundledToggles: SavedToggles, userToggles: SavedToggles) {
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

function populateStyleData(collection: CollectedStyle, primary: IdStyleDict, secondary: IdStyleDict, strategy: 'overwrite-with-secondary' | 'userdata') {
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

export function getCategorizedStyles(data: IdStyleDict, userdata: IdStyleDict) {
  const collection: CollectedStyle = {};
  populateStyleData(collection, data, userdata, 'overwrite-with-secondary');
  populateStyleData(collection, userdata, data, 'userdata');
  return collection;
}

export function toList(styles: IdStyleDict) {
  return Object.values(styles);
}

function toDict(styles?: IdStyle[]) {
  const dict: IdStyleDict = {};
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
export async function getStyles(type: TabType) {
  let bundledStyles;
  let userStyles;
  if (type === 'style') {
    const data = await browser.storage.local.get(['bundledStyles', 'userStyles']);
    bundledStyles = toDict(data.bundledStyles);
    userStyles = toDict(data.userStyles);
  } else {
    const data = await browser.storage.local.get(['bundledScriptStyles', 'userScriptStyles']);
    bundledStyles = toDict(data.bundledScriptStyles);
    userStyles = toDict(data.userScriptStyles);
  }
  return {bundledStyles, userStyles};
}
