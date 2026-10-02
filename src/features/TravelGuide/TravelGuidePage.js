import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import PlaceSuggest from './PlaceSuggest';
import { openLeoForItinerary } from '../../utils/itineraryContext';
import { cityBackdrop, fetchCityPhoto } from './cityBackdrop';
import AddToTripDialog from './AddToTripDialog';
import { fetchTripBookings, findOnTrip } from '../../utils/tripBookings';
import { randomLocalSceneryIndex, sceneryImages, useHeldCrossfade } from '../../utils/scenery';
import './TravelGuide.css';

function componentOf(place, type) {
  return (place.address_components || []).find((part) => part.types.includes(type));
}

function StopLine({ text }) {
  const piped = text.split('|').map((part) => part.trim()).filter(Boolean);
  const isTime = (value) => value === '-' || /^\d{1,2}:\d{2}$/.test(value);
  const isType = (value) => /^(museum|restaurant|food|activity|park|show|nightlife|transit|stay)$/i.test(value);
  if (piped.length >= 3 && !isTime(piped[0]) && isType(piped[1])) {
    const [place, type, cost, ...rest] = piped;
    return { time: '', place, type, cost: cost || '', note: rest.join(' ') };
  }
  if (piped.length >= 3) {
    const [time, place, typeOrNote, cost, ...rest] = piped;
    const typed = piped.length >= 4;
    return {
      time: time === '-' ? '' : time,
      place,
      type: typed ? typeOrNote : guessType(`${place} ${typeOrNote}`),
      cost: typed ? (cost || '') : '',
      note: typed ? rest.join(' ') : typeOrNote,
    };
  }
  const labeled = text.match(/^([^:]{2,60}):\s*(.+)$/);
  if (labeled) {
    const place = labeled[1]
      .replace(/^(start at|walk to|head to|hit|then|next,?)\s+/i, '')
      .replace(/^(a|an)\s+(local\s+)?/i, '')
      .replace(/^the\s+/i, '')
      .trim();
    const note = labeled[2].trim();
    const costMatch = note.match(/\b(free|€\s?\d[\d,.]*|\$\s?\d[\d,.]*|€{2,3})\b/i);
    return {
      time: '',
      place,
      type: guessType(`${labeled[1]} ${note}`),
      cost: costMatch ? costMatch[1] : '',
      note,
    };
  }
  return null;
}

function guessType(text) {
  if (/museum|gallery|galerie/i.test(text)) return 'Museum';
  if (/restaurant|café|cafe|bistro|friterie|food/i.test(text)) return 'Restaurant';
  if (/park|garden/i.test(text)) return 'Park';
  if (/station|train|bus|metro|tram/i.test(text)) return 'Transit';
  if (/show|concert|bar|club|nightlife|party/i.test(text)) return 'Nightlife';
  return '';
}

function isMetaLine(place) {
  return /^(budget tip|cost|tip|getting around|timing|note|quick budget)/i.test(place);
}

function pipeStopsFrom(content) {
  const stops = [];
  const pattern = /\|\s*([^|\n]{2,70}?)\s*\|\s*(Museum|Restaurant|Food|Activity|Park|Show|Nightlife|Transit|Stay)\s*\|\s*([^|\n]{1,24}?)\s*\|\s*([^|\n]+)/gi;
  let match = pattern.exec(content);
  while (match) {
    stops.push({
      time: '',
      place: match[1].replace(/^-\s*/, '').trim(),
      type: match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase(),
      cost: match[3].trim(),
      note: match[4].trim(),
    });
    match = pattern.exec(content);
  }
  return stops;
}

function parsePlan(content) {
  const lines = String(content || '')
    .replace(/\s+•\s+/g, '\n• ')
    .replace(/\s+-\s+\|/g, '\n- |')
    .replace(/\s+(\d{1,2}:\d{2}\s+\|)/g, '\n$1')
    .split('\n')
    .map((line) => line.replace(/^(?:[•\-*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

  const intro = [];
  const outro = [];
  const days = [];
  let day = null;
  let period = null;
  let seenPlan = false;
  let explicitDay = false;

  const ensureDay = () => {
    if (!day) {
      day = { title: 'Day 1', periods: [] };
      days.push(day);
    }
    return day;
  };

  const ensurePeriod = (name) => {
    const current = ensureDay();
    period = { name, stops: [] };
    current.periods.push(period);
    seenPlan = true;
    return period;
  };

  lines.forEach((line) => {
    const dayMatch = /^day\s+(\d+)\b[:\s-]*(.*)$/i.exec(line);
    if (dayMatch && line.length < 40) {
      day = { title: `Day ${dayMatch[1]}`, periods: [] };
      days.push(day);
      period = null;
      seenPlan = true;
      explicitDay = true;
      return;
    }
    const periodMatch = /^((?:late\s+)?(?:morning|afternoon|evening|night|lunch|dinner|breakfast)(?:\s*\/\s*(?:late\s+)?(?:morning|afternoon|evening|night))?)\b[:\s-]*(.*)$/i.exec(line);
    if (periodMatch && line.length < 90) {
      const name = periodMatch[1].replace(/\b\w/g, (letter) => letter.toUpperCase());
      const extra = periodMatch[2].trim();
      ensurePeriod(extra && extra.length < 42 ? `${name} · ${extra}` : name);
      return;
    }
    const stop = StopLine({ text: line });
    if (stop && stop.place) {
      if (!period) ensurePeriod('Start');
      if (isMetaLine(stop.place)) {
        const last = period.stops[period.stops.length - 1];
        if (last) {
          if (stop.cost && !last.cost) last.cost = stop.cost;
          const extra = stop.note.replace(/^(around|about)\s+/i, '');
          if (extra && !last.note.includes(extra)) last.note = `${last.note} ${extra}`.trim();
          const price = extra.match(/€\s?\d[\d,.]*(\s*(?:to|-|–)\s*€?\s?\d[\d,.]*)?|\$\s?\d[\d,.]*/);
          if (price && !last.cost) {
            last.cost = price[0].replace(/\s*(?:to|-|–)\s*/i, '–').replace(/\s+/g, '').replace(/[,.]+$/, '');
          }
        }
        return;
      }
      period.stops.push(stop);
      seenPlan = true;
      return;
    }
    if (!seenPlan) intro.push(line);
    else outro.push(line);
  });

  const stopCount = days.reduce((sum, item) => sum + item.periods.reduce((inner, block) => inner + block.stops.length, 0), 0);
  const inlineStops = stopCount > 0 ? [] : pipeStopsFrom(content);
  if (stopCount < 1 && inlineStops.length === 0) return null;
  const leadSource = stopCount > 0 ? intro : [];
  const lead = leadSource
    .map((line) => line.split(/\s+-\s+\|/)[0].replace(/\|[\s\S]*$/, '').trim())
    .filter((line) => line && !line.includes('|'))
    .slice(0, 1);
  const planned = stopCount > 0
    ? days
      .map((item) => ({ ...item, periods: item.periods.filter((block) => block.stops.length) }))
      .filter((item) => item.periods.length)
    : [{ title: '', periods: [{ name: '', stops: inlineStops }] }];
  if (
    !explicitDay
    && planned.length === 1
    && planned[0].periods.length === 1
    && planned[0].periods[0].name === 'Start'
    && planned[0].periods[0].stops.length === 1
  ) {
    planned[0].title = '';
    planned[0].periods[0].name = '';
  }
  planned.forEach((item) => {
    const hasTimeOfDay = item.periods.some((block) => block.name && block.name !== 'Start');
    if (!hasTimeOfDay) item.title = '';
    item.periods.forEach((block) => {
      if (block.name === 'Start') block.name = '';
    });
  });
  return {
    intro: lead,
    days: planned,
    outro: [],
  };
}

function PlanView({ plan, onOpenPlace, onAddStop, isOnTrip }) {
  return (
    <div className="plan">
      {plan.intro.map((line) => <p className="plan-lead" key={line}>{line}</p>)}
      {plan.days.map((day, dayIndex) => (
        <section className="plan-day" key={`${day.title || 'pick'}-${dayIndex}`}>
          {day.title ? <h3>{day.title}</h3> : null}
          {day.periods.map((period) => (
            <div className="plan-block" key={`${day.title}-${period.name}-${dayIndex}`}>
              {period.name ? <p className="plan-when">{period.name}</p> : null}
              <ol className="plan-rail">
                {period.stops.map((stop, index) => (
                  <li className="plan-stop" key={`${stop.place}-${index}`}>
                    <span className="plan-time">{stop.time || index + 1}</span>
                    <div className="plan-body">
                      <div className="plan-row">
                        <button type="button" className="plan-link" onClick={() => onOpenPlace(stop)}>
                          {stop.place}
                        </button>
                        {stop.type ? <span className="plan-chip">{/^food$/i.test(stop.type) ? 'Restaurant' : stop.type}</span> : null}
                        {stop.cost ? <span className="plan-chip plan-cost">{/^free$/i.test(stop.cost) ? 'Free' : stop.cost}</span> : null}
                        {onAddStop ? (
                          <button
                            type="button"
                            className={`plan-add${isOnTrip && isOnTrip(stop) ? ' is-added' : ''}`}
                            onClick={() => onAddStop({
                              ...stop,
                              when: period.name,
                              dayNumber: Number((/^day\s+(\d+)/i.exec(day.title || '') || [])[1]) || 0,
                            })}
                          >
                            {isOnTrip && isOnTrip(stop) ? '✓ On Your Trip' : '+ Add To Trip'}
                          </button>
                        ) : null}
                      </div>
                      {stop.note ? <p>{stop.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
      {plan.outro.map((line) => <p className="plan-lead" key={line}>{line}</p>)}
    </div>
  );
}

const BULLET_PATTERN = /^(?:[-•*]|\d+[.)])\s+(.*)$/;
const HEADING_PATTERN = /^\[([^\]]{2,50})\]$/;

function parseBullet(text) {
  if (text.includes(' | ')) {
    const [label, ...rest] = text.split('|').map((part) => part.trim()).filter(Boolean);
    return { label, text: rest.join(' · ') };
  }
  const labeled = /^([^:]{2,32}):\s+(.+)$/.exec(text);
  if (labeled) return { label: labeled[1].trim(), text: labeled[2].trim() };
  return { label: '', text };
}

// Answers like "[Heading]" + bullets (safety, transport, history, tips).
function parseInfo(content) {
  const lines = String(content || '').split('\n').map((line) => line.trim());
  if (!lines.some((line) => HEADING_PATTERN.test(line))) return null;

  const lead = [];
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    if (!line) return;
    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      current = { title: heading[1].trim(), items: [] };
      sections.push(current);
      return;
    }
    const bullet = BULLET_PATTERN.exec(line);
    if (!current) {
      lead.push(bullet ? bullet[1] : line);
    } else {
      current.items.push(parseBullet(bullet ? bullet[1] : line));
    }
  });

  return sections.length ? { lead, sections } : null;
}

function InfoView({ info }) {
  return (
    <div className="info">
      {info.lead.map((line, index) => <p className="info-lead" key={`${index}-${line}`}>{line}</p>)}
      {info.sections.map((section, sectionIndex) => (
        <section className="info-section" key={`${section.title}-${sectionIndex}`}>
          <h3>{section.title}</h3>
          <ul>
            {section.items.map((item, index) => (
              <li key={`${index}-${item.text}`}>
                {item.label ? <strong className="info-label">{item.label}</strong> : null}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Everything else: short paragraphs and simple bullet lists, never one wall of text.
function PlainView({ content }) {
  const blocks = String(content || '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className="plain">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.every((line) => BULLET_PATTERN.test(line))) {
          return (
            <ul className="plain-list" key={`${index}-${block.slice(0, 12)}`}>
              {lines.map((line, itemIndex) => <li key={`${itemIndex}-${line}`}>{BULLET_PATTERN.exec(line)[1]}</li>)}
            </ul>
          );
        }
        return <p key={`${index}-${block.slice(0, 12)}`}>{block}</p>;
      })}
    </div>
  );
}

function MessageBody({ content, role, onOpenPlace, onAddStop, isOnTrip }) {
  if (role !== 'assistant') {
    return <p>{content}</p>;
  }
  const info = parseInfo(content);
  if (info) {
    return <InfoView info={info} />;
  }
  const plan = parsePlan(content);
  if (!plan) {
    return <PlainView content={content} />;
  }
  return <PlanView plan={plan} onOpenPlace={onOpenPlace} onAddStop={onAddStop} isOnTrip={isOnTrip} />;
}

function TypingBubble() {
  return (
    <div className="guide-message assistant is-typing" aria-label="Leo is typing">
      <span /><span /><span />
    </div>
  );
}

function LeoMark() {
  return (
    <svg className="leo-mark" viewBox="0 0 140 140" aria-hidden="true">
      <circle className="leo-ring" cx="70" cy="70" r="62" />
      <g className="leo-dog">
        <path className="leo-ear" d="M46 62c-16 2-20 28-4 32" />
        <path className="leo-ear leo-ear-right" d="M94 62c16 2 20 28 4 32" />
        <circle cx="70" cy="68" r="24" />
        <ellipse cx="70" cy="78" rx="11" ry="8" />
        <circle className="leo-mark-fill" cx="70" cy="76" r="2.2" />
        <circle className="leo-mark-fill" cx="61" cy="64" r="2" />
        <circle className="leo-mark-fill" cx="79" cy="64" r="2" />
        <path d="M64 82c4 4 8 4 12 0" />
        <path d="M54 92c-4 16 36 16 32 0" />
        <path className="leo-tail" d="M96 96c14-10 20 6 8 12" />
      </g>
    </svg>
  );
}

const TravelGuidePage = () => {
  const navigate = useNavigate();
  const { country: countryParam, city: cityParam } = useParams();
  const [searchParams] = useSearchParams();
  const scopedItineraryId = searchParams.get('itineraryId') || '';
  const planningDay = searchParams.get('day') || '';
  const [tree, setTree] = useState([]);
  const [openCountry, setOpenCountry] = useState(countryParam || '');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newCity, setNewCity] = useState('');
  const [countryIso, setCountryIso] = useState('');
  const [countryLocked, setCountryLocked] = useState(false);
  const [cityLocked, setCityLocked] = useState(false);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [placeView, setPlaceView] = useState(null);
  const [placeLoaded, setPlaceLoaded] = useState(false);
  const [photo, setPhoto] = useState('');
  const [addStop, setAddStop] = useState(null);
  const [toast, setToast] = useState(null);
  const [tripItems, setTripItems] = useState([]);
  const [myTrips, setMyTrips] = useState(null);
  const messagesRef = useRef(null);
  const [startSlide] = useState(() => randomLocalSceneryIndex());
  const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });

  const selectedCountry = decodeURIComponent(countryParam || '');
  const selectedCity = decodeURIComponent(cityParam || '');

  // What is already on the trip, so a recommendation can say "On Your Trip" instead of asking again.
  useEffect(() => {
    if (!scopedItineraryId) {
      setTripItems([]);
      return undefined;
    }
    let cancelled = false;
    fetchTripBookings(scopedItineraryId).then((list) => { if (!cancelled) setTripItems(list); });
    return () => { cancelled = true; };
  }, [scopedItineraryId]);

  useEffect(() => {
    if (scopedItineraryId) return undefined;
    let cancelled = false;
    apiClient.get('/itineraries')
      .then((response) => { if (!cancelled) setMyTrips(Array.isArray(response.data) ? response.data : []); })
      .catch(() => { if (!cancelled) setMyTrips([]); });
    return () => { cancelled = true; };
  }, [scopedItineraryId, selectedCity]);

  const placeHasTrip = Boolean(scopedItineraryId) || (myTrips || []).some((trip) => {
    const dest = String(trip.destinations || '').toLowerCase();
    const cityName = selectedCity.trim().toLowerCase();
    return Boolean(cityName) && dest.includes(cityName);
  });

  const loadTree = useCallback(async () => {
    try {
      const response = await apiClient.get('/ai/chats');
      setTree(response.data.countries || []);
    } catch (err) {
      console.error(err);
      setError('Could not load saved destination chats. Is the server and database running?');
    } finally {
      setLoadingTree(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedCountry || !selectedCity) {
      setMessages([]);
      return;
    }

    setLoadingChat(true);
    try {
      const response = await apiClient.get(
        `/ai/chats/${encodeURIComponent(selectedCountry)}/${encodeURIComponent(selectedCity)}/messages${scopedItineraryId ? `?itineraryId=${scopedItineraryId}` : ''}`
      );
      setMessages(response.data.messages || []);
      setOpenCountry(selectedCountry);
    } catch (err) {
      console.error(err);
      setError('Could not load this destination chat.');
    } finally {
      setLoadingChat(false);
    }
  }, [selectedCountry, selectedCity, scopedItineraryId]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Ask Leo';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Opening a chat: jump straight to the newest message.
  useEffect(() => {
    const box = messagesRef.current;
    if (box && !loadingChat) box.scrollTop = box.scrollHeight;
  }, [loadingChat, selectedCity, selectedCountry]);

  // Sending or receiving: follow the conversation. A long answer (like a plan)
  // is shown from its first line so nothing is skipped.
  useEffect(() => {
    const box = messagesRef.current;
    if (!box || loadingChat) return;
    const bubbles = box.querySelectorAll('.guide-message');
    const last = bubbles[bubbles.length - 1];
    const lastIsReply = last && last.classList.contains('assistant') && !last.classList.contains('is-typing');
    if (lastIsReply && last.offsetHeight > box.clientHeight * 0.7) {
      const top = last.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
      box.scrollTo({ top, behavior: 'smooth' });
    } else {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, sending, loadingChat]);

  useEffect(() => {
    setPlaceLoaded(false);
  }, [placeView]);

  useEffect(() => {
    if (!selectedCity) {
      setPhoto('');
      return undefined;
    }
    setPhoto(cityBackdrop(selectedCity));
    let cancel = false;
    fetchCityPhoto(selectedCity).then((url) => {
      if (!cancel && url) setPhoto(url);
    });
    return () => {
      cancel = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    const bootScopedChat = async () => {
      if (selectedCountry && selectedCity) return;
      if (!scopedItineraryId) return;
      try {
        const response = await apiClient.get(`/itineraries/${scopedItineraryId}`);
        await openLeoForItinerary(apiClient, navigate, {
          itinerary_id: scopedItineraryId,
          destinations: response.data?.destinations,
        });
      } catch (err) {
        setError('Could not open the chat for this itinerary.');
      }
    };
    bootScopedChat();
  }, [scopedItineraryId, selectedCountry, selectedCity, navigate]);

  const startChat = async (event) => {
    event.preventDefault();
    if (!countryLocked || !cityLocked) {
      setError('Pick a real country, then a city from the Google suggestions.');
      return;
    }

    try {
      const country = newCountry.trim();
      const city = newCity.trim();
      const response = await apiClient.post('/ai/chats', {
        country,
        city,
      });
      setNewCountry('');
      setNewCity('');
      setCountryIso('');
      setCountryLocked(false);
      setCityLocked(false);
      await loadTree();
      navigate(`/travel-guide/${encodeURIComponent(response.data.country)}/${encodeURIComponent(response.data.city)}`);
    } catch (err) {
      console.error(err);
      setError('Could not start that destination chat.');
    }
  };

  const deleteCityChat = async (country, city) => {
    try {
      await apiClient.delete(`/ai/chats/${encodeURIComponent(country)}/${encodeURIComponent(city)}`);
      await loadTree();
      if (selectedCountry === country && selectedCity === city) {
        navigate('/travel-guide');
      }
    } catch (err) {
      console.error(err);
      setError('Could not delete that city chat.');
    }
  };

  const sendingRef = useRef(false);
  const askSent = useRef('');

  const sendText = async (text) => {
    const value = String(text || '').trim();
    if (!value || !selectedCountry || !selectedCity || sendingRef.current) return;

    sendingRef.current = true;
    setDraft('');
    setSending(true);
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: 'user', content: value }]);

    try {
      const response = await apiClient.post(
        `/ai/chats/${encodeURIComponent(selectedCountry)}/${encodeURIComponent(selectedCity)}/messages`,
        { message: value, itinerary_id: scopedItineraryId ? Number(scopedItineraryId) : undefined }
      );
      setMessages((current) => [...current, response.data.assistant]);
      await loadTree();
    } catch (err) {
      console.error(err);
      setError('Could not send that message.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    sendText(draft);
  };

  useEffect(() => {
    const pending = searchParams.get('ask');
    if (!pending || loadingChat || !selectedCity || askSent.current === pending) return undefined;
    askSent.current = pending;
    const next = new URLSearchParams(searchParams);
    next.delete('ask');
    const query = next.toString();
    navigate(
      `/travel-guide/${encodeURIComponent(selectedCountry)}/${encodeURIComponent(selectedCity)}${query ? `?${query}` : ''}`,
      { replace: true }
    );
    sendText(pending);
    return undefined;
  }, [loadingChat, selectedCity, selectedCountry, searchParams, navigate]);

  const heading = useMemo(() => {
    if (selectedCountry && selectedCity) {
      return `${selectedCity}, ${selectedCountry}`;
    }
    return 'Ask Leo';
  }, [selectedCountry, selectedCity]);

  return (
    <div className={`travel-guide${scopedItineraryId ? ' scoped' : ''}${sidebarOpen ? '' : ' is-collapsed'}`}>
      {scopedItineraryId ? (
        <button type="button" className="guide-back" onClick={() => navigate(`/itineraries/${scopedItineraryId}`)}>
          <span aria-hidden="true">←</span>
          Back
        </button>
      ) : (
      <aside className="travel-guide-sidebar">
        <form className="new-destination" onSubmit={startChat}>
          <p className="destination-label">Destination</p>
          <label className="place-field">
            <PlaceSuggest
            value={newCountry}
            types={['country']}
            placeholder="Country"
            onChange={(value) => {
              setNewCountry(value);
              setCountryLocked(false);
              setCountryIso('');
              setNewCity('');
              setCityLocked(false);
            }}
            onPlace={(place) => {
              const country = componentOf(place, 'country');
              if (!country) return;
              setNewCountry(country.long_name);
              setCountryIso(country.short_name.toLowerCase());
              setCountryLocked(true);
              setNewCity('');
              setCityLocked(false);
            }}
          />
          </label>
          <label className="place-field">
            <PlaceSuggest
            value={newCity}
            types={['(cities)']}
            countryIso={countryIso}
            disabled={!countryLocked}
            placeholder={countryLocked ? 'City' : 'City'}
            onChange={(value) => {
              setNewCity(value);
              setCityLocked(false);
            }}
            onPlace={(place) => {
              const city = componentOf(place, 'locality') || componentOf(place, 'administrative_area_level_1');
              setNewCity(city?.long_name || place.name);
              setCityLocked(true);
            }}
          />
          </label>
          <button type="submit">Start Chat</button>
        </form>

        {loadingTree ? <p className="guide-muted">Loading chats...</p> : null}

        <p className="past-chats-label">Past chats</p>
        <div className="country-tree">
          {tree.map((entry) => (
            <div key={entry.country} className="country-group">
              <button
                type="button"
                className={`country-toggle ${openCountry === entry.country ? 'open' : ''}`}
                onClick={() => setOpenCountry(openCountry === entry.country ? '' : entry.country)}
              >
                {entry.country}
              </button>
              {openCountry === entry.country ? (
                <div className="city-list">
                  {entry.cities.map((city) => {
                    const isActive = selectedCountry === entry.country && selectedCity === city.city;
                    return (
                      <div key={city.id} className={`city-row ${isActive ? 'active' : ''}`}>
                        <button
                          type="button"
                          className={`city-link ${isActive ? 'active' : ''}`}
                          onClick={() => navigate(`/travel-guide/${encodeURIComponent(entry.country)}/${encodeURIComponent(city.city)}`)}
                        >
                          {city.city}
                        </button>
                        <button
                          type="button"
                          className="city-delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteCityChat(entry.country, city.city);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
      )}

      {scopedItineraryId ? null : (
        <button
          type="button"
          className="guide-edge-toggle"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Hide Destinations' : 'Show Destinations'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
      )}

      <section className="travel-guide-chat">
        {photo ? (
          <div className="guide-city-photo" style={{ backgroundImage: `url(${photo})` }} aria-hidden="true" />
        ) : (
          <div className="guide-scenery" aria-hidden="true" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
            {sceneryImages.map((image, index) => (
              <div
                key={image}
                className={`guide-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
          </div>
        )}
        {selectedCity ? (
          <div className="travel-guide-header">
            <div>
              <p className="agent-name">Ask Leo</p>
              <h1>{heading}</h1>
            </div>
            {!scopedItineraryId && myTrips && !placeHasTrip ? (
              <button
                type="button"
                className="guide-create-trip"
                onClick={() => navigate(
                  `/itineraries/create?destination=${encodeURIComponent(`${selectedCity}, ${selectedCountry}`)}&title=${encodeURIComponent(selectedCity)}`
                )}
              >
                Create an Itinerary for {selectedCity}
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="guide-error">{error}</p> : null}

        {!selectedCity ? (
          <div className="guide-welcome">
            <LeoMark />
            <h1>Ask Leo</h1>
            <p>Choose a saved city on the left,<br />or start a new chat.</p>
          </div>
        ) : (
          <>
            <div className="guide-messages" ref={messagesRef}>
              {loadingChat ? <p className="guide-muted">Loading this city chat...</p> : null}
              {messages.map((message) => (
                <div key={message.id} className={`guide-message ${message.role}`}>
                  <MessageBody
                    content={message.content}
                    role={message.role}
                    onOpenPlace={(stop) => setPlaceView(stop)}
                    onAddStop={placeHasTrip ? (stop) => setAddStop(stop) : null}
                    isOnTrip={(stop) => Boolean(findOnTrip(tripItems, stop.place))}
                  />
                </div>
              ))}
              {sending ? <TypingBubble /> : null}
            </div>
            <form className="guide-composer" onSubmit={sendMessage}>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Ask Leo about ${selectedCity}...`}
              />
              <button type="submit" className="send-button" disabled={sending}>
                {sending ? '...' : 'Send'}
              </button>
            </form>
            {addStop ? (
              <AddToTripDialog
                stop={addStop}
                city={selectedCity}
                country={selectedCountry}
                scopedItineraryId={scopedItineraryId}
                initialDay={planningDay}
                onClose={() => setAddStop(null)}
                onAdded={(trip, result) => {
                  setToast({ place: addStop.place, tripId: trip.itinerary_id, title: trip.title, changed: Boolean(result && result.changed) });
                  if (String(trip.itinerary_id) === String(scopedItineraryId)) fetchTripBookings(trip.itinerary_id).then(setTripItems);
                  setAddStop(null);
                  window.setTimeout(() => setToast(null), 9000);
                }}
              />
            ) : null}
            {toast ? (
              <div className="guide-toast" role="status">
                <span>{toast.place} Was {toast.changed ? 'Updated On' : 'Added To'} {toast.title || 'Your Trip'}</span>
                <button type="button" onClick={() => navigate(`/itineraries/${toast.tripId}`)}>View Trip</button>
              </div>
            ) : null}
            {placeView ? (
              <div className="leo-browser" role="dialog" aria-label={placeView.place}>
                <div className="leo-browser-bar">
                  <div className="leo-browser-title">
                    <strong>{placeView.place}</strong>
                    <div className="leo-browser-meta">
                      {placeView.type ? <em>{placeView.type}</em> : null}
                      {placeView.cost ? <em>{/^free$/i.test(placeView.cost) ? 'Free' : placeView.cost}</em> : null}
                      <span>{[selectedCity, selectedCountry].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                  <div className="leo-browser-actions">
                    <a
                      className="leo-browser-open"
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${placeView.place} ${selectedCity} ${selectedCountry}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open In New Tab
                    </a>
                    <button type="button" onClick={() => setPlaceView(null)}>Close</button>
                  </div>
                </div>
                <div className={`leo-browser-progress${placeLoaded ? ' is-done' : ''}`} aria-hidden="true" />
                <iframe
                  title={placeView.place}
                  onLoad={() => setPlaceLoaded(true)}
                  src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(`${placeView.place} ${selectedCity} ${selectedCountry}`)}`}
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
};

export default TravelGuidePage;
