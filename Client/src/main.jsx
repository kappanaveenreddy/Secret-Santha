import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { Gift, Plus, Trash2, Users, Mail, CalendarDays, Sparkles, ShieldCheck, PartyPopper } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '';
const emptyPerson = () => ({ name: '', email: '' });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalidInputStyle = { borderColor: '#d75b57', boxShadow: '0 0 0 3px rgba(215, 91, 87, 0.08)' };
const validationTextStyle = { color: '#b33d38', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 };

function validateForm({ eventName, budget, date, people }) {
  const errors = {
    eventName: '',
    budget: '',
    date: '',
    people: people.map(() => ({ name: '', email: '' }))
  };

  const trimmedEventName = eventName.trim();
  if (!trimmedEventName) {
    errors.eventName = 'Event name is required.';
  } else if (trimmedEventName.length < 2) {
    errors.eventName = 'Event name must be at least 2 characters.';
  } else if (trimmedEventName.length > 100) {
    errors.eventName = 'Event name cannot exceed 100 characters.';
  }

  if (budget !== '') {
    const numBudget = Number(budget);
    if (Number.isNaN(numBudget) || !Number.isFinite(numBudget)) {
      errors.budget = 'Gift budget must be a valid number.';
    } else if (numBudget < 0) {
      errors.budget = 'Gift budget cannot be negative.';
    } else if (!Number.isInteger(numBudget)) {
      errors.budget = 'Gift budget must be a whole number.';
    }
  }

  if (date) {
    const selected = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selected.getTime())) {
      errors.date = 'Please choose a valid exchange date.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.date = 'Exchange date cannot be in the past.';
      }
    }
  }

  const seenEmails = new Set();
  const seenNames = new Set();

  people.forEach((person, index) => {
    const name = person.name.trim();
    const email = person.email.trim();

    if (!name) {
      errors.people[index].name = 'Name is required.';
    } else if (name.length < 2) {
      errors.people[index].name = 'Name must be at least 2 characters.';
    } else if (name.length > 60) {
      errors.people[index].name = 'Name is too long.';
    } else {
      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        errors.people[index].name = 'Duplicate participant name.';
      } else {
        seenNames.add(key);
      }
    }

    if (!email) {
      errors.people[index].email = 'Email is required.';
    } else if (!emailPattern.test(email)) {
      errors.people[index].email = 'Enter a valid email address.';
    } else {
      const key = email.toLowerCase();
      if (seenEmails.has(key)) {
        errors.people[index].email = 'Duplicate email address.';
      } else {
        seenEmails.add(key);
      }
    }
  });

  return errors;
}

function App() {
  const [eventName, setEventName] = useState('Office Secret Santa 2026');
  const [budget, setBudget] = useState('');
  const [date, setDate] = useState('');
  const [people, setPeople] = useState([emptyPerson(), emptyPerson(), emptyPerson()]);
  const [event, setEvent] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [formErrors, setFormErrors] = useState({ eventName: '', budget: '', date: '', people: [] });

  const updatePerson = (i, field, value) => {
    setPeople(old => old.map((p, n) => n === i ? { ...p, [field]: value } : p));
    setFormErrors(prev => {
      const nextPeople = [...(prev.people || [])];
      if (!nextPeople[i]) nextPeople[i] = { name: '', email: '' };
      if (nextPeople[i][field]) nextPeople[i][field] = '';
      return { ...prev, people: nextPeople };
    });
  };

  const validateOnBlur = () => {
    const nextErrors = validateForm({ eventName, budget, date, people });
    setFormErrors(nextErrors);
  };

  const validation = validateForm({ eventName, budget, date, people });
  const isFormReady = !Boolean(validation.eventName || validation.budget || validation.date) && !validation.people.some(row => row.name || row.email) && people.length >= 3 && people.every(person => person.name.trim() && person.email.trim());

  const resetValidation = () => setFormErrors({ eventName: '', budget: '', date: '', people: [] });
  const headers = { 'Content-Type': 'application/json' };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['csv', 'xls', 'xlsx'];

    if (!extension || !allowed.includes(extension)) {
      setUploadError('Please upload a CSV or Excel file (.csv, .xlsx, .xls).');
      event.target.value = '';
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) {
        throw new Error('The uploaded file has no rows to import.');
      }

      const importedPeople = rows
        .map((row) => {
          const lowerRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).trim().toLowerCase(), value]));
          const findCell = (candidates) => {
            for (const candidate of candidates) {
              const value = lowerRow[candidate];
              if (value !== undefined && value !== null && String(value).trim() !== '') {
                return String(value).trim();
              }
            }
            return '';
          };

          let name = findCell(['name', 'full name', 'full_name', 'participant name', 'participant']);
          let email = findCell(['email', 'email address', 'e-mail']);

          if (!name || !email) {
            const values = Object.values(row)
              .map(value => String(value ?? '').trim())
              .filter(Boolean);

            if (values.length >= 2) {
              name = name || values[0];
              email = email || values[1];
            }
          }

          return { name: name || '', email: email || '' };
        })
        .filter(person => person.name || person.email)
        .map(person => ({ name: person.name, email: person.email }));

      if (!importedPeople.length) {
        throw new Error('No valid names and email addresses were found in the file.');
      }

      setPeople(importedPeople.slice(0, 20));
      setUploadError('');
      setError('');
      setFormErrors({ eventName: '', budget: '', date: '', people: importedPeople.slice(0, 20).map(() => ({ name: '', email: '' })) });
    } catch (err) {
      setUploadError(err.message || 'Could not read that spreadsheet. Please check the file and try again.');
    } finally {
      event.target.value = '';
    }
  };
  async function createEvent(e) {
    e.preventDefault(); setError(''); setResult(null);

    const validation = validateForm({ eventName, budget, date, people });
    setFormErrors(validation);

    const hasAnyFieldError = Boolean(validation.eventName || validation.budget || validation.date) || validation.people.some(row => row.name || row.email);
    if (hasAnyFieldError) {
      setError('Please fix the highlighted fields before creating the event.');
      return;
    }

    const valid = people
      .map(person => ({ name: person.name.trim(), email: person.email.trim() }))
      .filter(person => person.name && person.email);

    if (valid.length < 3) {
      setError('At least 3 complete participants are required.');
      return;
    }
    if (valid.length !== people.length) {
      setError('Complete or remove every participant row before creating the event.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API}/api/events`, { method: 'POST', headers, body: JSON.stringify({ name: eventName.trim(), giftBudget: budget ? Number(budget) : null, exchangeDate: date || null, participants: valid }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data === 'string' ? data : data.title || data.message || `Request failed (${response.status})`);
      setEvent(data); setResult(null); resetValidation();
    } catch (err) { setError(err.message || 'Could not connect to the API. Check that the backend is running.'); }
    finally { setBusy(false); }
  }
  async function draw() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/api/events/${event.id}/draw-and-email`, { method: 'POST', headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data === 'string' ? data : data.title || data.message || `Request failed (${response.status})`);
      setResult(data);
    } catch (err) { setError(err.message || 'The draw could not be completed.'); }
    finally { setBusy(false); }
  }
  function reset() { setEvent(null); setResult(null); setError(''); setPeople([emptyPerson(), emptyPerson(), emptyPerson()]); }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-icon"><Gift size={22}/></span> <span>SantaCircle</span></a><span className="secure"><ShieldCheck size={15}/> By Kappa Naveen Reddy</span></header>
    <main id="top">
      <section className="hero"><div className="eyebrow"><Sparkles size={14}/> NRK PRESENTS · THE JOY OF GIVING</div><h1>Make someone's<br/><em>season magical.</em></h1><p>Set up your Secret Santa exchange. We'll make the matches and send each person their surprise privately.</p><div className="hero-stats"><span><Users size={16}/> One name per person</span><span><Mail size={16}/> Private email reveal</span></div><div className="hero-art"><div className="orb orb-one">✦</div><div className="gift-box">🎁</div><div className="orb orb-two">✧</div><div className="snow snow-one">❄</div><div className="snow snow-two">❄</div></div></section>
      <section className="form-card">
        <div className="card-heading"><div><div className="step">YOUR EXCHANGE</div><h2>Let's set it up</h2></div><div className="heading-icon"><PartyPopper size={23}/></div></div>
        {!event ? <form onSubmit={createEvent}>
          <label className="field-label">Event name</label>
          <input
            value={eventName}
            onChange={e => { setEventName(e.target.value); setFormErrors(prev => ({ ...prev, eventName: '' })); }}
            onBlur={validateOnBlur}
            placeholder="e.g. Office Secret Santa"
            required
            aria-invalid={Boolean(formErrors.eventName)}
            style={formErrors.eventName ? invalidInputStyle : undefined}
          />
          {formErrors.eventName && <div style={validationTextStyle}>{formErrors.eventName}</div>}

          <div className="two-col">
            <div>
              <label className="field-label">Gift budget <small>Optional · ₹</small></label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={e => { setBudget(e.target.value); setFormErrors(prev => ({ ...prev, budget: '' })); }}
                onBlur={validateOnBlur}
                placeholder="1000"
                aria-invalid={Boolean(formErrors.budget)}
                style={formErrors.budget ? invalidInputStyle : undefined}
              />
              {formErrors.budget && <div style={validationTextStyle}>{formErrors.budget}</div>}
            </div>
            <div>
              <label className="field-label">Exchange date <small>Optional</small></label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setFormErrors(prev => ({ ...prev, date: '' })); }}
                onBlur={validateOnBlur}
                aria-invalid={Boolean(formErrors.date)}
                style={formErrors.date ? invalidInputStyle : undefined}
              />
              {formErrors.date && <div style={validationTextStyle}>{formErrors.date}</div>}
            </div>
          </div>

          <div className="participants-title"><div><label className="field-label">Who's playing?</label><p>Add each person's name and email address.</p></div><span className="count-pill">{people.length} people</span></div>
          <div className="people-list">{people.map((p, i) => {
            const nameError = formErrors.people[i]?.name;
            const emailError = formErrors.people[i]?.email;
            return <div className="person-row" key={i}><span className="person-number">{String(i + 1).padStart(2, '0')}</span>
              <div style={{ display: 'grid', gap: '6px' }}>
                <input aria-label={`Participant ${i + 1} name`} value={p.name} onChange={e => updatePerson(i, 'name', e.target.value)} onBlur={validateOnBlur} placeholder="Full name" required aria-invalid={Boolean(nameError)} style={nameError ? invalidInputStyle : undefined} />
                {nameError && <div style={validationTextStyle}>{nameError}</div>}
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                <input aria-label={`Participant ${i + 1} email`} type="email" value={p.email} onChange={e => updatePerson(i, 'email', e.target.value)} onBlur={validateOnBlur} placeholder="Email address" required aria-invalid={Boolean(emailError)} style={emailError ? invalidInputStyle : undefined} />
                {emailError && <div style={validationTextStyle}>{emailError}</div>}
              </div>
              <button type="button" className="icon-button" aria-label="Remove participant" onClick={() => { setPeople(old => old.filter((_, n) => n !== i)); setFormErrors(prev => ({ ...prev, people: prev.people.filter((_, n) => n !== i) })); }} disabled={people.length <= 3}><Trash2 size={16}/></button>
            </div>;
          })}</div>
          <button type="button" className="add-button" onClick={() => { setPeople(old => [...old, emptyPerson()]); setFormErrors(prev => ({ ...prev, people: [...(prev.people || []), { name: '', email: '' }] })); }}><Plus size={16}/> Add another person</button>
          <div style={{ marginTop: '12px', border: '1px dashed #d7e2d9', borderRadius: '10px', padding: '12px 14px', background: '#f8faf7' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2b5148', marginBottom: '8px' }}>Upload participant list</div>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} style={{ width: '100%', fontSize: '12px' }} />
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#78847d' }}>Upload only participant details: Name and Email columns. Event name, budget, and date stay manual.</div>
            {uploadError && <div className="error" style={{ marginTop: '10px' }}>{uploadError}</div>}
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Creating your event…' : <>Create Secret Santa <Sparkles size={17}/></>}</button>
          <p className="fine-print">At least 3 participants are required. Each person gets one unique recipient, never themselves.</p>
        </form> : <div className="success-panel"><div className="success-icon">🎄</div><h3>{event.name} is ready!</h3><p>{event.participantCount} participants added. The draw will be random and private.</p><div className="privacy-note"><ShieldCheck size={18}/><span>Assignments are never shown on this page. Each person receives only their own result by email.</span></div>{!result ? <button className="primary-button" onClick={draw} disabled={busy}>{busy ? 'Drawing names & sending emails…' : <>Draw names & send emails <Mail size={17}/></>}</button> : <><div className="result-box"><strong>{result.sent} of {result.total} emails sent</strong><span>{result.failed} failed</span></div><p className="fine-print">Check the email delivery status in the API/admin event details. Failed emails can be retried only after implementing a safe resend workflow; the draw itself is locked to prevent changing assignments.</p><button className="secondary-button" onClick={reset}>Create another event</button></>}{error && <div className="error">{error}</div>}</div>}
      </section>
    </main>
    <footer><span>SantaCircle · A little more holiday magic ✨</span><span><CalendarDays size={14}/> By Kappa Naveen Reddy</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
