import React, { useEffect, useRef, useState } from 'react';

// A text box with a list of suggestions underneath. The caller decides where suggestions come from:
// `search(text)` returns a promise of [{ key, title, detail, badge, value, data }].
function Suggest({
  id, value, onChange, onPick, search, placeholder, required, minChars = 2, delay = 280, autoFocus,
}) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);
  const boxRef = useRef(null);
  const skip = useRef(false);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return undefined;
    }
    const text = String(value || '').trim();
    if (!touched || text.length < minChars) {
      setOptions([]);
      setBusy(false);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    const handle = window.setTimeout(async () => {
      let found = [];
      try {
        found = (await searchRef.current(text)) || [];
      } catch (error) {
        found = [];
      }
      if (cancelled) return;
      setOptions(found);
      setActive(-1);
      setBusy(false);
      setOpen(true);
    }, delay);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [value, touched, minChars, delay]);

  useEffect(() => {
    const onPointer = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const choose = (option) => {
    skip.current = true;
    onChange(option.value != null ? option.value : option.title);
    if (onPick) onPick(option.data, option);
    setOpen(false);
    setOptions([]);
  };

  const onKeyDown = (event) => {
    if (!open || options.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  };

  const showEmpty = open && !busy && options.length === 0 && String(value || '').trim().length >= minChars && touched;

  return (
    <div className="bk-suggest" ref={boxRef}>
      <input
        id={id}
        className="bk-input"
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => { setTouched(true); onChange(event.target.value); }}
        onFocus={() => options.length && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {busy ? <span className="bk-suggest-busy" aria-hidden="true" /> : null}
      {open && options.length > 0 ? (
        <ul className="bk-suggest-list" role="listbox">
          {options.map((option, index) => (
            <li key={option.key}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                {option.badge ? <b>{option.badge}</b> : null}
                <span>
                  <strong>{option.title}</strong>
                  {option.detail ? <em>{option.detail}</em> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showEmpty ? <div className="bk-suggest-list bk-suggest-empty">Nothing found. You can still type it in.</div> : null}
    </div>
  );
}

export default Suggest;
