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
    'Big Ben': 'London, UK',
    'Brandenburg Gate': 'Berlin, Germany',
    'Burj Khalifa': 'Dubai, UAE',
    'Chichen Itza': 'Yucatan, Mexico',
    'Christ the Redeemer': 'Rio de Janeiro, Brazil',
    'Colosseum': 'Rome, Italy',
    'Eiffel Tower': 'Paris, France',
    'Giza Pyramids': 'Giza, Egypt',
    'Golden Gate': 'San Francisco, USA',
    'Great Wall': 'Beijing, China',
    'Hagia Sophia': 'Istanbul, Turkey',
    'Kinkaku-ji': 'Kyoto, Japan',
    'Machu Picchu': 'Cusco, Peru',
    'Parthenon': 'Athens, Greece',
    'Petra': 'Ma\u2019an, Jordan',
    'Pisa': 'Pisa, Italy',
    'Sagrada Familia': 'Barcelona, Spain',
    'Statue of Liberty': 'New York, USA',
    'Sydney Opera House': 'Sydney, Australia',
    'Taj Mahal': 'Agra, India',
    'Tower Bridge': 'London, UK',
};

const monumentCards = context.keys().map((key) => {
    const loaded = context(key);
    const name = key.replace(/^\.\//, '').replace(/\.jpe?g$/i, '');
    return { src: typeof loaded === 'string' ? loaded : loaded.default, name, place: PLACES[name] || '' };
}).filter((card) => card.src);

const shuffle = (items) => {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
};

export const pickRandomMonumentCards = (count) => shuffle(monumentCards).slice(0, count);

// The login cards are wide rectangles. Only photos that are already landscape,
// and wide enough to fill that shape, are used. Portrait shots of towers get cut off.
const MIN_CARD_RATIO = 1.7;

const measureRatio = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
        const width = img.naturalWidth || 0;
        const height = img.naturalHeight || 0;
        resolve(height ? width / height : 0);
    };
    img.onerror = () => resolve(0);
    img.src = src;
});

export const pickLandscapeMonumentCards = async (count) => {
    const measured = await Promise.all(monumentCards.map(async (card) => ({
        card,
        ratio: await measureRatio(card.src),
    })));
    return shuffle(measured.filter((item) => item.ratio >= MIN_CARD_RATIO).map((item) => item.card)).slice(0, count);
};