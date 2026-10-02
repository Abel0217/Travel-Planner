import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sceneryImages, preloadScenery, randomLocalSceneryIndex } from '../utils/scenery';
import { pickRandomMonumentCards } from '../utils/monuments';
import '../Pages/css/Auth.css';

// Three rounded photo cards of famous places, picked at random on every page load.
function AuthShell({ wide = false, children }) {
    const pageRef = useRef(null);
    // Chosen once per page load. Nothing rotates on a timer.
    const [background] = useState(() => sceneryImages[randomLocalSceneryIndex()]);
    const [cards] = useState(() => pickRandomMonumentCards(3));
    const [ready, setReady] = useState(false);

    // Keep the page exactly as tall as the screen under the navbar.
    useLayoutEffect(() => {
        const measure = () => {
            const bar = document.querySelector('.navbar');
            const height = bar ? bar.getBoundingClientRect().height : 0;
            if (pageRef.current) {
                pageRef.current.style.setProperty('--auth-nav-h', `${Math.round(height)}px`);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Wait for the photos, then fade them in over the navy base so nothing flashes blank.
    useEffect(() => {
        let alive = true;
        const sources = [background, ...cards.map((card) => card.src)];
        const giveUp = window.setTimeout(() => alive && setReady(true), 2500);
        Promise.all(sources.map(preloadScenery)).then(() => {
            if (alive) setReady(true);
        });
        return () => {
            alive = false;
            window.clearTimeout(giveUp);
        };
    }, [background, cards]);

    return (
        <div ref={pageRef} className={`auth-page${ready ? ' is-ready' : ''}`}>
            <div
                className="auth-scenery"
                style={{ backgroundImage: `url("${background}")` }}
            />

            <div className="auth-layout">
                <div className="auth-collage" aria-hidden="true">
                    {cards.map((card, index) => (
                        <figure className={`auth-tile is-${index}`} key={card.name} style={{ '--i': index }}>
                            <img src={card.src} alt="" draggable="false" />
                            <figcaption>
                                <span className="auth-tile-pin">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
                                        <circle cx="12" cy="9.5" r="2.5" />
                                    </svg>
                                </span>
                                <span className="auth-tile-text">
                                    <b>{card.name}</b>
                                    {card.place ? <em>{card.place}</em> : null}
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>

                <div className={`auth-card${wide ? ' is-wide' : ''}`}>{children}</div>
            </div>
        </div>
    );
}

export default AuthShell;
