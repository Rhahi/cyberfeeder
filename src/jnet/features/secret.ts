import {chat, command} from '../watchers';
import * as util from './util';
import {SimpleChannel} from 'channel-ts';

type MatchType = string | RegExp;
const eventName = 'secret-command-panel';

enum Secret {
  invalid,
  access,
  bottom,
  order,
}

const chatPatterns: ChatPattern[] = [
  {
    type: Secret.access,
    patterns: [/unseen card from (?<location>R&D)/],
    dispatch: handleRnDAccess,
  },
  {
    type: Secret.bottom,
    patterns: [
      //
      'adds one to the bottom of the stack',
      /add( \d+)? cards? from HQ to the bottom of R&D/,
    ],
    dispatch: handleBottom,
  },
  {
    type: Secret.order,
    patterns: [
      /looks? at the top( \d+)? cards? of/,
      /rearranges? the top( \d+)? cards? of/,
      /^(?!.*install it).*\b(?:uses? .* to reveal|reveals|then reveals?).*(HQ|R&D|Archives|Server|stack|Stack)\b/,
    ],
    dispatch: handleTop,
  },
];

const panelPatterns: PanelPattern[] = [
  {
    type: Secret.access,
    patterns: [/^You accessed (?<card>.*)\.(?:$| Pay| Trash| Shuffle| Add| Spend)/],
  },
  {
    type: Secret.bottom,
    patterns: [/^Add (?<card>.*) to bottom of (?:the )?(?<location>stack)\?$/],
  },
  {
    type: Secret.order,
    patterns: [/(?:top|bottom) (?<number>\d )?cards? of (?:the )?(?<location>stack|R&D) (?:is|are|will be) (?<card>.*)$/],
  },
];

// leave last secret to single item for now.
let lastSecret: PanelSecret = {category: Secret.invalid, age: -1, text: ''};
const secretPanelClicks: PanelClick[] = [];

interface ChatSecret {
  target: util.Location; // which location the information belongs to
  text: string; // the secret text that will be shown to the user
}

interface PanelSecretEvent extends PanelSecret {
  type: 'secret-command-panel';
}

interface PanelSecret {
  category: Secret; // identified secret category
  age: number; // length of chat at the time of the panel's appearance
  text: string; // h4 text contained in the panel
}

interface PanelClick {
  age: number;
  text: string;
}

interface ChatPattern {
  type: Secret;
  patterns: MatchType[];
  dispatch: (m: chat.ChatMessage, match: RegExpMatchArray) => Promise<void>;
}

interface PanelPattern {
  type: Secret;
  patterns: MatchType[];
}

/** Watch chat, find messages that should contain secret, to look further into it. */
const secretHandler = (e: Event) => {
  const event = e as CustomEvent<chat.ChatMessage>;
  if (!event.detail || event.detail.type !== chat.eventName) return;
  if (!event.detail.system) return;

  for (const s of chatPatterns) {
    for (const pattern of s.patterns) {
      const match = event.detail.text.match(pattern);
      if (match) s.dispatch(event.detail, match).catch();
    }
  }
};

/** Watch panel content events and store if they contain secrets. */
const secretPanelWatcher = (e: Event) => {
  const event = e as CustomEvent<command.CommandPanelContent>;
  if (!event.detail || event.detail.type !== command.contentEvent) return;
  if (!event.detail.text) return; // no text, no secret

  for (const pattern of panelPatterns) {
    for (const regex of pattern.patterns) {
      const match = event.detail.text.match(regex);
      if (match) {
        const age = util.getChatAge();
        const data = {category: pattern.type, age, text: event.detail.text};
        const secret = new CustomEvent<PanelSecretEvent>(eventName, {detail: {type: eventName, ...data}});
        lastSecret = data;
        document.dispatchEvent(secret);
        return;
      }
    }
  }
};

/** Watch panel click events and store recent clicks */
const secretPanelClickWatcher = (e: Event) => {
  const event = e as CustomEvent<command.CommandPanelClick>;
  if (!event.detail || event.detail.type !== command.clickEvent) return;

  const age = util.getChatAge();
  while (secretPanelClicks.length > 7) secretPanelClicks.shift();
  const click: PanelClick = {age, text: event.detail.text};
  secretPanelClicks.push(click);
};

export function enable() {
  document.addEventListener(chat.eventName, secretHandler);
  document.addEventListener(command.contentEvent, secretPanelWatcher);
  document.addEventListener(command.clickEvent, secretPanelClickWatcher);
}

export function disable() {
  document.removeEventListener(chat.eventName, secretHandler);
  document.removeEventListener(command.contentEvent, secretPanelWatcher);
  document.removeEventListener(command.clickEvent, secretPanelClickWatcher);
}

function annotate(element: Element, result: ChatSecret) {
  if (element.hasAttribute('secret')) return;

  element.setAttribute('secret', result.text);
  element.classList.add('secret');
  if (result.target !== 'unknown') element.classList.add(result.target);
}

async function handleRnDAccess(m: chat.ChatMessage, match: RegExpMatchArray) {
  const chan = watchPanel(2, Secret.access, m.age, 5);
  try {
    const maybeSecret = await chan.receive();
    let location: util.Location = 'unknown';
    if (match.groups) location = util.toLocation(match.groups['location']);
    annotate(m.element, {target: location, text: maybeSecret.text});
  } finally {
    chan.close();
  }
}

async function handleBottom() {}

async function handleTop() {}

function withinAgeRange(panelAge: number, chatAge: number, threshold: number) {
  return Math.abs(chatAge - panelAge) <= threshold;
}

/** Process X more panel messages to appear and resolve the secret or exit. */
function watchPanel(
  //
  num: number,
  category: Secret,
  chatAge: number,
  ageThreshold?: number,
  validate?: (x: PanelSecret) => boolean
) {
  const chan = new SimpleChannel<PanelSecret>();
  validateSend(chan, lastSecret, category, chatAge, ageThreshold, validate);

  let count = 0;
  const handler = (e: Event) => {
    const event = e as CustomEvent<PanelSecretEvent>;
    console.log(event.detail);
    if (!event.detail || event.detail.type !== eventName) return;

    count++;
    validateSend(chan, event.detail, category, chatAge, ageThreshold, validate);
    if (count > num) {
      document.removeEventListener(eventName, handler);
      chan.close();
    }
  };
  document.addEventListener(eventName, handler);
  return chan;
}

function validateSend(
  //
  chan: SimpleChannel<PanelSecret>,
  x: PanelSecret,
  category: Secret,
  chatAge: number,
  ageThreshold?: number,
  validate?: (x: PanelSecret) => boolean
) {
  if (ageThreshold && !withinAgeRange(x.age, chatAge, ageThreshold)) return `out of threshold ${x.age}, ${chatAge}`;
  if (x.category !== category) return 'wrong category';
  if (validate && !validate(x)) return 'validate reject';
  chan.send(lastSecret);
  return;
}
