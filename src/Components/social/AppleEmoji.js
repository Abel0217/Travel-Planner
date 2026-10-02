import React, { useState } from 'react';

// Apple-style emoji artwork (same sheet the picker uses), so emojis look the
// same on every device. Falls back to the native glyph if an image is missing.
export const APPLE_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/';

// One emoji "grapheme": pictographs (+ skin tone / joiners / variation selector),
// flags and keycaps.
const EMOJI_SOURCE = '(?:\\p{Extended_Pictographic}(?:\\ufe0f|[\\u{1F3FB}-\\u{1F3FF}])?(?:\\u200d\\p{Extended_Pictographic}(?:\\ufe0f|[\\u{1F3FB}-\\u{1F3FF}])?)*|[\\u{1F1E6}-\\u{1F1FF}]{2}|[0-9#*]\\ufe0f?\\u20e3)';

export const toUnified = (char, keepVariation = true) =>
    Array.from(char)
        .map((ch) => ch.codePointAt(0).toString(16))
        .filter((hex) => keepVariation || hex !== 'fe0f')
        .join('-');

export const appleUrl = (char) => `${APPLE_BASE}${toUnified(char, false)}.png`;

export const AppleEmoji = ({ char, size = '1.25em', className = '' }) => {
    const [attempt, setAttempt] = useState(0);
    if (attempt > 1) return <span className={className}>{char}</span>;
    const src = `${APPLE_BASE}${toUnified(char, attempt === 0)}.png`;
    return (
        <img
            className={`apple-emoji ${className}`}
            src={src}
            alt={char}
            draggable="false"
            loading="lazy"
            style={{ width: size, height: size }}
            onError={() => setAttempt((n) => n + 1)}
        />
    );
};

// Splits a string into plain text and emoji parts.
export const splitEmoji = (text) => {
    const parts = [];
    const re = new RegExp(EMOJI_SOURCE, 'gu');
    let last = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
        if (match.index > last) parts.push({ text: text.slice(last, match.index) });
        parts.push({ emoji: match[0] });
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
};

// True when the message is only a few emojis (so it can be shown extra large).
export const emojiOnlyCount = (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return 0;
    const parts = splitEmoji(trimmed);
    if (parts.some((part) => part.text && part.text.trim() !== '')) return 0;
    return parts.filter((part) => part.emoji).length;
};

export default AppleEmoji;
