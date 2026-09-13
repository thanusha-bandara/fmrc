import Dexie from 'dexie';

export const db = new Dexie('FMRCLocalDB');

db.version(1).stores({
  syncQueue: '++id, url, method, timestamp' // body and headers don't need to be indexed
});
