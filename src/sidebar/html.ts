import {getCategorizedStyles, getStyles, getToggles} from './data';
import {Category, IdStyle, SavedToggles, StyleItemUI} from './types';

/**
 * Collect activated CSS styles and concatenate them into one
 */
export function rebuildStyle() {
  let css = '';
  document.querySelectorAll('input.style-enable:checked + label + details textarea').forEach(textarea => {
    css += (textarea as HTMLInputElement).value + '\n';
  });
  return css;
}

/**
 * Populate HTML in the sidebar based on CSS data and configurations
 */
export async function buildSidebar() {
  const {bundledStyles, userStyles} = await getStyles();
  const toggles = await getToggles();
  const element = document.getElementById('styles');
  if (element) {
    const categorized = getCategorizedStyles(bundledStyles, userStyles);
    for (const [key, category] of Object.entries(categorized)) {
      // innerHTML += '<div class="category">';
      const div = document.createElement('div');
      div.className = 'category';
      element.appendChild(div);

      // innerHTML += `<h2>${key}</h2>`;
      const h2 = document.createElement('h2');
      h2.textContent = key;
      div.appendChild(h2);

      populateRadioButton(div, category, toggles);
      populateCheckbox(div, category, toggles);
    }
  }
  await setVersion();
}

/**
 * Search style UI unit based on ID and return its interactable HTML elements
 */
export function getStyleUI(from: string | undefined | HTMLElement): StyleItemUI | undefined {
  if (!from) {
    console.warn(`Invalid style id ${from}`);
    return;
  }
  let li: HTMLElement | null;
  if (typeof from === 'string') {
    li = document.getElementById(from);
  } else {
    li = from;
  }
  if (!li) {
    console.warn(`Could not find requested list item ${from}`);
    return;
  }
  const enableCheckbox = li.querySelector<HTMLInputElement>('.style-enable');
  const customCheckbox = li.querySelector<HTMLInputElement>('.style-customize');
  const textarea = li.querySelector<HTMLTextAreaElement>('textarea');
  const resetButton = li.querySelector<HTMLInputElement>('.style-reset');
  const saveButton = li.querySelector<HTMLInputElement>('.style-save');
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
    console.warn(`Could not find data from list item ${from}`);
    return;
  }
  return;
}

function populateRadioButtonHTML(ul: HTMLElement, s: IdStyle, radioName: string, toggles?: SavedToggles) {
  const t = toggles
    ? toggles[s.id]
    : {
        enabled: s.default,
        customize: false,
      };

  const li = document.createElement('li');
  if (!s.id) {
    li.textContent = 'Error occured while parsing data';
  } else {
    // <li class="style-item radio" id=${s.id}>
    li.className = 'style-item radio';
    li.id = s.id;

    // <input type="radio" id="style-${s.id}" name="${radioName}" class="style-enable"${t.enabled ? ' checked' : ''} />
    const inputRadio = document.createElement('input');
    inputRadio.type = 'radio';
    inputRadio.id = `style-${s.id}`;
    inputRadio.name = radioName;
    inputRadio.className = 'style-enable';
    inputRadio.checked = t.enabled;
    li.appendChild(inputRadio);

    // <label for="style-${s.id}">${s.name}</label>
    const labelForRadio = document.createElement('label');
    labelForRadio.htmlFor = `style-${s.id}`;
    labelForRadio.textContent = s.name;
    li.appendChild(labelForRadio);

    // <details>
    const details = document.createElement('details');
    li.appendChild(details);

    // <summary>view/edit</summary>
    const summary = document.createElement('summary');
    summary.textContent = 'view/edit';
    details.appendChild(summary);

    // <div>
    const div = document.createElement('div');
    details.appendChild(div);

    // ${s.description ? "<p>"+s.description+"</p>" : ""}
    if (s.description) {
      const p = document.createElement('p');
      p.textContent = s.description;
      div.appendChild(p);
    }

    // <input type="checkbox" id="custom-${s.id}" name="custom-${s.id}" class="style-customize"/>
    const inputCheckbox = document.createElement('input');
    inputCheckbox.type = 'checkbox';
    inputCheckbox.id = `custom-${s.id}`;
    inputCheckbox.name = `custom-${s.id}`;
    inputCheckbox.className = 'style-customize';
    inputCheckbox.checked = t.customize;
    div.appendChild(inputCheckbox);

    // <label for="custom-${s.id}" title="Turn on or off customizaion. Unsaved customization will be lost.">Customize</label>
    const labelForCheckbox = document.createElement('label');
    labelForCheckbox.htmlFor = `custom-${s.id}`;
    labelForCheckbox.title = 'Turn on or off customizaion. Unsaved customization will be lost.';
    labelForCheckbox.textContent = 'Customize';
    div.appendChild(labelForCheckbox);

    // <input type="button" class="style-reset" value="Reset" title="Reset to the bundled style"${t.customize ? '' : ' disabled'} />
    const inputReset = document.createElement('input');
    inputReset.type = 'button';
    inputReset.className = 'style-reset';
    inputReset.value = 'Reset';
    inputReset.title = 'Reset to the bundled style';
    inputReset.disabled = !t.customize;
    div.appendChild(inputReset);

    // <input type="button" class="style-save" value="Save" title="Save current customization into local storage"${t.customize ? '' : ' disabled'} />
    const inputSave = document.createElement('input');
    inputSave.type = 'button';
    inputSave.className = 'style-save';
    inputSave.value = 'Save';
    inputSave.title = 'Save current customization into local storage';
    inputSave.disabled = !t.customize;
    div.appendChild(inputSave);

    // <textarea${t.customize ? '' : ' disabled'}>${s.css}</textarea>
    const textarea = document.createElement('textarea');
    textarea.textContent = s.css;
    textarea.disabled = !t.customize;
    div.appendChild(textarea);
  }
  ul.appendChild(li);
}

function populateRadioButton(div: HTMLElement, category: Category, toggles?: SavedToggles) {
  if (Object.keys(category.radioButton).length === 0) {
    return;
  }
  for (const [radioId, group] of Object.entries(category.radioButton)) {
    if (group.length === 0) {
      continue;
    }
    // innerHTML += '<ul class="radiobox">';
    const ul = document.createElement('ul');
    ul.className = 'radiobox';
    div.appendChild(ul);

    // innerHTML += `<h3>${radioId}</h3>`;
    const h3 = document.createElement('h3');
    h3.textContent = radioId;
    ul.appendChild(h3);

    for (const style of group) {
      populateRadioButtonHTML(ul, style, radioId, toggles);
    }
  }
}

function populateCheckboxHTML(ul: HTMLElement, s: IdStyle, toggles?: SavedToggles) {
  const t = toggles
    ? toggles[s.id]
    : {
        enabled: s.default,
        customize: false,
      };

  const li = document.createElement('li');
  if (!s.id) {
    li.textContent = 'Error occured while parsing data';
  } else {
    // <li class="style-item check" id=${s.id}>
    li.className = 'style-item check';
    li.id = s.id;

    //   <input type="checkbox" id="style-${s.id}" name="${s.id}" class="style-enable"${t.enabled ? ' checked' : ''} />
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `style-${s.id}`;
    input.name = s.id;
    input.className = 'style-enable';
    input.checked = t.enabled;
    li.appendChild(input);

    //   <label for="style-${s.id}">${s.name}</label>
    const label = document.createElement('label');
    label.htmlFor = `style-${s.id}`;
    label.textContent = s.name;
    li.appendChild(label);

    //   <details>
    const details = document.createElement('details');
    li.appendChild(details);

    //     <summary>view/edit</summary>
    const summary = document.createElement('summary');
    summary.textContent = 'view/edit';
    details.appendChild(summary);

    //     <div>
    const div = document.createElement('div');
    details.appendChild(div);

    //       ${s.description ? "<p>"+s.description+"</p>" : ""}
    if (s.description) {
      const p = document.createElement('p');
      p.textContent = s.description;
      div.appendChild(p);
    }

    //       <input type="checkbox" id="custom-${s.id}" name="custom-${s.id}" class="style-customize"/>
    const customCheckbox = document.createElement('input');
    customCheckbox.type = 'checkbox';
    customCheckbox.id = `custom-${s.id}`;
    customCheckbox.name = `custom-${s.id}`;
    customCheckbox.className = 'style-customize';
    customCheckbox.checked = t.customize;
    div.appendChild(customCheckbox);

    //       <label for="custom-${s.id}" title="Turn on or off customizaion. Unsaved customization will be lost.">Customize</label>
    const customLabel = document.createElement('label');
    customLabel.htmlFor = `custom-${s.id}`;
    customLabel.title = 'Turn on or off customization. Unsaved customization will be lost.';
    customLabel.textContent = 'Customize';
    div.appendChild(customLabel);

    //       <input type="button" class="style-reset" value="Reset" title="Reset to the bundled style"${t.customize ? '' : ' disabled'} />
    const resetButton = document.createElement('input');
    resetButton.type = 'button';
    resetButton.className = 'style-reset';
    resetButton.value = 'Reset';
    resetButton.title = 'Reset to the bundled style';
    resetButton.disabled = !t.customize;
    div.appendChild(resetButton);

    //       <input type="button" class="style-save" value="Save" title="Save current customization into local storage"${t.customize ? '' : ' disabled'} />
    const saveButton = document.createElement('input');
    saveButton.type = 'button';
    saveButton.className = 'style-save';
    saveButton.value = 'Save';
    saveButton.title = 'Save current customization into local storage';
    saveButton.disabled = !t.customize;
    div.appendChild(saveButton);

    //       <textarea${t.customize ? '' : ' disabled'}>${s.css}</textarea>
    const textarea = document.createElement('textarea');
    textarea.textContent = s.css;
    textarea.disabled = !t.customize;
    div.appendChild(textarea);
  }
  ul.appendChild(li);
}

function populateCheckbox(div: HTMLElement, category: Category, toggles?: SavedToggles) {
  if (category.checkBoxes.length === 0) {
    return;
  }
  // innerHTML += '<ul class="checkbox">';
  const ul = document.createElement('ul');
  ul.className = 'checkbox';
  div.appendChild(ul);

  for (const style of Object.values(category.checkBoxes)) {
    populateCheckboxHTML(ul, style, toggles);
  }
}

async function setVersion() {
  const element = document.getElementById('version');
  if (!element) {
    return console.warn("Coudldn't find version element");
  }
  const version = await browser.storage.local.get('version').then(item => item.version as string);
  const appVersion = browser.runtime.getManifest().version;
  element.textContent = `app version: ${appVersion}, style version: ${version}`;
}
