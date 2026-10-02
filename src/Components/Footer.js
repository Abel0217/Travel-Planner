import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../Contexts/AuthContext';
import logo from './css/Logo.PNG';
import './css/Footer.css';

const PLAN_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/itineraries/create', label: 'Create Itinerary' },
    { to: '/itineraries-view', label: 'View Itineraries' },
    { to: '/travel-guide', label: 'Ask Leo Travel Guide' },
];

const TOGETHER_LINKS = [
    { to: '/friends', label: 'Friends' },
    { to: '/expenses', label: 'Expenses' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
];

const TIPS = [
    { icon: 'chat', title: 'Plan Together', text: 'Invite friends, then chat and share notes.' },
    { icon: 'wallet', title: 'Split Costs Fairly', text: 'Log an expense once, see who owes what.' },
    { icon: 'spark', title: 'Let Leo Help', text: 'Ask Leo for ideas and add them to your trip.' },
];

const Icon = ({ name }) => {
    const common = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
    if (name === 'chat') return <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z" /></svg>;
    if (name === 'wallet') return <svg {...common}><path d="M20 7H5a2 2 0 0 1 0-4h13v4z" /><path d="M3 5v13a2 2 0 0 0 2 2h15V7" /><circle cx="16.5" cy="13.5" r="1.2" /></svg>;
    if (name === 'spark') return <svg {...common}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
    if (name === 'plane') return <svg {...common}><path d="M10.5 13.5 3 11l1.5-1.5 9 1L18 6a2 2 0 0 1 3 3l-4.5 4.5 1 9L16.5 24 14 16.5z" transform="translate(0 -3)" /></svg>;
    return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
};

const Footer = () => {
    const { currentUser } = useContext(AuthContext);
    const { pathname } = useLocation();
    const year = new Date().getFullYear();

    // Ask Leo is a full-screen chat, so it keeps its own layout.
    if (pathname.startsWith('/travel-guide')) return null;

    const onAuthPage = pathname === '/login' || pathname === '/signup';
    const hasDock = /^\/itineraries\/(?!create)[^/]+/.test(pathname);
    const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const openFromFooter = () => {
        const jump = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };
        jump();
        requestAnimationFrame(jump);
        window.setTimeout(jump, 0);
        window.setTimeout(jump, 80);
    };

    if (onAuthPage || !currentUser) {
        return (
            <footer className="site-footer is-slim">
                <div className="sf-inner">
                    <div className="sf-slim">
                        <img src={logo} alt="Travel Planner" className="sf-logo" />
                        <p>Plan every day. Split every cost. Travel together.</p>
                        <span>© {year} Travel Planner</span>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className={`site-footer ${hasDock ? 'has-dock' : ''}`}>
            <div className="sf-inner">
                <section className="sf-cta">
                    <div className="sf-cta-text">
                        <span className="sf-cta-icon"><Icon name="plane" /></span>
                        <div>
                            <h3>Where To Next?</h3>
                            <p>Start a new itinerary and build the trip together.</p>
                        </div>
                    </div>
                    <div className="sf-cta-actions">
                        <Link to="/itineraries/create" className="sf-btn is-gold" onClick={openFromFooter}>Start A New Trip</Link>
                    </div>
                </section>

                <div className="sf-grid">
                    <div className="sf-brand">
                        <img src={logo} alt="Travel Planner" className="sf-logo" />
                        <p>Plan every day, split every cost and keep the whole crew in sync.</p>
                    </div>

                    <nav className="sf-col" aria-label="Plan">
                        <h4>Plan</h4>
                        <ul>
                            {PLAN_LINKS.map((link) => (
                                <li key={link.to}><Link to={link.to} onClick={openFromFooter}>{link.label}</Link></li>
                            ))}
                        </ul>
                    </nav>

                    <nav className="sf-col" aria-label="Together">
                        <h4>Together</h4>
                        <ul>
                            {TOGETHER_LINKS.map((link) => (
                                <li key={link.to}><Link to={link.to} onClick={openFromFooter}>{link.label}</Link></li>
                            ))}
                        </ul>
                    </nav>

                    <div className="sf-col sf-tips">
                        <h4>Good To Know</h4>
                        <ul>
                            {TIPS.map((tip) => (
                                <li key={tip.title}>
                                    <span className="sf-tip-icon"><Icon name={tip.icon} /></span>
                                    <div>
                                        <b>{tip.title}</b>
                                        <p>{tip.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="sf-bottom">
                    <span>© {year} Travel Planner. All Rights Reserved.</span>
                    <span className="sf-made">Made For Travelers Who Plan Together</span>
                    <button type="button" className="sf-top" onClick={toTop}>
                        Back To Top <Icon name="up" />
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
