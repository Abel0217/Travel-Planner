import { useEffect, useRef, useState } from 'react';
import Beach from '../Pages/css/Images/Beach.jpg';
import Hollywood from '../Pages/css/Images/Hollywood.jpg';
import London from '../Pages/css/Images/London.jpg';
import Louvre from '../Pages/css/Images/Louvre.jpg';
import Mountains from '../Pages/css/Images/Mountains.jpg';
import Paris from '../Pages/css/Images/Paris.jpg';
import Rome from '../Pages/css/Images/Rome.jpg';
import TajMahal from '../Pages/css/Images/Taj Mahal.jpg';
import Toronto from '../Pages/css/Images/Toronto.jpg';
import Vegas from '../Pages/css/Images/Vegas.jpg';
import Venice from '../Pages/css/Images/Venice.jpg';

export const sceneryImages = [
    Beach,
    Hollywood,
    London,
    Louvre,
    Mountains,
    Paris,
    Rome,
    TajMahal,
    Toronto,
    Vegas,
    Venice,
    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=1600&q=80',
];

export const localSceneryCount = 11;

const preloadCache = new Map();

export const preloadScenery = (src) => {
    if (!src) return Promise.resolve(false);
    if (preloadCache.has(src)) return preloadCache.get(src);
    const promise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
    preloadCache.set(src, promise);
    return promise;
};

export const randomLocalSceneryIndex = (blockedIndex = -1) => {
    const blocked = blockedIndex >= 0 && blockedIndex < localSceneryCount;
    const span = localSceneryCount - (blocked ? 1 : 0);
    let index = Math.floor(Math.random() * span);
    if (blocked && index >= blockedIndex) index += 1;
    return index;
};

export const nextSceneryIndex = (current, blockedIndex) => {
    const total = sceneryImages.length;
    const blocked = new Set(Array.isArray(blockedIndex) ? blockedIndex : [blockedIndex]);
    for (let step = 1; step <= total; step += 1) {
        const index = (current + step) % total;
        if (!blocked.has(index)) return index;
    }
    return current;
};

export const useHeldCrossfade = ({
    initialIndex = 0,
    intervalMs = 16000,
    images = sceneryImages,
    holdRef = null,
    avoidRef = null,
    fadeMs = 2800,
}) => {
    const [base, setBase] = useState(initialIndex);
    const [incoming, setIncoming] = useState(null);
    const baseRef = useRef(initialIndex);
    const incomingRef = useRef(null);

    const publish = (nextBase, nextIncoming) => {
        if (holdRef) holdRef.current = { base: nextBase, incoming: nextIncoming };
    };

    useEffect(() => {
        let cancelled = false;
        let intervalId = 0;
        let promoteId = 0;
        publish(initialIndex, null);
        preloadScenery(images[initialIndex]);

        const advance = async () => {
            if (cancelled || incomingRef.current != null) return;
            const blocked = new Set([baseRef.current]);
            const other = avoidRef?.current;
            if (other?.base != null) blocked.add(other.base);
            if (other?.incoming != null) blocked.add(other.incoming);
            let cursor = baseRef.current;
            for (let step = 0; step < images.length; step += 1) {
                cursor = (cursor + 1) % images.length;
                if (blocked.has(cursor)) continue;
                const ready = await preloadScenery(images[cursor]);
                if (cancelled) return;
                if (!ready) {
                    blocked.add(cursor);
                    continue;
                }
                incomingRef.current = cursor;
                publish(baseRef.current, cursor);
                setIncoming(cursor);
                promoteId = window.setTimeout(() => {
                    if (cancelled) return;
                    baseRef.current = cursor;
                    incomingRef.current = null;
                    publish(cursor, null);
                    setBase(cursor);
                    setIncoming(null);
                }, fadeMs);
                return;
            }
        };

        const kickId = window.setTimeout(advance, 1200);
        intervalId = window.setInterval(advance, intervalMs);
        return () => {
            cancelled = true;
            window.clearTimeout(kickId);
            window.clearTimeout(promoteId);
            window.clearInterval(intervalId);
        };
    }, [avoidRef, fadeMs, holdRef, images, initialIndex, intervalMs]);

    return { base, incoming };
};
