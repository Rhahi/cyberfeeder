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

interface IdToggle {
  id: string;
  enabled: boolean;
  customize: boolean;
}

interface SavedToggles {
  [key: string]: IdToggle;
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
  if (!prevVersion) {
    console.info('There is no bundled style data definition');
    return;
  }
  if (jsonData.version === 'override') {
    console.info('Overriding stored styles with development override. Update.');
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
  for (const style of jsonData.style) {
    const id = `${style.category}-${style.name}`.replace(' ', '-').trim();
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
  const bundledToggles: SavedToggles = {};
  for (const item of Object.values(bundledTogglesFlat)) {
    bundledToggles[item.id] = item;
  }
  await browser.storage.local.set({
    version: jsonData.version,
    bundledStyles: bundledStyles,
    bundledToggles: bundledToggles,
  });
}

/** Read id-toggle relationship from localstorage */
async function getToggles() {
  const bundledToggles = await browser.storage.local
    .get('bundledToggles')
    .then(item => item.bundledToggles as SavedToggles);
  if (!bundledToggles) {
    console.error('Bundled toggles are expected, but there is none.');
    return;
  }
  const customToggles = await browser.storage.local
    .get('customToggles')
    .then(item => item.customToggles as SavedToggles);
  if (!customToggles) {
    return bundledToggles;
  }
  const combinedToggles: SavedToggles = {};
  for (const item of Object.values(bundledToggles)) {
    combinedToggles[item.id] = item;
  }
  for (const item of Object.values(customToggles)) {
    combinedToggles[item.id] = item;
  }
  return combinedToggles;
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

function populateCheckboxHTML(s: IdStyle, toggles?: SavedToggles) {
  const t = toggles ? toggles[s.id] : {
    enabled: s.default,
    customize: false,
  };

  if (s.id) {
    return `
    <li id=${s.id}>
      <input type="checkbox" id="style-${s.id}" name="${s.id}" class="style-checkbox-enable"${t.enabled ? ' checked' : ''} />
      <label for="style-${s.id}">${s.name}</label>
      <details>
        <summary>${s.description}</summary>
        <div>
          <input type="checkbox" id="custom-${s.id}" name="custom-${s.id}" class="style-checkbox-customize"/>
          <label for="custom-${s.id}">Customize</label>
          <input type="button" class="style-checkbox-reset" value="Reset" title="Reset to the bundled style" ${t.customize ? '' : ' disabled'} />
          <input type="button" class="style-checkbox-save" value="Save" title="Save current customization into local storage" ${t.customize ? '' : ' disabled'} />
          <textarea${t.customize ? '' : ' disabled'}>${s.css}</textarea>
        </div>
      </details>
    </li>
    `;
  }
  return '<li>Error occured while parsing data</li>';
}


function populateCheckbox(category: Category, toggles?: SavedToggles) {
  if (category.checkBoxes.length === 0) {
    return '';
  }
  let innerHTML = '';
  innerHTML += '<ul class="checkbox">';
  for (const style of Object.values(category.checkBoxes)) {
    innerHTML += populateCheckboxHTML(style, toggles);
  }
  innerHTML += '</ul>';
  return innerHTML;
}

async function loadSidebar() {
  const data = await browser.storage.local.get(['bundledStyles', 'userStyles']);
  const bundledStyles = toDict(data.bundledStyles);
  const userStyles = toDict(data.userStyles);
  const toggles = await getToggles();

  const element = document.getElementById('styles');
  if (element) {
    const categorized = getCategorizedStyles(bundledStyles, userStyles);
    let innerHTML = '';
    for (const [key, category] of Object.entries(categorized)) {
      innerHTML += '<div class="category">';
      innerHTML += `<h2>${key}</h2>`;
      innerHTML += populateRadioButton(category);
      innerHTML += populateCheckbox(category, toggles);
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
