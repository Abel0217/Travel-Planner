import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import {
    collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, FieldPath,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { AuthContext } from '../../../Contexts/AuthContext';
import { mediaUrl } from '../../../utils/mediaUrl';
import apiClient from '../../../api/apiClient';
import AppleEmoji, { splitEmoji, emojiOnlyCount } from '../../../Components/social/AppleEmoji';
import EmojiPopover from '../../../Components/social/EmojiPopover';
import GifPicker, { isImageLink } from '../../../Components/social/GifPicker';
import './css/LiveChat.css';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '🎉'];
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const NEAR_BOTTOM = 140;

const toDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

const dayLabel = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sameDay(date, today)) return 'Today';
    if (sameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
};

const timeLabel = (date) => (date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');

const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

// Plain text with clickable links and Apple-style emojis.
const RichText = ({ text }) => {
    const nodes = [];
    String(text || '').split(URL_PATTERN).forEach((chunk, index) => {
        if (/^https?:\/\//.test(chunk)) {
            const trimmed = chunk.replace(/[).,!?]+$/, '');
            const tail = chunk.slice(trimmed.length);
            nodes.push(<a key={`l${index}`} href={trimmed} target="_blank" rel="noreferrer">{trimmed}</a>);
            if (tail) nodes.push(tail);
        } else {
            splitEmoji(chunk).forEach((part, partIndex) => {
                if (part.emoji) nodes.push(<AppleEmoji key={`e${index}-${partIndex}`} char={part.emoji} />);
                else nodes.push(<React.Fragment key={`t${index}-${partIndex}`}>{part.text}</React.Fragment>);
            });
        }
    });
    return <>{nodes}</>;
};

const LiveChat = ({ itineraryId, active = false }) => {
    const { currentUser } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [draft, setDraft] = useState('');
    const [panel, setPanel] = useState(null); // 'emoji' | 'gif' | null
    const [reactFor, setReactFor] = useState(null); // message id showing the reaction tray
    const [reactEmojiFor, setReactEmojiFor] = useState(null);
    const [atBottom, setAtBottom] = useState(true);
    const [unseen, setUnseen] = useState(0);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, userName, text, gif }
    const [seenBy, setSeenBy] = useState([]);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const firstLoad = useRef(true);
    const lastCount = useRef(0);

    // Bring the chat card into view so the composer is not below the fold.
    useEffect(() => {
        const id = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'itineraries', itineraryId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
            setLoaded(true);
        });
        return unsubscribe;
    }, [itineraryId]);

    useEffect(() => {
        if (!active || !itineraryId) return undefined;
        let live = true;
        const loadReceipts = () => {
            apiClient.get('/notifications/chat/receipts', { params: { itineraryId } })
                .then((response) => { if (live) setSeenBy(response.data || []); })
                .catch(() => {});
        };
        apiClient.post('/notifications/chat/seen', { itineraryId })
            .catch((error) => console.error('Chat seen state was not saved:', error))
            .finally(loadReceipts);
        const timer = setInterval(loadReceipts, 8000);
        return () => { live = false; clearInterval(timer); };
    }, [active, itineraryId, messages.length]);

    const scrollToEnd = useCallback((smooth = true) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // Keep the view pinned to the newest message unless the reader scrolled up.
    useEffect(() => {
        if (!loaded) return;
        const added = messages.length - lastCount.current;
        lastCount.current = messages.length;
        if (firstLoad.current) {
            firstLoad.current = false;
            requestAnimationFrame(() => scrollToEnd(false));
            return;
        }
        if (added <= 0) return;
        const mine = messages[messages.length - 1]?.userId === currentUser?.uid;
        if (atBottom || mine) requestAnimationFrame(() => scrollToEnd(true));
        else setUnseen((n) => n + added);
    }, [messages, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

    const onScroll = () => {
        const el = listRef.current;
        if (!el) return;
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
        setAtBottom(near);
        if (near) setUnseen(0);
    };

    const latestPhotos = useMemo(() => {
        const photos = {};
        messages.forEach((msg) => {
            if (msg.userId && msg.userProfilePic) photos[msg.userId] = msg.userProfilePic;
        });
        if (currentUser?.uid && currentUser.photoURL) photos[currentUser.uid] = currentUser.photoURL;
        return photos;
    }, [messages, currentUser]);

    const travelers = useMemo(() => {
        const seen = new Map();
        messages.forEach((msg) => {
            if (msg.userId && !seen.has(msg.userId)) seen.set(msg.userId, msg.userName || 'Traveler');
        });
        return Array.from(seen, ([uid, name]) => ({ uid, name }));
    }, [messages]);

    const post = async ({ text = '', gif = '' }) => {
        if (!currentUser || (!text.trim() && !gif)) return;
        const body = {
            text: text.trim(),
            timestamp: new Date(),
            userId: currentUser.uid,
            userName: currentUser.name || 'Anonymous',
            userProfilePic: currentUser.photoURL || '',
        };
        if (gif) body.gif = gif;
        if (replyTo) {
            body.replyTo = {
                id: replyTo.id,
                userName: replyTo.userName || 'Traveler',
                text: (replyTo.text || '').slice(0, 120),
                gif: Boolean(replyTo.gif),
            };
        }
        setReplyTo(null);
        setSending(true);
        try {
            const ref = await addDoc(collection(db, 'itineraries', itineraryId, 'messages'), body);
            apiClient.post('/notifications/chat', {
                itineraryId,
                text: gif && !body.text ? 'Sent A GIF' : body.text,
                messageId: ref.id,
                userName: currentUser.name || 'A Traveler',
            }).catch((error) => console.error('Chat alert was not saved:', error));
        } catch (error) {
            console.error('Message was not sent:', error);
        } finally {
            setSending(false);
        }
    };

    const sendDraft = () => {
        const text = draft.trim();
        if (!text) return;
        setDraft('');
        setPanel(null);
        // A lone image / GIF link is sent as a picture.
        if (isImageLink(text) && !/\s/.test(text)) post({ gif: text });
        else post({ text });
        requestAnimationFrame(() => {
            if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus(); }
        });
    };

    const addEmoji = (emoji) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? draft.length;
        const end = el?.selectionEnd ?? draft.length;
        const next = draft.slice(0, start) + emoji + draft.slice(end);
        setDraft(next);
        requestAnimationFrame(() => {
            if (!el) return;
            el.focus();
            const caret = start + emoji.length;
            el.setSelectionRange(caret, caret);
        });
    };

    const sendGif = (url) => {
        setPanel(null);
        post({ gif: url });
    };

    const toggleReaction = async (msg, emoji) => {
        if (!currentUser) return;
        const mine = (msg.reactions?.[emoji] || []).includes(currentUser.uid);
        try {
            await updateDoc(
                doc(db, 'itineraries', itineraryId, 'messages', msg.id),
                new FieldPath('reactions', emoji),
                mine ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
            );
        } catch (error) {
            console.error('Reaction was not saved:', error);
        }
        setReactFor(null);
        setReactEmojiFor(null);
    };

    const unsend = async (msg) => {
        if (!window.confirm('Unsend this message for everyone?')) return;
        try {
            await deleteDoc(doc(db, 'itineraries', itineraryId, 'messages', msg.id));
        } catch (error) {
            console.error('Message was not removed:', error);
        }
    };

    const startReply = (msg) => {
        setReplyTo({ id: msg.id, userName: msg.userName, text: msg.text, gif: msg.gif });
        setReactFor(null);
        setPanel(null);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const jumpTo = (id) => {
        const el = listRef.current?.querySelector(`[data-msg="${id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('is-flash');
        setTimeout(() => el.classList.remove('is-flash'), 1400);
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape' && replyTo) {
            setReplyTo(null);
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendDraft();
        }
    };

    const onInput = (event) => {
        setDraft(event.target.value);
        const el = event.target;
        // Grow with the text for the first three lines, then scroll like iMessage.
        el.style.overflowY = 'hidden';
        el.style.height = 'auto';
        const cap = 86;
        const full = el.scrollHeight;
        el.style.height = `${Math.min(full, cap)}px`;
        el.style.overflowY = full > cap + 1 ? 'auto' : 'hidden';
    };

    const avatarFor = (msg) => mediaUrl(latestPhotos[msg.userId] || msg.userProfilePic) || '';

    const renderAvatar = (msg, show) => {
        if (!show) return <span className="lc-avatar is-spacer" aria-hidden="true" />;
        const src = avatarFor(msg);
        return src
            ? <img src={src} alt="" className="lc-avatar" />
            : <span className="lc-avatar is-initials">{initials(msg.userName)}</span>;
    };

    const lastOwn = [...messages].reverse().find((msg) => msg.userId === currentUser?.uid);
    const lastOwnId = lastOwn?.id;
    const lastOwnAt = lastOwn ? toDate(lastOwn.timestamp) : null;
    const seenPeople = lastOwnAt
        ? seenBy.filter((person) => {
            const seenAt = person.seen_at ? new Date(person.seen_at) : null;
            return seenAt && !Number.isNaN(seenAt.getTime()) && seenAt >= lastOwnAt;
        })
        : [];

    const rows = [];
    messages.forEach((msg, index) => {
        const date = toDate(msg.timestamp);
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const prevDate = previous ? toDate(previous.timestamp) : null;
        const nextDate = next ? toDate(next.timestamp) : null;
        const newDay = !prevDate || !sameDay(prevDate, date);
        const gap = prevDate && date && (date - prevDate) / 60000 > 8;
        const isStart = newDay || !previous || previous.userId !== msg.userId || gap;
        const nextBreaks = !next || next.userId !== msg.userId || !nextDate || !date || !sameDay(nextDate, date) || (nextDate - date) / 60000 > 8;
        const mine = msg.userId === currentUser?.uid;
        const jumbo = !msg.gif ? emojiOnlyCount(msg.text) : 0;

        if (newDay && date) rows.push(<div key={`d${msg.id}`} className="lc-day"><span>{dayLabel(date)}</span></div>);

        const reactions = Object.entries(msg.reactions || {}).filter(([, uids]) => uids && uids.length > 0);

        rows.push(
            <div
                key={msg.id}
                data-msg={msg.id}
                className={['lc-row', mine ? 'is-mine' : 'is-theirs', isStart ? 'is-start' : '', nextBreaks ? 'is-end' : ''].join(' ')}
            >
                {!mine ? renderAvatar(msg, nextBreaks) : null}
                <div className="lc-stack">
                    {isStart && !mine ? <span className="lc-name">{msg.userName || 'Traveler'}</span> : null}
                    <div className="lc-line">
                        <div
                            className={`lc-bubble ${msg.gif ? 'has-gif' : ''} ${jumbo && jumbo <= 4 && !msg.replyTo ? 'is-jumbo' : ''}`}
                            onDoubleClick={() => startReply(msg)}
                        >
                            {msg.replyTo ? (
                                <button type="button" className="lc-quote" onClick={() => jumpTo(msg.replyTo.id)}>
                                    <b>{msg.replyTo.userName}</b>
                                    <span>{msg.replyTo.text || (msg.replyTo.gif ? 'GIF' : 'Message')}</span>
                                </button>
                            ) : null}
                            {msg.gif ? (
                                <a href={msg.gif} target="_blank" rel="noreferrer" className="lc-gif">
                                    <img src={msg.gif} alt="GIF" loading="lazy" />
                                </a>
                            ) : null}
                            {msg.text ? <p><RichText text={msg.text} /></p> : null}
                        </div>
                        <div className="lc-tools">
                            <button type="button" title="Reply" className="lc-reply-btn" onClick={() => startReply(msg)}>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M9 14L4 9l5-5" />
                                    <path d="M4 9h10a6 6 0 0 1 6 6v3" />
                                </svg>
                            </button>
                            <button type="button" title="React" onClick={() => { setReactFor(reactFor === msg.id ? null : msg.id); setReactEmojiFor(null); }}>☺</button>
                            {mine ? <button type="button" title="Unsend" className="is-danger" onClick={() => unsend(msg)}>🗑</button> : null}
                            {reactFor === msg.id ? (
                                <div className="lc-tray">
                                    {QUICK_REACTIONS.map((emoji) => (
                                        <button type="button" key={emoji} onClick={() => toggleReaction(msg, emoji)}>
                                            <AppleEmoji char={emoji} size="26px" />
                                        </button>
                                    ))}
                                    <button type="button" className="lc-tray-more" title="More" onClick={() => setReactEmojiFor(reactEmojiFor === msg.id ? null : msg.id)}>+</button>
                                    {reactEmojiFor === msg.id ? (
                                        <EmojiPopover
                                            align={mine ? 'right' : 'left'}
                                            width={320}
                                            height={360}
                                            onClose={() => setReactEmojiFor(null)}
                                            onPick={(emoji) => toggleReaction(msg, emoji)}
                                        />
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {reactions.length > 0 ? (
                        <div className="lc-reactions">
                            {reactions.map(([emoji, uids]) => (
                                <button
                                    type="button"
                                    key={emoji}
                                    className={uids.includes(currentUser?.uid) ? 'is-mine' : ''}
                                    onClick={() => toggleReaction(msg, emoji)}
                                >
                                    <AppleEmoji char={emoji} size="16px" />
                                    <b>{uids.length}</b>
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {nextBreaks && date ? <span className="lc-time">{timeLabel(date)}</span> : null}
                    {mine && msg.id === lastOwnId && seenPeople.length > 0 ? (
                        <span className="lc-seen" title={`Seen by ${seenPeople.map((person) => person.name).join(', ')}`}>
                            <span className="lc-seen-faces">
                                {seenPeople.slice(0, 3).map((person) => {
                                    const src = mediaUrl(latestPhotos[person.user_uid]) || '';
                                    return src
                                        ? <img key={person.user_uid} src={src} alt="" />
                                        : <b key={person.user_uid}>{initials(person.name)}</b>;
                                })}
                            </span>
                            Seen
                        </span>
                    ) : null}
                </div>
            </div>,
        );
    });

    return (
        <div className="live-chat" ref={rootRef}>
            <header className="lc-head">
                <span className="lc-head-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z" />
                    </svg>
                </span>
                <div className="lc-head-text">
                    <h2>Trip Chat</h2>
                    <p><i className="lc-live" />Live · Everyone On This Trip Sees Messages Instantly</p>
                </div>
                {travelers.length > 0 ? (
                    <div className="lc-people" title={travelers.map((p) => p.name).join(', ')}>
                        {travelers.slice(0, 4).map((person) => {
                            const src = mediaUrl(latestPhotos[person.uid]) || '';
                            return src
                                ? <img key={person.uid} src={src} alt={person.name} />
                                : <span key={person.uid}>{initials(person.name)}</span>;
                        })}
                        {travelers.length > 4 ? <span className="is-more">+{travelers.length - 4}</span> : null}
                    </div>
                ) : null}
            </header>

            <div className="lc-body">
                <div className="lc-messages" ref={listRef} onScroll={onScroll}>
                    {!loaded ? <p className="lc-empty">Loading Messages…</p> : null}
                    {loaded && messages.length === 0 ? (
                        <div className="lc-welcome">
                            <span><AppleEmoji char="✈️" size="46px" /></span>
                            <h3>Start The Conversation</h3>
                            <p>Plan the days, share a find, or drop a GIF. Everyone on this trip will see it right away.</p>
                            <div>
                                {['Who Is Excited? 🎉', 'Dinner Idea 🍝', 'Packing Check 🧳'].map((starter) => (
                                    <button type="button" key={starter} onClick={() => post({ text: starter })}>{starter}</button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {rows}
                </div>
                {!atBottom ? (
                    <button type="button" className="lc-jump" onClick={() => { scrollToEnd(true); setUnseen(0); }}>
                        {unseen > 0 ? `${unseen} New Message${unseen > 1 ? 's' : ''}` : 'Latest'} ↓
                    </button>
                ) : null}
            </div>

            {replyTo ? (
                <div className="lc-replying">
                    <span className="lc-replying-bar" />
                    <div>
                        <b>Replying To {replyTo.userName || 'Traveler'}</b>
                        <span>{replyTo.text || (replyTo.gif ? 'GIF' : 'Message')}</span>
                    </div>
                    <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>×</button>
                </div>
            ) : null}

            <div className="lc-composer">
                {panel === 'emoji' ? <EmojiPopover onClose={() => setPanel(null)} onPick={addEmoji} /> : null}
                {panel === 'gif' ? <GifPicker align="left" onClose={() => setPanel(null)} onPick={sendGif} /> : null}
                <button
                    type="button"
                    data-emoji-toggle
                    className={`lc-icon-btn ${panel === 'emoji' ? 'is-on' : ''}`}
                    title="Emoji"
                    onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')}
                >
                    <AppleEmoji char="😊" size="24px" />
                </button>
                <button
                    type="button"
                    data-gif-toggle
                    className={`lc-icon-btn lc-gif-btn ${panel === 'gif' ? 'is-on' : ''}`}
                    title="GIF"
                    onClick={() => setPanel(panel === 'gif' ? null : 'gif')}
                >
                    GIF
                </button>
                <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={onInput}
                    onKeyDown={onKeyDown}
                    placeholder="Message Your Travel Crew…"
                    maxLength={1000}
                />
                <button type="button" className="lc-send" onClick={sendDraft} disabled={!draft.trim() || sending} title="Send">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5L15 12 3.5 13.9z" /></svg>
                </button>
            </div>
        </div>
    );
};

export default LiveChat;
