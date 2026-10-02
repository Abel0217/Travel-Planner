import React, { Suspense, useEffect, useRef } from 'react';
import './social.css';

const Picker = React.lazy(() => import('emoji-picker-react'));

// Floating Apple-style emoji picker. Closes on outside click or Escape.
const EmojiPopover = ({ onPick, onClose, align = 'left', width = 340, height = 400 }) => {
    const ref = useRef(null);

    useEffect(() => {
        const away = (event) => {
            if (ref.current && !ref.current.contains(event.target) && !event.target.closest('[data-emoji-toggle]')) onClose();
        };
        const esc = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', esc);
        };
    }, [onClose]);

    return (
        <div ref={ref} className={`soc-pop is-${align}`} style={{ width }}>
            <Suspense fallback={<div className="soc-pop-loading">Loading Emojis…</div>}>
                <Picker
                    emojiStyle="apple"
                    width={width}
                    height={height}
                    lazyLoadEmojis
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    searchPlaceHolder="Search Emojis"
                    onEmojiClick={(data) => onPick(data.emoji)}
                />
            </Suspense>
        </div>
    );
};

export default EmojiPopover;
