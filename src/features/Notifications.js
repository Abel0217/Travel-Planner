import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { syncUnseenChatAlerts } from '../utils/chatAlerts';
import './css/Notifications.css';
import { sceneryImages, randomLocalSceneryIndex, useHeldCrossfade } from '../utils/scenery';

const filters = [
    { id: 'all', label: 'All' },
    { id: 'itinerary', label: 'Trips' },
    { id: 'expense', label: 'Expenses' },
    { id: 'booking', label: 'Bookings' },
    { id: 'social', label: 'Friends' },
];

const emptyCopy = {
    all: 'No New Notifications',
    itinerary: 'No New Notifications For Trips',
    expense: 'No New Expense Alerts',
    booking: 'No New Booking Alerts',
    social: 'No New Friend Alerts',
};

function whenLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

const Notifications = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const noteId = searchParams.get('note');
    const [startSlide] = useState(() => randomLocalSceneryIndex());
    const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [focusId, setFocusId] = useState(() => (noteId ? String(noteId) : null));

    const applyFeed = (data) => {
        setItems(data?.notifications || []);
    };

    const loadFeed = async () => {
        const response = await apiClient.get('/notifications');
        applyFeed(response.data);
    };

    useEffect(() => {
        const load = async () => {
            await syncUnseenChatAlerts();
            await loadFeed();
        };
        load()
            .catch((loadError) => {
                console.error(loadError);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!noteId || loading) return;
        setFilter('all');
    }, [noteId, loading]);

    useEffect(() => {
        if (!noteId || loading || filter !== 'all') return undefined;
        setFocusId(String(noteId));
        const node = document.getElementById(`note-${noteId}`);
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timer = window.setTimeout(() => setFocusId(null), 4000);
        return () => window.clearTimeout(timer);
    }, [noteId, loading, filter, items]);

    const visible = useMemo(() => {
        const shown = items.filter((item) => !item.hiddenFromAll);
        if (filter === 'all') return shown;
        return shown.filter((item) => item.category === filter);
    }, [filter, items]);
    const visibleUnread = visible.filter((item) => !item.read).length;

    const run = async (id, task) => {
        setBusyId(id || 'all');
        setError('');
        try {
            const response = await task();
            applyFeed(response.data);
        } catch (actionError) {
            console.error(actionError);
            setError('That notification action did not go through.');
        } finally {
            setBusyId(null);
        }
    };

    const markRead = (item) => run(item.id, () => apiClient.patch(`/notifications/${item.id}/read`));
    const dismiss = (item) => run(item.id, () => apiClient.patch(`/notifications/${item.id}/dismiss`));
    const remove = (item) => run(item.id, () => apiClient.delete(`/notifications/${item.id}`));

    const settleSocial = async (item, acceptRequest) => {
        setBusyId(item.id);
        setError('');
        try {
            if (item.action?.kind === 'accept-friend') {
                await apiClient.put(`/friends/request/${item.friend_request_id}/${acceptRequest ? 'accept' : 'reject'}`);
            } else if (acceptRequest) {
                await apiClient.put(`/notifications/invitations/${item.invitation_id}/accept`);
            } else {
                await apiClient.put(`/notifications/invitations/${item.invitation_id}/decline`);
            }
            await loadFeed();
        } catch (actionError) {
            console.error(actionError);
            setError('That notification action did not go through.');
        } finally {
            setBusyId(null);
        }
    };

    const openRecord = async (item) => {
        if (!item.action?.href) return;
        if (!item.read) {
            try {
                const response = await apiClient.patch(`/notifications/${item.id}/read`);
                applyFeed(response.data);
            } catch (readError) {
                console.error(readError);
            }
        }
        navigate(item.action.href);
    };

    return (
        <div className="notes-page">
            <div className="notes-scenery" aria-hidden="true" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
                {sceneryImages.map((image, index) => (
                    <div
                        key={image}
                        className={`notes-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))}
            </div>

            <div className="notes-shell">
                <header className="notes-header">
                    <div>
                        <p className="notes-kicker">Alerts</p>
                        <h1>Notifications</h1>
                        <div className="notes-stats">
                            <span><b>{visibleUnread}</b> Unread</span>
                            <span><b>{visible.length}</b> Total Alerts</span>
                        </div>
                    </div>
                    <div className="notes-header-actions">
                        <button
                            type="button"
                            className="notes-gold"
                            disabled={visibleUnread === 0 || busyId === 'all'}
                            onClick={() => run('all', () => apiClient.patch('/notifications/read-all'))}
                        >
                            Mark All as Read
                        </button>
                        <button
                            type="button"
                            className="notes-ghost"
                            disabled={visible.length === 0 || busyId === 'all'}
                            onClick={() => run('all', () => apiClient.delete('/notifications/clear'))}
                        >
                            Clear All
                        </button>
                    </div>
                </header>

                <div className="notes-tabs" role="tablist">
                    {filters.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={filter === tab.id}
                            className={filter === tab.id ? 'is-active' : ''}
                            onClick={() => setFilter(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {error && visible.length > 0 && <p className="notes-error">{error}</p>}

                {loading ? (
                    <p className="notes-empty">Loading Alerts...</p>
                ) : visible.length === 0 ? (
                    <p className="notes-empty">{emptyCopy[filter] || 'Nothing In This Category.'}</p>
                ) : (
                    <ul className="notes-list">
                        {visible.map((item) => (
                            <li id={`note-${item.id}`} key={item.id} className={`note-card ${item.read ? '' : 'is-unread'}${String(item.id) === focusId ? ' is-focused' : ''}`}>
                                <div className="note-top">
                                    <span className="note-dot" aria-hidden="true" />
                                    <span className="note-pill">
                                        {{ itinerary: 'Trip', expense: 'Expense', booking: 'Booking', social: 'Friends' }[item.category] || item.category}
                                    </span>
                                    <time>{whenLabel(item.created_at)}</time>
                                </div>
                                <h2>{item.title}</h2>
                                <p>{item.body}</p>
                                <div className="note-actions">
                                    {item.action?.href && (
                                        <button type="button" className="notes-gold" onClick={() => openRecord(item)}>
                                            {item.action.label}
                                        </button>
                                    )}
                                    {item.action?.kind && (
                                        <>
                                            <button type="button" className="notes-gold" disabled={busyId === item.id} onClick={() => settleSocial(item, true)}>
                                                {item.action.label}
                                            </button>
                                            <button type="button" className="notes-ghost" disabled={busyId === item.id} onClick={() => settleSocial(item, false)}>
                                                Decline
                                            </button>
                                        </>
                                    )}
                                    {!item.read && (
                                        <button type="button" className="notes-ghost" disabled={busyId === item.id} onClick={() => markRead(item)}>
                                            Mark Read
                                        </button>
                                    )}
                                    <button type="button" className="notes-ghost" disabled={busyId === item.id} onClick={() => dismiss(item)}>
                                        Dismiss
                                    </button>
                                    <button type="button" className="notes-danger" disabled={busyId === item.id} onClick={() => remove(item)}>
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Notifications;
