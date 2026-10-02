// Every .jpg dropped into src/Pages/css/Puzzle is picked up automatically,
// so adding more monuments later only means adding more photos to that folder.
const context = require.context('../Pages/css/Puzzle', false, /\.jpe?g$/i);

export const monumentImages = context
    .keys()
    .map((key) => {
        const loaded = context(key);
        return typeof loaded === 'string' ? loaded : loaded.default;
    })
    .filter(Boolean);

// Random, no repeats, different on every refresh.
export const pickRandomMonuments = (count) => {
    const pool = [...monumentImages];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
};

// Place names shown on the Log In / Sign Up photo cards.
const PLACES = {
    'Angkor Wat': 'Siem Reap, Cambodia',
    'Arc de Triomphe': 'Paris, France',
    'Brandenburg Gate': 'Berlin, Germany',
    'Burj Khalifa': 'Dubai, UAE',
    'Chichen Itza': 'Yucatan, Mexico',
    'Christ the Redeemer': 'Rio de Janeiro, Brazil',
    'Colosseum': 'Rome, Italy',
    'Giza Pyramids': 'Giza, Egypt',
    'Golden Gate': 'San Francisco, USA',
    'Great Wall': 'Beijing, China',
    'Hagia Sophia': 'Istanbul, Turkey',
    'Kinkaku-ji': 'Kyoto, Japan',
    'Machu Picchu': 'Cusco, Peru',
    'Parthenon': 'Athens, Greece',
    'Petra': 'Ma\u2019an, Jordan',
    'Sagrada Familia': 'Barcelona, Spain',
    'Sydney Opera House': 'Sydney, Australia',
    'Taj Mahal': 'Agra, India',
    'Tower Bridge': 'London, UK',
};

const monumentCards = context.keys().map((key) => {
    const loaded = context(key);
    const name = key.replace(/^\.\//, '').replace(/\.jpe?g$/i, '');
    return { src: typeof loaded === 'string' ? loaded : loaded.default, name, place: PLACES[name] || '' };
}).filter((card) => card.src);

export const pickRandomMonumentCards = (count) => {
    const pool = [...monumentCards];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
};