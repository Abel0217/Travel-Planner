import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { AuthContext } from '../../../Contexts/AuthContext';
import apiClient from '../../../api/apiClient';
import { mediaUrl } from '../../../utils/mediaUrl';
import './css/Notes.css';

// Keep the old size whitelist so notes written before the redesign still render.
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '36px', '48px', '64px'];
Quill.register(Size, true);

const FORMATS = [
    'header', 'font', 'size', 'color', 'background',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'align',
    'link', 'image', 'video', 'width', 'height', 'alt',
];

const TEMPLATES = [
    {
        key: 'packing', label: 'Packing List', icon: '🧳', list: 'unchecked',
        items: ['Passport And ID', 'Phone, Chargers And Adapter', 'Medications', 'Travel Insurance Details', 'Weather-Ready Clothes', 'Toiletries'],
    },
    {
        key: 'plan', label: 'Day-By-Day Plan', icon: '🗓️', list: 'bullet',
        items: ['Morning: ', 'Afternoon: ', 'Evening: '],
    },
    {
        key: 'food', label: 'Food Bucket List', icon: '🍽️', list: 'unchecked',
        items: ['Local Breakfast Spot', 'Famous Street Food', 'Special Dinner Reservation', 'Dessert To Try'],
    },
    {
        key: 'info', label: 'Important Info', icon: '📌', list: 'bullet',
        items: ['Confirmation Numbers: ', 'Emergency Contacts: ', 'Where We Are Staying: ', 'Local Emergency Number: '],
    },
    {
        key: 'ideas', label: 'Ideas', icon: '💡', list: 'bullet',
        items: ['Idea 1', 'Idea 2', 'Idea 3'],
    },
];

const PRESETS = [
    { label: 'S', title: 'Small', width: '240' },
    { label: 'M', title: 'Medium', width: '480' },
    { label: 'L', title: 'Large', width: '720' },
    { label: 'Full', title: 'Full Width', width: '100%' },
];

const MAX_SIDE = 1800;

const plainText = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.innerText || div.textContent || '';
};

const ago = (date) => {
    if (!date) return '';
    const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 10) return 'Just Now';
    if (seconds < 60) return `${seconds}s Ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m Ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h Ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Big photos are shrunk before upload so pages stay quick to load.
const prepareImage = async (file) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) return file;
        return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (error) {
        return file;
    }
};

const uploadImage = async (file) => {
    const data = new FormData();
    data.append('file', await prepareImage(file));
    const response = await apiClient.post('/upload/note-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mediaUrl(response.data.url);
};

const Notes = ({ itineraryId }) => {
    const { currentUser } = useContext(AuthContext);
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('saved'); // saved | saving | error
    const [meta, setMeta] = useState(null); // { by, at }
    const [uploading, setUploading] = useState(0);
    const [notice, setNotice] = useState('');
    const [selected, setSelected] = useState(null); // <img> being resized
    const [box, setBox] = useState(null);
    const [container, setContainer] = useState(null);
    const [copied, setCopied] = useState(false);
    const [, tick] = useState(0);
    const quillRef = useRef(null);
    const rootRef = useRef(null);
    const fileRef = useRef(null);
    const dirty = useRef(false);
    const latest = useRef('');
    const timer = useRef(null);
    const userName = currentUser?.name || 'A Traveler';

    const docRef = useMemo(
        () => (itineraryId ? doc(db, 'itineraries', itineraryId, 'notes', 'note') : null),
        [itineraryId],
    );

    const save = useCallback(async () => {
        if (!docRef || !dirty.current) return;
        const value = latest.current;
        dirty.current = false;
        setStatus('saving');
        try {
            await setDoc(docRef, { content: value, updatedAt: serverTimestamp(), updatedBy: userName }, { merge: true });
            setStatus(dirty.current ? 'saving' : 'saved');
        } catch (error) {
            console.error('Notes were not saved:', error);
            dirty.current = true;
            setStatus('error');
        }
    }, [docRef, userName]);

    useEffect(() => {
        if (!docRef) return undefined;
        return onSnapshot(docRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const at = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
            if (data.updatedBy || at) setMeta({ by: data.updatedBy || '', at });
            // Never overwrite what the person is typing right now.
            if (snap.metadata.hasPendingWrites || dirty.current) return;
            const incoming = data.content || '';
            if (incoming !== latest.current) {
                latest.current = incoming;
                setContent(incoming);
            }
        });
    }, [docRef]);

    // Save anything still pending when the tab closes or the page changes.
    useEffect(() => () => {
        clearTimeout(timer.current);
        if (dirty.current) save();
    }, [save]);

    useEffect(() => {
        const id = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const onChange = (value, delta, source) => {
        setContent(value);
        latest.current = value;
        if (source !== 'user') return;
        dirty.current = true;
        setStatus('saving');
        clearTimeout(timer.current);
        timer.current = setTimeout(save, 700);
    };

    const editor = () => quillRef.current?.getEditor();

    const flash = (message) => {
        setNotice(message);
        setTimeout(() => setNotice(''), 4500);
    };

    /* ---------- pictures ---------- */
    const insertFiles = useCallback(async (files) => {
        const quill = quillRef.current?.getEditor();
        const images = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
        if (!quill || images.length === 0) return;
        const range = quill.getSelection(true) || { index: Math.max(0, quill.getLength() - 1), length: 0 };
        let index = range.index;
        setUploading((n) => n + images.length);
        for (const file of images) {
            try {
                const url = await uploadImage(file);
                quill.insertEmbed(index, 'image', url, 'user');
                quill.formatText(index, 1, 'width', '480', 'user');
                quill.insertText(index + 1, '\n', 'user');
                index += 2;
            } catch (error) {
                console.error('Picture was not uploaded:', error);
                flash('That picture could not be uploaded. Try a smaller JPG or PNG.');
            } finally {
                setUploading((n) => n - 1);
            }
        }
        quill.setSelection(index, 0, 'silent');
    }, []);

    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return undefined;
        setContainer(quill.container);
        const root = quill.root;

        const onPaste = (event) => {
            const files = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
            if (files.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            insertFiles(files);
        };
        const onDrop = (event) => {
            const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
            if (files.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            insertFiles(files);
        };
        const onClick = (event) => {
            setSelected(event.target.tagName === 'IMG' ? event.target : null);
        };
        root.addEventListener('paste', onPaste, true);
        root.addEventListener('drop', onDrop, true);
        root.addEventListener('click', onClick);
        return () => {
            root.removeEventListener('paste', onPaste, true);
            root.removeEventListener('drop', onDrop, true);
            root.removeEventListener('click', onClick);
        };
    }, [insertFiles]);

    /* ---------- picture resizing ---------- */
    const measure = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !selected || !selected.isConnected) {
            setBox(null);
            return;
        }
        const c = quill.container.getBoundingClientRect();
        const r = selected.getBoundingClientRect();
        setBox({ left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height });
    }, [selected]);

    useEffect(() => {
        measure();
        const quill = quillRef.current?.getEditor();
        if (!quill || !selected) return undefined;
        const root = quill.root;
        root.addEventListener('scroll', measure);
        window.addEventListener('resize', measure);
        const onKey = (event) => { if (event.key === 'Escape') setSelected(null); };
        document.addEventListener('keydown', onKey);
        const onText = () => requestAnimationFrame(measure);
        quill.on('text-change', onText);
        return () => {
            root.removeEventListener('scroll', measure);
            window.removeEventListener('resize', measure);
            document.removeEventListener('keydown', onKey);
            quill.off('text-change', onText);
        };
    }, [selected, measure]);

    const commitWidth = (width) => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !selected) return;
        const blot = Quill.find(selected);
        if (blot) blot.format('width', String(width));
        selected.removeAttribute('height');
        selected.style.width = '';
        quill.update('user');
        requestAnimationFrame(measure);
    };

    const startDrag = (direction) => (event) => {
        if (!selected) return;
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = selected.getBoundingClientRect().width;
        const limit = (quillRef.current?.getEditor().root.clientWidth || 900) - 40;
        let current = startWidth;
        const move = (e) => {
            current = Math.max(60, Math.min(limit, startWidth + direction * (e.clientX - startX)));
            selected.style.width = `${current}px`;
            measure();
        };
        const up = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            commitWidth(Math.round(current));
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
    };

    const removeImage = () => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !selected) return;
        const blot = Quill.find(selected);
        if (blot) quill.deleteText(quill.getIndex(blot), 1, 'user');
        setSelected(null);
    };

    /* ---------- templates / tools ---------- */
    const insertTemplate = (tpl) => {
        const quill = editor();
        if (!quill) return;
        const Delta = Quill.import('delta');
        const length = quill.getLength();
        const isEmpty = length <= 1;
        const ops = [];
        if (!isEmpty) ops.push({ insert: '\n' });
        ops.push({ insert: tpl.label });
        ops.push({ insert: '\n', attributes: { header: 2 } });
        tpl.items.forEach((item) => {
            ops.push({ insert: item });
            ops.push({ insert: '\n', attributes: { list: tpl.list } });
        });
        quill.updateContents(new Delta().retain(isEmpty ? 0 : length).concat(new Delta(ops)), 'user');
        quill.setSelection(quill.getLength() - 1, 0, 'silent');
    };

    const modules = useMemo(() => ({ toolbar: { container: '#tn-toolbar' }, history: { userOnly: true } }), []);

    const text = useMemo(() => plainText(content), [content]);
    const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

    const copyAll = async () => {
        try {
            await navigator.clipboard.writeText(editor()?.getText() || text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    const download = () => {
        const blob = new Blob([editor()?.getText() || text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'trip-notes.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    const statusText = uploading > 0
        ? 'Uploading Photo…'
        : { saved: 'All Changes Saved', saving: 'Saving…', error: "Couldn't Save · Retrying" }[status];
    const statusKey = uploading > 0 ? 'saving' : status;

    return (
        <div className="tn-page" ref={rootRef}>
            <header className="tn-head">
                <span className="tn-head-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5M9 13h6M9 17h4" />
                    </svg>
                </span>
                <h2>Trip Notes</h2>
                <div className="tn-templates">
                    <span>Quick Start</span>
                    {TEMPLATES.map((tpl) => (
                        <button type="button" key={tpl.key} onClick={() => insertTemplate(tpl)}>
                            <em>{tpl.icon}</em>{tpl.label}
                        </button>
                    ))}
                </div>
                <div className={`tn-status is-${statusKey}`}>
                    <i />
                    <span>{statusText}</span>
                </div>
            </header>

            <div className="tn-sheet">
                <div id="tn-toolbar" className="tn-toolbar">
                    <span className="ql-formats">
                        <select className="ql-header" defaultValue="">
                            <option value="2">Heading</option>
                            <option value="3">Subheading</option>
                            <option value="">Normal</option>
                        </select>
                        <select className="ql-font" defaultValue="">
                            <option value="" />
                            <option value="serif" />
                            <option value="monospace" />
                        </select>
                    </span>
                    <span className="ql-formats">
                        <button type="button" className="ql-bold" />
                        <button type="button" className="ql-italic" />
                        <button type="button" className="ql-underline" />
                        <button type="button" className="ql-strike" />
                    </span>
                    <span className="ql-formats">
                        <select className="ql-color" />
                        <select className="ql-background" />
                    </span>
                    <span className="ql-formats">
                        <button type="button" className="ql-list" value="check" title="Checklist" />
                        <button type="button" className="ql-list" value="bullet" />
                        <button type="button" className="ql-list" value="ordered" />
                        <button type="button" className="ql-blockquote" />
                        <select className="ql-align" defaultValue="">
                            <option value="" />
                            <option value="center" />
                            <option value="right" />
                            <option value="justify" />
                        </select>
                    </span>
                    <span className="ql-formats">
                        <button type="button" className="ql-link" />
                        <button type="button" className="ql-clean" />
                    </span>
                    <span className="ql-formats tn-extra">
                        <button
                            type="button"
                            className="tn-tool"
                            title="Add Photos"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => fileRef.current?.click()}
                        >
                            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="16" rx="3" />
                                <circle cx="9" cy="10" r="2" />
                                <path d="M21 16l-5-5-8 8" />
                            </svg>
                            Add Photo
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(event) => { insertFiles(event.target.files); event.target.value = ''; }}
                        />
                    </span>
                </div>

                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    className="tn-editor"
                    value={content}
                    onChange={onChange}
                    modules={modules}
                    formats={FORMATS}
                    placeholder="Start typing, pick a Quick Start above, or drop a photo straight onto the page."
                />

                {container && selected && box
                    ? createPortal(
                        <div className="tn-imglayer">
                            <div className="tn-imgsel" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
                                <i className="nw" onPointerDown={startDrag(-1)} />
                                <i className="ne" onPointerDown={startDrag(1)} />
                                <i className="sw" onPointerDown={startDrag(-1)} />
                                <i className="se" onPointerDown={startDrag(1)} />
                                <div className="tn-imgbar" onMouseDown={(event) => event.preventDefault()}>
                                    {PRESETS.map((preset) => (
                                        <button type="button" key={preset.label} title={preset.title} onClick={() => commitWidth(preset.width)}>
                                            {preset.label}
                                        </button>
                                    ))}
                                    <span />
                                    <button type="button" className="is-danger" title="Remove Photo" onClick={removeImage}>Remove</button>
                                </div>
                            </div>
                        </div>,
                        container,
                    )
                    : null}

                <footer className="tn-foot">
                    <span>{words} {words === 1 ? 'Word' : 'Words'}</span>
                    <span className="tn-dot" />
                    <span>{text.replace(/\s/g, '').length} Characters</span>
                    {meta?.by ? (
                        <>
                            <span className="tn-dot" />
                            <span>Last Edited By {meta.by}{meta.at ? ` · ${ago(meta.at)}` : ''}</span>
                        </>
                    ) : null}
                    {notice ? <span className="tn-notice">{notice}</span> : null}
                    <div className="tn-foot-actions">
                        <button type="button" onClick={copyAll}>{copied ? '✓ Copied' : 'Copy All'}</button>
                        <button type="button" onClick={download}>Download</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Notes;
