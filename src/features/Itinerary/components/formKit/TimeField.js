import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Glyph } from '../overview/glyphs';

// "14:30" -> "2:30 PM"
export const timeLabel = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return '';
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const shown = hours % 12 === 0 ? 12 : hours % 12;
  return `${shown}:${match[2]} ${suffix}`;
};

// Accepts "7pm", "7:30 pm", "19:30", "730" and gives back "19:30" (or null when it makes no sense).
export const parseTimeText = (text) => {
  const raw = String(text || '').trim().toLowerCase().replace(/\./g, '');
  if (!raw) return '';
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*(a|p|am|pm)?$/.exec(raw);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const mer = match[3];
  if (minutes > 59) return null;
  if (mer) {
    if (hours < 1 || hours > 12) return null;
    if (mer.startsWith('p') && hours < 12) hours += 12;
    if (mer.startsWith('a') && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const slotsFor = (step) => {
  const list = [];
  for (let minute = 0; minute < 24 * 60; minute += step) {
    list.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return list;
};

// A friendly time picker: type a time ("7:30 pm") or pick one from a scrolling list.
function TimeField({ value, onChange, placeholder = 'Select A Time', disabled = false, step = 15, id, clearable = true }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(timeLabel(value));
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setText(timeLabel(value)); }, [value]);

  const slots = useMemo(() => {
    const list = slotsFor(step);
    if (value && !list.includes(value)) {
      list.push(value);
      list.sort();
    }
    return list;
  }, [step, value]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Open on the chosen time (or mid-morning) and decide whether there is room below.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const target = list.querySelector('[aria-selected="true"]') || list.querySelector('[data-slot="09:00"]');
    if (target) list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2;
    const box = wrapRef.current.getBoundingClientRect();
    setDropUp(window.innerHeight - box.bottom < 290 && box.top > 290);
  }, [open]);

  const pick = (slot) => {
    onChange(slot);
    setOpen(false);
  };

  const commit = () => {
    const parsed = parseTimeText(text);
    if (parsed === null) {
      setText(timeLabel(value));
    } else if (parsed !== value) {
      onChange(parsed);
    } else {
      setText(timeLabel(value));
    }
  };

  return (
    <div className={`bk-time${open ? ' is-open' : ''}`} ref={wrapRef}>
      <span className="bk-time-icon"><Glyph name="clock" size={17} /></span>
      <input
        id={id}
        className="bk-input bk-time-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => { setText(event.target.value); setOpen(true); }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
            setOpen(false);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {clearable && value ? (
        <button type="button" className="bk-time-clear" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(''); setText(''); }} aria-label="Clear Time">×</button>
      ) : null}
      {open ? (
        <div className={`bk-time-pop${dropUp ? ' is-up' : ''}`} role="listbox" ref={listRef}>
          {slots.map((slot) => (
            <button
              type="button"
              key={slot}
              role="option"
              data-slot={slot}
              aria-selected={slot === value}
              className={`bk-time-slot${slot === value ? ' is-on' : ''}`}
              onMouseDown={(event) => { event.preventDefault(); pick(slot); }}
            >
              {timeLabel(slot)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TimeField;
