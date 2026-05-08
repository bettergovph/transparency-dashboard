import { MeiliSearch } from 'meilisearch';
const client = new MeiliSearch({
  host: 'https://search2.bettergov.ph',
  apiKey: '307c9f43a066a443cc37d62b45fa47fde2b39f765139dd964ea151daed65f55c',
});
const r = await client.index('gaa').search('', {
  filter: `year = 2026 AND uacs_dpt_dsc = "Department of Information and Communications Technology (DICT)"`,
  limit: 2,
});
console.log(JSON.stringify(r.hits, null, 2));
