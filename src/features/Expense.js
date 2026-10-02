import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import UploadFile from './Upload/UploadFile';
import { mediaUrl } from '../utils/mediaUrl';
import { AuthContext } from '../Contexts/AuthContext';
import { randomLocalSceneryIndex, sceneryImages, useHeldCrossfade } from '../utils/scenery';
import './css/Expense.css';

const CATEGORIES = ['flight', 'hotel', 'restaurant', 'activity', 'transport', 'other'];

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .split(/(\s+)/)
  .map((part) => (/^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
  .join('');

const displayName = (person) => toTitleCase(`${person.first_name || person.email || ''} ${person.last_name || ''}`.trim());

const categoryLabel = (value) => String(value || '')
  .split(' ')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

const Expense = ({ lockedItineraryId }) => {
  const { currentUser } = useContext(AuthContext);
  const { itineraryId: routeItineraryId } = useParams();
  const scopedItineraryId = lockedItineraryId || routeItineraryId || '';
  const locked = Boolean(scopedItineraryId);
  const [startSlide] = useState(() => randomLocalSceneryIndex());
  const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });
  const [trips, setTrips] = useState([]);
  const [itineraryId, setItineraryId] = useState(scopedItineraryId ? String(scopedItineraryId) : '');
  const [board, setBoard] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitMode, setSplitMode] = useState('even');
  const [selected, setSelected] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingShareUid, setEditingShareUid] = useState('');
  const [shareDraft, setShareDraft] = useState('');
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [customDirty, setCustomDirty] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [extraShown, setExtraShown] = useState(0);
  const [fitCount, setFitCount] = useState(3);
  const formRef = useRef(null);
  const listRef = useRef(null);

  const loadTrips = async () => {
    try {
      const response = await apiClient.get('/expenses/itineraries');
      setTrips(response.data || []);
      if (!locked && !itineraryId && response.data?.[0]) {
        setItineraryId(String(response.data[0].itinerary_id));
      }
    } catch (primaryError) {
      const fallback = await apiClient.get('/itineraries');
      setTrips(fallback.data || []);
      if (!locked && !itineraryId && fallback.data?.[0]) {
        setItineraryId(String(fallback.data[0].itinerary_id));
      }
    }
  };

  const loadBoard = async (id) => {
    if (!id) return;
    const response = await apiClient.get(`/expenses/itinerary/${id}`);
    setBoard(response.data);
    const people = response.data.participants || [];
    setSelected(people.map((person) => person.uid));
    setPaidBy((current) => {
      if (current && people.some((person) => person.uid === current)) return current;
      if (currentUser?.uid && people.some((person) => person.uid === currentUser.uid)) return currentUser.uid;
      return people[0]?.uid || '';
    });
  };

  useEffect(() => {
    loadTrips().catch((err) => setError(err.response?.data?.error || 'Could not load trips.'));
  }, []);

  useEffect(() => {
    if (scopedItineraryId) {
      setItineraryId(String(scopedItineraryId));
    }
  }, [scopedItineraryId]);

  useEffect(() => {
    if (itineraryId) {
      loadBoard(itineraryId).catch((err) => setError(err.response?.data?.error || 'Could not load expenses.'));
    }
  }, [itineraryId]);

  const selectedPeople = useMemo(
    () => (board?.participants || []).filter((person) => selected.includes(person.uid)),
    [board, selected]
  );

  const totalAmount = roundMoney(amount);
  const evenShare = selectedPeople.length && totalAmount
    ? (totalAmount / selectedPeople.length).toFixed(2)
    : '0.00';

  useEffect(() => {
    if (splitMode !== 'custom' || !selected.length || editingShareUid || customDirty) return;
    const even = selected.length ? roundMoney(totalAmount / selected.length) : 0;
    const next = {};
    selected.forEach((uid, index) => {
      next[uid] = index === selected.length - 1
        ? roundMoney(totalAmount - even * (selected.length - 1))
        : even;
    });
    setCustomAmounts(next);
  }, [splitMode, totalAmount, selected.join('|'), editingShareUid, customDirty]);

  const togglePerson = (uid) => {
    setCustomDirty(false);
    setSelected((current) => (
      current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]
    ));
  };

  const setSliderShare = (uid, rawValue) => {
    const others = selected.filter((id) => id !== uid);
    const clamped = Math.min(totalAmount, Math.max(0, roundMoney(rawValue)));
    const remainder = roundMoney(totalAmount - clamped);
    const next = { ...customAmounts, [uid]: clamped };
    setCustomDirty(true);
    if (!others.length) {
      setCustomAmounts(next);
      return;
    }
    const even = roundMoney(remainder / others.length);
    others.forEach((id, index) => {
      next[id] = index === others.length - 1
        ? roundMoney(remainder - even * (others.length - 1))
        : even;
    });
    setCustomAmounts(next);
  };

  const applyParsedReceipt = (fields) => {
    if (fields.title || fields.merchant) setTitle(toTitleCase(fields.title || fields.merchant));
    if (fields.amount) setAmount(Number(fields.amount).toFixed(2));
    const dateText = String(fields.expenseDate || '');
    const isoDate = dateText.match(/\d{4}-\d{2}-\d{2}/);
    if (isoDate) setExpenseDate(isoDate[0]);
    const rawCategory = String(fields.category || '').toLowerCase();
    const mappedCategory = rawCategory === 'food' || rawCategory === 'dining' ? 'restaurant' : rawCategory;
    if (CATEGORIES.includes(mappedCategory)) setCategory(mappedCategory);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!itineraryId) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/expenses/itinerary/${itineraryId}`, {
        title,
        category,
        amount: totalAmount,
        expense_date: expenseDate || null,
        paid_by: paidBy,
        split_mode: splitMode,
        participant_uids: selected,
        custom_shares: selected.map((uid) => ({
          uid,
          amount: roundMoney(customAmounts[uid] ?? evenShare ?? 0),
        })),
      });
      setTitle('');
      setAmount('');
      setExpenseDate('');
      setSplitMode('even');
      setCustomAmounts({});
      setCustomDirty(false);
      await loadBoard(itineraryId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save that expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    await apiClient.delete(`/expenses/${expenseId}`);
    await loadBoard(itineraryId);
  };

  const openPayPrompt = (person) => {
    if (!currentUser?.uid || person.uid === currentUser.uid) return;
    setPayTarget(person);
    setPayAmount('');
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!payTarget || !itineraryId) return;
    const amountValue = roundMoney(payAmount);
    if (amountValue <= 0) {
      setError('Enter how much was paid.');
      return;
    }
    try {
      await apiClient.post(`/expenses/itinerary/${itineraryId}/payments`, {
        from_uid: currentUser.uid,
        to_uid: payTarget.uid,
        amount: amountValue,
        note: 'settlement',
      });
      setPayTarget(null);
      setPayAmount('');
      await loadBoard(itineraryId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not record that payment.');
    }
  };

  const ledgerItems = useMemo(() => {
    const expenses = (board?.expenses || []).map((expense) => ({
      kind: 'expense',
      id: `expense-${expense.expense_id}`,
      sort: new Date(expense.created_at || expense.expense_date || 0).getTime(),
      tie: Number(expense.expense_id) || 0,
      expense,
    }));
    const payments = (board?.payments || []).map((payment) => ({
      kind: 'payment',
      id: `payment-${payment.payment_id || payment.created_at}`,
      sort: new Date(payment.created_at || 0).getTime(),
      payment,
    }));
    return [...expenses, ...payments].sort((a, b) => b.sort - a.sort || (b.tie || 0) - (a.tie || 0));
  }, [board]);

  const paymentLabel = (payment) => {
    const fromName = `${payment.from_first_name || 'Someone'} ${payment.from_last_name || ''}`.trim();
    const toName = `${payment.to_first_name || 'Someone'} ${payment.to_last_name || ''}`.trim();
    return `${toTitleCase(fromName)} Paid ${toTitleCase(toName)} $${Number(payment.amount || 0).toFixed(2)}`;
  };

  const ledgerFilters = useMemo(() => {
    const counts = { paid: 0 };
    CATEGORIES.forEach((item) => { counts[item] = 0; });
    ledgerItems.forEach((item) => {
      if (item.kind === 'payment') {
        counts.paid += 1;
        return;
      }
      const key = String(item.expense.category || 'other').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    const options = [{ id: 'all', label: 'All' }];
    if (counts.paid) options.push({ id: 'paid', label: 'Payments' });
    CATEGORIES.forEach((item) => {
      if (counts[item]) options.push({ id: item, label: categoryLabel(item) });
    });
    return options;
  }, [ledgerItems]);

  const filteredItems = useMemo(() => {
    if (ledgerFilter === 'all') return ledgerItems;
    if (ledgerFilter === 'paid') return ledgerItems.filter((item) => item.kind === 'payment');
    return ledgerItems.filter((item) => (
      item.kind === 'expense'
      && String(item.expense.category || 'other').toLowerCase() === ledgerFilter
    ));
  }, [ledgerItems, ledgerFilter]);

  const shownCount = fitCount + extraShown;
  const visibleItems = filteredItems.slice(0, shownCount);
  const hiddenCount = Math.max(0, filteredItems.length - visibleItems.length);

  useEffect(() => {
    setLedgerFilter('all');
    setExtraShown(0);
  }, [itineraryId]);

  useEffect(() => {
    if (ledgerFilter !== 'all' && !ledgerFilters.some((option) => option.id === ledgerFilter)) {
      setLedgerFilter('all');
    }
  }, [ledgerFilter, ledgerFilters]);

  useLayoutEffect(() => {
    const form = formRef.current;
    const list = listRef.current;
    if (!form || !list || !filteredItems.length || extraShown > 0) return undefined;
    let frame = 0;
    const measure = () => {
      const formHeight = form.getBoundingClientRect().height;
      const sample = list.querySelector('.ledger-item');
      if (!sample) return;
      const sampleStyle = window.getComputedStyle(sample);
      const itemHeight = sample.getBoundingClientRect().height
        + (parseFloat(sampleStyle.marginTop) || 0)
        + (parseFloat(sampleStyle.marginBottom) || 0);
      const shown = list.querySelectorAll('.ledger-item').length;
      const button = list.querySelector('.ledger-more');
      const buttonHeight = button ? button.getBoundingClientRect().height + 12 : 46;
      const chrome = list.getBoundingClientRect().height - (shown * itemHeight) - (button ? buttonHeight : 0);
      let room = formHeight - chrome;
      let count = Math.max(1, Math.floor(room / itemHeight));
      if (filteredItems.length > count) {
        room -= buttonHeight;
        count = Math.max(1, Math.floor(room / itemHeight));
      }
      setFitCount((current) => (current === count ? current : count));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(form);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [filteredItems.length, splitMode, ledgerFilter, selected.length, extraShown]);

  return (
    <div className={`expense-page${locked ? ' expense-embedded' : ''}`}>
      {locked ? null : (
        <div className="expense-scenery" aria-hidden="true" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
          {sceneryImages.map((image, index) => (
            <div
              key={image}
              className={`expense-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>
      )}
      <div className="expense-body">
      <header className="expense-hero">
        <div>
          <p className="eyebrow">Shared Costs</p>
          <h1>Expenses</h1>
          {locked && (board?.title || trips.find((trip) => String(trip.itinerary_id) === String(itineraryId))) ? (
            <p className="expense-scope">
              {board?.title || trips.find((trip) => String(trip.itinerary_id) === String(itineraryId))?.title}
              {board?.destinations || trips.find((trip) => String(trip.itinerary_id) === String(itineraryId))?.destinations
                ? ` · ${board?.destinations || trips.find((trip) => String(trip.itinerary_id) === String(itineraryId))?.destinations}`
                : ''}
            </p>
          ) : null}
        </div>
        {locked ? null : (
        <select value={itineraryId} onChange={(event) => setItineraryId(event.target.value)}>
          <option value="">Choose A Trip</option>
          {trips.map((trip) => (
            <option key={trip.itinerary_id} value={trip.itinerary_id}>
              {trip.title} {trip.destinations ? `· ${trip.destinations}` : ''}
            </option>
          ))}
        </select>
        )}
      </header>

      {error ? <div className="expense-error">{error}</div> : null}

      {!itineraryId ? (
        <div className="expense-empty">Pick a trip to start splitting costs.</div>
      ) : (
        <>
          <section className="balance-row">
            {(board?.balances || []).map((person) => {
              const others = (board?.participants || []).filter((guest) => guest.uid !== person.uid);
              return (
                <article key={person.uid} className="person-card">
                  <div className="person-card-top">
                    <img src={mediaUrl(person.profile_picture) || ''} alt="" />
                    <div>
                      <strong>
                        {displayName(person)}
                        <span className="role-dot"> • {person.role === 'host' ? 'Host' : 'Guest'}</span>
                      </strong>
                      <small className="person-email">{person.email}</small>
                    </div>
                  </div>
                  <em>${Number(person.owed || 0).toFixed(2)}</em>
                  <span className="spent-label">Total spent</span>
                  {others.length ? (
                    <div className="member-rows">
                      {others.map((guest) => {
                        const amount = Number((person.outgoing || []).find((item) => item.uid === guest.uid)?.amount || 0);
                        const canPay = person.uid === currentUser?.uid && guest.uid !== currentUser?.uid;
                        return (
                          <button
                            key={guest.uid}
                            type="button"
                            className="member-row"
                            onClick={() => canPay && openPayPrompt(guest)}
                          >
                            <span className="member-who">
                              <img src={mediaUrl(guest.profile_picture) || ''} alt="" />
                              <b>{displayName(guest)}</b>
                            </span>
                            <span className="member-amount">
                              <em>${Number(amount).toFixed(2)}</em>
                              <small>owed</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
            <article className="total-card">
              <span>Trip total</span>
              <strong>${Number(board?.tripTotal || 0).toFixed(2)}</strong>
            </article>
          </section>

          <div className="expense-grid">
            <form ref={formRef} className="expense-form" onSubmit={handleSave}>
              <h2>Add Expense</h2>
              <label>
                Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hotel deposit, dinner, Uber..." required />
              </label>
              <div className="form-row">
                <label>
                  Category
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
                  </select>
                </label>
                <label>
                  Cost
                  <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} onWheel={(event) => event.target.blur()} required />
                </label>
                <label>
                  Date
                  <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
                </label>
              </div>
              <label>
                Paid by
                <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
                  {(board?.participants || []).map((person) => (
                    <option key={person.uid} value={person.uid}>
                      {displayName(person)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="receipt-slot">
                <UploadFile
                  compact
                  bookingType="expense"
                  buttonLabel="Upload Receipt"
                  onExtractedData={applyParsedReceipt}
                />
              </div>
              <div className="split-divider" />

              <div className={`split-block ${splitMode === 'custom' ? 'custom' : ''}`}>
              <div className="split-toggle">
                <button type="button" className={splitMode === 'even' ? 'active' : ''} onClick={() => setSplitMode('even')}>
                  Split Evenly
                </button>
                <button type="button" className={splitMode === 'custom' ? 'active' : ''} onClick={() => { setCustomDirty(false); setSplitMode('custom'); }}>
                  Custom
                </button>
              </div>
              <p className="split-hint">
                {splitMode === 'even'
                  ? `${selectedPeople.length || 0} people · $${evenShare} each`
                  : 'Fine-tune individual shares by dragging the sliders or entering specific amounts'}
              </p>
              </div>

              <div className="people-picker">
                {(board?.participants || []).map((person) => {
                  const checked = selected.includes(person.uid);
                  const shareValue = Number(customAmounts[person.uid] ?? evenShare);
                  return (
                    <div
                      key={person.uid}
                      className={`person-chip ${checked ? 'on' : ''}`}
                      onClick={() => togglePerson(person.uid)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          togglePerson(person.uid);
                        }
                      }}
                    >
                      {checked ? <span className="chip-check" aria-hidden="true">✓</span> : null}
                      <img src={mediaUrl(person.profile_picture) || ''} alt="" />
                      <div className="chip-copy">
                        <strong>{displayName(person)}</strong>
                        <small>{person.email}</small>
                      </div>
                      {splitMode === 'custom' && checked ? (
                        <div className="chip-slider" onClick={(event) => event.stopPropagation()}>
                          {editingShareUid === person.uid ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="share-input"
                              autoFocus
                              value={shareDraft}
                              onChange={(event) => {
                                const raw = event.target.value.replace(/[^0-9.]/g, '');
                                setShareDraft(raw);
                                if (raw === '' || raw === '.') return;
                                setSliderShare(person.uid, raw);
                              }}
                              onBlur={() => {
                                if (shareDraft === '' || shareDraft === '.') {
                                  setSliderShare(person.uid, 0);
                                }
                                setEditingShareUid('');
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="share-amount"
                              onClick={() => {
                                setEditingShareUid(person.uid);
                                setShareDraft(String(shareValue));
                              }}
                            >
                              ${shareValue.toFixed(2)}
                            </button>
                          )}
                          <input
                            type="range"
                            min="0"
                            max={totalAmount || 0}
                            step="0.01"
                            value={shareValue}
                            onChange={(event) => setSliderShare(person.uid, event.target.value)}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Expense'}</button>
            </form>

            <div className="expense-list" ref={listRef}>
              <h2>Trip Expenses</h2>
              {ledgerItems.length === 0 ? (
                <p className="muted">No expenses yet. Upload a receipt or add one by hand.</p>
              ) : (
                <>
                  <div className="ledger-organizer" role="tablist" aria-label="Expense categories">
                    {ledgerFilters.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={ledgerFilter === option.id}
                        className={ledgerFilter === option.id ? 'active' : ''}
                        onClick={() => {
                          setLedgerFilter(option.id);
                          setExtraShown(0);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {filteredItems.length === 0 ? (
                    <p className="muted">No receipts in this category.</p>
                  ) : visibleItems.map((item) => (
                    item.kind === 'payment' ? (
                      <article key={item.id} className="ledger-item settlement">
                        <div>
                          <strong>{paymentLabel(item.payment)}</strong>
                          <span>Payment · {item.payment.created_at ? String(item.payment.created_at).slice(0, 10) : ''}</span>
                        </div>
                        <div className="ledger-side">
                          <b>-${Number(item.payment.amount).toFixed(2)}</b>
                        </div>
                      </article>
                    ) : (
                      <article key={item.id} className={`ledger-item cat-${String(item.expense.category || 'other').toLowerCase()}`}>
                        <div>
                          <strong>{toTitleCase(item.expense.title || item.expense.description)}</strong>
                          <span>{categoryLabel(item.expense.category)} {item.expense.expense_date ? `· ${String(item.expense.expense_date).slice(0, 10)}` : ''}</span>
                          <div className="share-pills">
                            {(item.expense.shares || []).map((share) => (
                              <em key={share.share_id}>{toTitleCase(share.first_name || 'Traveler')} ${Number(share.amount).toFixed(2)}</em>
                            ))}
                          </div>
                        </div>
                        <div className="ledger-side">
                          <b>${Number(item.expense.amount).toFixed(2)}</b>
                        </div>
                        <button type="button" className="ledger-remove" onClick={() => handleDelete(item.expense.expense_id)}>Remove</button>
                      </article>
                    )
                  ))}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="ledger-more"
                      onClick={() => setExtraShown((count) => count + 10)}
                    >
                      View More
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {payTarget ? (
        <div className="pay-backdrop" onClick={() => setPayTarget(null)}>
          <form className="pay-modal" onClick={(event) => event.stopPropagation()} onSubmit={submitPayment}>
            <h3>How Much Paid?</h3>
            <p>Sending payment to {displayName(payTarget)}.</p>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              onWheel={(event) => event.target.blur()}
              placeholder="0.00"
              autoFocus
            />
            <div className="pay-actions">
              <button type="button" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit">Pay</button>
            </div>
          </form>
        </div>
      ) : null}
      </div>
    </div>
  );
};

export default Expense;
