/** Bundled style data coming from the toml file */
interface StyleData {
  version: string;
  style: Style[];
}

/** Information included in the bundle style */
interface Style {
  category: string;
  series: string;
  default: boolean;
  name: string;
  css: string;
  description: string;
}

/** Internal representation of style with identifier */
interface IdStyle extends Style {
  id: string;
}

/** Style representation when loaded in the extension */
interface CollectedStyle {
  [category: string]: Category;
}

interface Category {
  checkBoxes: IdStyle[];
  radioButton: RadioBoxSeries;
}

interface RadioBoxSeries {
  [series: string]: IdStyle[];
}

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
async function initializeLocalStorage() {
  const jsonData = await readJson('style');
  const prevVersion = await browser.storage.local
    .get('version')
    .then(item => item.version);
  if (
    prevVersion &&
    jsonData.version === prevVersion &&
    jsonData.version !== 'override'
  ) {
    console.info('No stoarge update needed');
    return;
  }
  await saveBundled(jsonData);
}

/** Read the bundled style and put them in local storage */
async function saveBundled(jsonData: StyleData) {
  const bundledStyles = [];
  const bundledToggles = [];
  for (const style of jsonData.style) {
    const id = `${style.category}-${style.name}`.replace(' ', '-').trim()
    const data: IdStyle = {
      id: id,
      ...style,
    };
    const toggle: Toggle = {
      id: id,
      enabled: style.default,
      customize: false,
    };
    bundledStyles.push(data);
    bundledToggles.push(toggle);
  }
  await browser.storage.local.set({
    version: jsonData.version,
    bundledStyles: bundledStyles,
    bundledToggles: bundledToggles,
  });
}

}


function populateStyleData(
  collection: CollectedStyle,
  primary: {[key: string]: IdStyle},
  secondary: {[key: string]: IdStyle},
  strategy: 'overwrite-with-secondary' | 'userdata'
) {
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

function getCategorizedStyles(
  data: {[key: string]: IdStyle},
  userdata: {[key: string]: IdStyle}
) {
  const collection: CollectedStyle = {};
  populateStyleData(collection, data, userdata, 'overwrite-with-secondary');
  populateStyleData(collection, userdata, data, 'userdata');
  return collection;
}


async function loadSidebar() {
  const data = await browser.storage.local.get(['styles', 'userstyles']);
  const styles = toDict(data.styles);
  const userstyles = toDict(data.userstyles);

  const element = document.getElementById('styles');
  if (element) {
    const categorized = getCategorizedStyles(styles, userstyles);
    let innerHTML = '';
    for (const [key, category] of Object.entries(categorized)) {
      innerHTML += '<div class="category">';
      innerHTML += `<h2>${key}</h2>`;
      innerHTML += populateSeries(category);
      innerHTML += populateStandalone(category);
      innerHTML += '</div>';
    }
    element.innerHTML = innerHTML;
    // do something here to update from storage
    // and then apply the styles once
  }
}

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
  await loadSidebar();
});
