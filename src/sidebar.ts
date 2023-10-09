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
  for (const style of jsonData.style) {
    const id = `${style.category}-${style.name}`.replaceAll(' ', '-').trim();
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

function populateRadioButtonHTML(s: IdStyle, radioName: string, toggles?: SavedToggles) {
  const t = toggles ? toggles[s.id] : {
    enabled: s.default,
    customize: false,
  };

  if (s.id) {
    return `
    <li class="style-item radio" id=${s.id}>
      <input type="radio" id="style-${s.id}" name="${radioName}" class="style-enable"${t.enabled ? ' checked' : ''} />
      <label for="style-${s.id}">${s.name}</label>
      <details>
        <summary>view/edit</summary>
        <div>
          ${s.description ? "<p>"+s.description+"</p>" : ""}
          <input type="checkbox" id="custom-${s.id}" name="custom-${s.id}" class="style-customize"/>
          <label for="custom-${s.id}" title="Turn on or off customizaion. Unsaved customization will be lost.">Customize</label>
          <input type="button" class="style-reset" value="Reset" title="Reset to the bundled style"${t.customize ? '' : ' disabled'} />
          <input type="button" class="style-save" value="Save" title="Save current customization into local storage"${t.customize ? '' : ' disabled'} />
          <textarea${t.customize ? '' : ' disabled'}>${s.css}</textarea>
        </div>
      </details>
    </li>
    `;
  }
  return '<li>Error occured while parsing data</li>';
}

function populateRadioButton(category: Category, toggles?: SavedToggles) {
  if (Object.keys(category.radioButton).length === 0) {
    return '';
  }
  let innerHTML = '';
  for (const [radioId, group] of Object.entries(category.radioButton)) {
    if (group.length === 0) {
      continue;
    }
    innerHTML += '<ul class="radiobox">';
    innerHTML += `<h3>${radioId}</h3>`;
    for (const style of group) {
      innerHTML += populateRadioButtonHTML(style, radioId, toggles)
    }
    innerHTML += '</ul>';
  }
  return innerHTML;
}

function populateCheckboxHTML(s: IdStyle, toggles?: SavedToggles) {
  const t = toggles ? toggles[s.id] : {
    enabled: s.default,
    customize: false,
  };

  if (s.id) {
    return `
    <li class="style-item check" id=${s.id}>
      <input type="checkbox" id="style-${s.id}" name="${s.id}" class="style-enable"${t.enabled ? ' checked' : ''} />
      <label for="style-${s.id}">${s.name}</label>
      <details>
        <summary>view/edit</summary>
        <div>
          ${s.description ? "<p>"+s.description+"</p>" : ""}
          <input type="checkbox" id="custom-${s.id}" name="custom-${s.id}" class="style-customize"/>
          <label for="custom-${s.id}" title="Turn on or off customizaion. Unsaved customization will be lost.">Customize</label>
          <input type="button" class="style-reset" value="Reset" title="Reset to the bundled style"${t.customize ? '' : ' disabled'} />
          <input type="button" class="style-save" value="Save" title="Save current customization into local storage"${t.customize ? '' : ' disabled'} />
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

function rebuildStyle() {
  let css = '';
  document
    .querySelectorAll('input.style-checkbox-enable:checked + label + details textarea')
    .forEach(textarea => {
      css += (textarea as HTMLInputElement).value + '\n';
    });
  return css;
}

function getStyleUI(id: string | undefined) {
  if (!id) {
    console.warn(`Invalid style id ${id}`);
    return;
  }
  const li = document.getElementById(id);
  if (!li) {
    console.warn(`Could not find requested list item ${id}`);
    return;
  }
  const enableCheckbox = li.querySelector<HTMLInputElement>('.style-checkbox-enable');
  const customCheckbox = li.querySelector<HTMLInputElement>('.style-checkbox-customize');
  const textarea = li.querySelector<HTMLTextAreaElement>('textarea');
  const resetButton = li.querySelector<HTMLInputElement>('.style-checkbox-reset');
  const saveButton = li.querySelector<HTMLInputElement>('.style-checkbox-save');
  if (enableCheckbox && customCheckbox && textarea && resetButton && saveButton) {
    return {
      id: li.id,
      enable: enableCheckbox,
      customize: customCheckbox,
      textarea: textarea,
      resetButton: resetButton,
      saveButton: saveButton,
    };
  }
  if (!li) {
    console.warn(`Could not find data from list item ${id}`);
    return;
  }
  return;
}

/**
 * Inject CSS style into jinteki.net background listener
 */
async function sendIt(css: string) {
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
    });
}

function toList(styles: {[key: string]: IdStyle}) {
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

async function getStyles() {
  const data = await browser.storage.local.get(['bundledStyles', 'userStyles']);
  const bundledStyles = toDict(data.bundledStyles);
  const userStyles = toDict(data.userStyles);
  return {bundledStyles, userStyles};
}

async function loadSidebar() {
  const {bundledStyles, userStyles} = await getStyles();
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

function registerStyleToggleEvent() {
  const styleCheckboxes = document.getElementsByClassName('style-checkbox-enable');
  for (let i = 0; i < styleCheckboxes.length; i++) {
    styleCheckboxes[i].addEventListener('change', async () => {
      const style = rebuildStyle();
      await sendIt(style);
    });
  }
}

function registerCustomizeToggleEvent() {
  const customCheckboxes = document.getElementsByClassName('style-checkbox-customize');
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
        } else {
          console.log('user style not found, do not modify text area');
        }
      } else {
        // reset textarea to bundled style
        if (style.id in styles.bundledStyles) {
          style.textarea.value = styles.bundledStyles[style.id].css;
        } else {
          console.warn('bundled style not found, do not modify text area');
        }
      }
      if (style.enable.checked) {
        await sendIt(rebuildStyle());
      }
    });
  }
}

function registerCustomizeResetEvent() {
  const applyButtons = document.getElementsByClassName('style-checkbox-reset');
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

function registerCustomizeSaveEvent() {
  const applyButtons = document.getElementsByClassName('style-checkbox-save');
  for (let i = 0; i < applyButtons.length; i++) {
    applyButtons[i].addEventListener('click', async () => {
      const element = applyButtons[i];
      const li = element.closest('li');
      const style = getStyleUI(li?.id);
      if (!style) {
        return;
      }
      // update style
      const {bundledStyles, userStyles} = await getStyles();
      if (style.id in userStyles) {
        userStyles[style.id].css = style.textarea.value;
      } else if (style.id in bundledStyles) {
        userStyles[style.id] = bundledStyles[style.id];
        userStyles[style.id].css = style.textarea.value;
      } else {
        console.warn('Tried to save style with unknown ID, do not save.');
      }
      await browser.storage.local.set({userStyles: toList(userStyles)});
      if (style.enable.checked) {
        const style = rebuildStyle();
        await sendIt(style);
      }
    });
  }
}

/**
 * Loading script for sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeLocalStorage();
  await loadSidebar();
  registerStyleToggleEvent();
  registerCustomizeToggleEvent();
  registerCustomizeResetEvent();
  registerCustomizeSaveEvent();
  const style = rebuildStyle();
  await sendIt(style);
});
