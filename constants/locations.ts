import type { LocationItem } from '../types';

export const ZIMBABWE_LOCATIONS: LocationItem[] = [
  {
    province: 'Harare Province',
    cities: [
      {
        name: 'Harare',
        suburbs: [
          'Avondale',
          'Borrowdale',
          'Budiriro',
          'Chitungwiza',
          'Epworth',
          'Glen Norah',
          'Glen View',
          'Greendale',
          'Highfield',
          'Kuwadzana',
          'Mabvuku',
          'Mbare',
          'Mount Pleasant',
          'Mufakose',
          'Rugare',
          'Ruwa',
          'Southerton',
          'Warren Park',
        ],
      },
      { name: 'Chitungwiza', suburbs: ['Seke', 'Zengeza', 'Unit J', 'St Marys'] },
      { name: 'Epworth', suburbs: ['Domboramwari'] },
      { name: 'Norton', suburbs: ['Norton Town'] },
      { name: 'Ruwa', suburbs: ['Ruwa Town'] },
    ],
  },
  {
    province: 'Bulawayo',
    cities: [
      {
        name: 'Bulawayo',
        suburbs: [
          'Hillside',
          'Khumalo',
          'Luveve',
          'Makokoba',
          'Mabutweni',
          'Mpopoma',
          'Nkulumane',
          'Nketa',
          'Pumula',
          'Riverside',
          'Sunningdale',
          'Thorngrove',
          'Waterford',
        ],
      },
    ],
  },
  {
    province: 'Manicaland',
    cities: [
      {
        name: 'Mutare',
        suburbs: ['Chikanga', 'Dangamvura', 'Hobhouse', 'Murambi', 'Sakubva'],
      },
      { name: 'Rusape', suburbs: ['Vengere'] },
      { name: 'Nyanga', suburbs: ['Nyanga Town'] },
    ],
  },
  {
    province: 'Mashonaland Central',
    cities: [
      { name: 'Bindura', suburbs: ['Chipadze', 'Madziva'] },
      { name: 'Shamva', suburbs: ['Shamva Town'] },
    ],
  },
  {
    province: 'Mashonaland East',
    cities: [
      { name: 'Marondera', suburbs: ['Dombotombo', 'Cherutombo'] },
      { name: 'Wedza', suburbs: [] },
    ],
  },
  {
    province: 'Mashonaland West',
    cities: [
      { name: 'Chinhoyi', suburbs: ['Chinhoyi Town'] },
      { name: 'Kariba', suburbs: ['Mahombekombe'] },
    ],
  },
  {
    province: 'Midlands',
    cities: [
      {
        name: 'Gweru',
        suburbs: ['Ascot', 'Mkoba', 'Senga', 'Southdowns'],
      },
      {
        name: 'Kwekwe',
        suburbs: ['Amaveni', 'Mbizo', 'Newton'],
      },
      { name: 'Redcliff', suburbs: [] },
    ],
  },
  {
    province: 'Masvingo',
    cities: [
      { name: 'Masvingo', suburbs: ['Mucheke', 'Rujeko'] },
      { name: 'Chiredzi', suburbs: [] },
    ],
  },
  {
    province: 'Matabeleland North',
    cities: [
      { name: 'Victoria Falls', suburbs: ['Chinotimba', 'Mkhosana'] },
      { name: 'Hwange', suburbs: ['Baobab', 'Empumalanga'] },
    ],
  },
  {
    province: 'Matabeleland South',
    cities: [
      { name: 'Gwanda', suburbs: [] },
      { name: 'Beitbridge', suburbs: [] },
    ],
  },
];

export const POPULAR_CITIES = [
  'Harare',
  'Bulawayo',
  'Gweru',
  'Mutare',
  'Masvingo',
  'Victoria Falls',
];

/**
 * Canonical flat list of every Zimbabwean city the app knows about.
 * Used as the `knownCities` parameter for AI / local-parser searches so
 * city detection always works regardless of which cities happen to be in
 * the remote database at the time.
 */
export const ZIMBABWE_CITIES: string[] = [
  ...new Set([
    ...ZIMBABWE_LOCATIONS.flatMap((province) => province.cities.map((c) => c.name)),
    ...POPULAR_CITIES,
  ]),
].sort();
