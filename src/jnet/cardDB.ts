/** Piggyback on NRDB card database used by jnet */
import * as debug from './debug';

let cached: CyberfeederDatabase | void | undefined;

export type CardType = Card | Agenda;
export interface Card {
  code: string;
  faction: string;
  images: {en: {default: {stock: string}}};
  normalizedtitle: string;
  side: 'Corp' | 'Runner';
  title: string;
  type: 'Identity' | 'Resource' | 'Hardware' | 'Event' | 'Program' | 'Upgrade' | 'Agenda' | 'Operation' | 'Asset' | 'Ice';
}

export interface Agenda extends Card {
  advancementcost: number;
  agendapoints: number;
  type: 'Agenda';
}

interface JNetDatabase {
  lang: string;
  cards: CardType[];
  version: number;
}

interface CyberfeederDatabase {
  cards: {[key: string]: CardType};
  version: number;
}

export async function load() {
  if (cached) {
    debug.log('[card] card db is already cached, skipping load');
    return;
  }
  const jnetDB = getJnetDatabase();
  const cfDB = await getCachedDatabase();
  if (!jnetDB && cfDB) {
    debug.warn('[card] Could not find jnet card database, using existing one');
    cached = cfDB;
    return;
  }
  if ((jnetDB && !cfDB) || (jnetDB && cfDB && cfDB.version > jnetDB.version)) {
    const db = await deriveCyberfeederDB(jnetDB);
    await browser.storage.local.set({items: {cardsByNames: db}});
    cached = db;
    debug.log('[card] loaded new card database');
    return;
  }
  debug.warn('[card] card db failed to load');
}

export function query(name: string): CardType | null {
  if (!cached) {
    debug.warn('[card] There is no card database, cannot query card');
    return null;
  }
  return cached.cards[name];
}

async function getCachedDatabase() {
  const db = await browser.storage.local
    .get('cardsByNames')
    .then(item => {
      const db = item.cardsByNames as CyberfeederDatabase;
      if (!db) {
        debug.log('[card] there is no cached card db');
        return;
      }
      return db;
    })
    .catch(err => debug.log('[cards]', err));
  return db;
}

function getJnetDatabase() {
  const textData = localStorage.getItem('cards');
  if (!textData) {
    debug.warn('[card] Could not find jnet DB');
    return;
  }
  return JSON.parse(textData) as JNetDatabase;
}

/** convert jnet's index-based db to text key based db */
async function deriveCyberfeederDB(jnetDB: JNetDatabase) {
  const cyberfeederDB: CyberfeederDatabase = {
    cards: {},
    version: jnetDB.version,
  };
  for (const card of jnetDB.cards) {
    cyberfeederDB.cards[card.title] = card;
  }
  return cyberfeederDB;
}
