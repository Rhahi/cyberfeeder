/** Bundled style data coming from the toml file */
export interface StyleData {
  version: string;
  style: Style[];
}

/** Information included in the bundle style */
export interface Style {
  category: string;
  series: string;
  default: boolean;
  name: string;
  css: string;
  description: string;
}

/** Internal representation of style with identifier */
export interface IdStyle extends Style {
  id: string;
}

export interface IdStyleDict {
  [key: string]: IdStyle;
}

/** Style representation when loaded in the extension */
export interface CollectedStyle {
  [category: string]: Category;
}

export interface Category {
  checkBoxes: IdStyle[];
  radioButton: RadioBoxSeries;
}

export interface RadioBoxSeries {
  [series: string]: IdStyle[];
}

export interface IdToggle {
  id: string;
  enabled: boolean;
  customize: boolean;
}

export interface SavedToggles {
  [key: string]: IdToggle;
}

export interface StyleItemUI {
  id: string;
  enable: HTMLInputElement;
  customize: HTMLInputElement;
  textarea: HTMLTextAreaElement;
  resetButton: HTMLInputElement;
  saveButton: HTMLInputElement;
}

export interface ScriptToggle {
  id: string;
  enabled: boolean;
  args?: unknown;
}

export type TabType = 'style' | 'script';
