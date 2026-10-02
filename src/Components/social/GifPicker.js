import React, { useEffect, useRef, useState } from 'react';
import './social.css';

// Search runs through GifSnap, which needs no key. Giphy's public demo key is
// banned, and a real Giphy key can only be created from a developer account.
const GIF_API = 'https://gifsnap.com/api/v1/gifs';

export const IMAGE_URL = /^https?:\/\/\S+\.(?:gif|png|jpe?g|webp)(?:\?\S*)?$/i;
export const GIPHY_URL = /^https?:\/\/(?:media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com|c\.tenor\.com|gifsnap\.com)\/\S+$/i;
export const isImageLink = (text) => {
    const value = (text || '').trim();
    return IMAGE_URL.test(value) || GIPHY_URL.test(value);
};

// Titles that are almost always drawn characters rather than real people.
const CARTOON = /\b(anime|manga|waifu|chibi|otaku|naruto|goku|luffy|pokemon|pikachu|kirby|minecraft|cartoon|animated|disney|pixar|spongebob|simpsons|rick and morty|one piece|demon slayer|jujutsu|attack on titan|studio ghibli|sailor moon|dragon ball)\b/i;

const CATEGORIES = [
    { label: 'Trending', q: '' },
    { label: 'Excited', q: 'excited' },
    { label: 'Love', q: 'love' },
    { label: 'LOL', q: 'laughing' },
    { label: 'Hungry', q: 'hungry food' },
    { label: 'Beach', q: 'beach vacation' },
    { label: 'Travel', q: 'travel airplane' },
    { label: 'Party', q: 'celebrate party' },
    { label: 'Yes', q: 'yes' },
    { label: 'OMG', q: 'omg' },
];

const GifPicker = ({ onPick, onClose, align = 'left' }) => {
    const ref = useRef(null);
    const catsRef = useRef(null);
    const drag = useRef({ on: false, x: 0, left: 0, moved: false });
    const [category, setCategory] = useState(0);
    const [query, setQuery] = useState('');
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const away = (event) => {
            if (ref.current && !ref.current.contains(event.target) && !event.target.closest('[data-gif-toggle]')) onClose();
        };
        const esc = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', esc);
        };
    }, [onClose]);

    const term = query.trim() || CATEGORIES[category].q;

    useEffect(() => {
        let live = true;
        const timer = setTimeout(async () => {
            setBusy(true);
            setFailed(false);
            try {
                const url = term
                    ? `${GIF_API}/search?q=${encodeURIComponent(term)}&limit=40`
                    : `${GIF_API}/trending?limit=40`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(String(response.status));
                const json = await response.json();
                const mapGifs = (payload) => {
                    const seen = new Set();
                    return (payload.data || []).map((gif) => ({
                        id: gif.id,
                        contentId: gif.content_id || gif.url,
                        title: gif.title,
                        ratio: Number(gif.width) / Number(gif.height) || 1,
                        preview: gif.url || gif.preview_url,
                        full: gif.url,
                    })).filter((gif) => {
                        if (!gif.full || seen.has(gif.contentId)) return false;
                        seen.add(gif.contentId);
                        return true;
                    });
                };
                const realPeople = (list) => list.filter((gif) => !CARTOON.test(gif.title || ''));
                let mapped = mapGifs(json);
                let people = realPeople(mapped);
                if (term && people.length < 8) {
                    const extra = await fetch(`${GIF_API}/search?q=${encodeURIComponent(`${term} person`)}&limit=24`);
                    if (extra.ok) {
                        const extraJson = await extra.json();
                        const seen = new Set(people.map((gif) => gif.contentId));
                        realPeople(mapGifs(extraJson)).forEach((gif) => {
                            if (!seen.has(gif.contentId)) {
                                seen.add(gif.contentId);
                                people.push(gif);
                            }
                        });
                    }
                }
                if (live) setItems(people.length >= 8 ? people : mapped);
            } catch (error) {
                if (live) { setItems([]); setFailed(true); }
            } finally {
                if (live) setBusy(false);
            }
        }, query.trim() ? 350 : 0);
        return () => { live = false; clearTimeout(timer); };
    }, [term, query]);

    const columns = [[], []];
    const heights = [0, 0];
    items.forEach((gif) => {
        const side = heights[0] <= heights[1] ? 0 : 1;
        columns[side].push(gif);
        heights[side] += 1 / gif.ratio;
    });

    return (
        <div ref={ref} className={`soc-pop soc-gif is-${align}`}>
            <div className="soc-gif-search">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                    autoFocus
                    type="text"
                    value={query}
                    placeholder="Search GIFs"
                    onChange={(event) => setQuery(event.target.value)}
                />
                {query ? <button type="button" aria-label="Clear" onClick={() => setQuery('')}>×</button> : null}
            </div>
            <div
                ref={catsRef}
                className="soc-gif-cats"
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    drag.current = { on: true, x: event.clientX, left: catsRef.current.scrollLeft, moved: false };
                }}
                onPointerMove={(event) => {
                    if (!drag.current.on || !catsRef.current) return;
                    const dx = event.clientX - drag.current.x;
                    if (Math.abs(dx) > 4) drag.current.moved = true;
                    catsRef.current.scrollLeft = drag.current.left - dx;
                }}
                onPointerUp={() => { drag.current.on = false; }}
                onPointerLeave={() => { drag.current.on = false; }}
                onWheel={(event) => {
                    if (!catsRef.current || !event.deltaY) return;
                    catsRef.current.scrollLeft += event.deltaY;
                }}
                onClickCapture={(event) => {
                    if (!drag.current.moved) return;
                    event.preventDefault();
                    event.stopPropagation();
                    drag.current.moved = false;
                }}
            >
                {CATEGORIES.map((cat, index) => (
                    <button
                        type="button"
                        key={cat.label}
                        className={!query && category === index ? 'is-on' : ''}
                        onClick={() => { setQuery(''); setCategory(index); }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
            <div className="soc-gif-grid">
                {columns.map((column, index) => (
                    <div className="soc-gif-col" key={index}>
                        {column.map((gif) => (
                            <button type="button" key={gif.id} className="soc-gif-item" title={gif.title} onClick={() => onPick(gif.full)}>
                                <img src={gif.preview} alt={gif.title || 'GIF'} loading="lazy" style={{ aspectRatio: gif.ratio }} />
                            </button>
                        ))}
                    </div>
                ))}
                {busy && items.length === 0 ? <p className="soc-gif-note">Loading GIFs…</p> : null}
                {!busy && items.length === 0 ? (
                    <p className="soc-gif-note">{failed ? 'GIFs Could Not Be Loaded Right Now.' : 'No GIFs Found. Try Another Search.'}</p>
                ) : null}
            </div>
        </div>
    );
};

export default GifPicker;
