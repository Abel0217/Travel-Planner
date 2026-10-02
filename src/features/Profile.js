import React, { useState, useContext, useEffect } from 'react';
import './css/Profile.css';
import AvatarCropModal from '../Components/AvatarCropModal';
import { AuthContext } from '../Contexts/AuthContext';
import apiClient from '../api/apiClient';
import { mediaUrl } from '../utils/mediaUrl';
import { randomLocalSceneryIndex, sceneryImages, useHeldCrossfade } from '../utils/scenery';
import avatar1 from './css/Avatars/Avatar (1).png';
import avatar2 from './css/Avatars/Avatar (2).png';
import avatar3 from './css/Avatars/Avatar (3).png';
import avatar4 from './css/Avatars/Avatar (4).png';
import avatar5 from './css/Avatars/Avatar (5).png';
import avatar6 from './css/Avatars/Avatar (6).png';
import avatar7 from './css/Avatars/Avatar (7).png';
import avatar8 from './css/Avatars/Avatar (8).png';
import avatar9 from './css/Avatars/Avatar (9).png';
import avatar10 from './css/Avatars/Avatar (10).png';
import avatar11 from './css/Avatars/Avatar (11).png';
import avatar12 from './css/Avatars/Avatar (12).png';
import avatar13 from './css/Avatars/Avatar (13).png';
import avatar14 from './css/Avatars/Avatar (14).png';
import avatar15 from './css/Avatars/Avatar (15).png';
import avatar16 from './css/Avatars/Avatar (16).png';

// Each category switches one or more saved email preferences together.
const MAIL_OPTIONS = [
    {
        key: 'bookings',
        keys: ['booking_added'],
        title: 'Bookings & Updates',
        detail: 'Changes or additions to your itinerary, including flights, stays, reservations, and activities.',
    },
    {
        key: 'countdowns',
        keys: ['trip_reminder', 'trip_wrap'],
        title: 'Countdowns & Summaries',
        detail: 'Upcoming trip countdowns, booking reminders, and post-trip summaries.',
    },
    {
        key: 'expenses',
        keys: ['expense_added'],
        title: 'Expenses & Payments',
        detail: 'Updates on shared trip costs, group payment requests, and settled balances.',
    },
    {
        key: 'social',
        keys: ['friend_request', 'trip_invite'],
        title: 'Invites & Friends',
        detail: 'Trip invitations and friend requests.',
    },
    {
        key: 'chat',
        keys: ['chat_message'],
        title: 'Trip Chat',
        detail: 'An email when someone sends a message on a trip you are on.',
    },
];

const MAIL_PREF_KEYS = MAIL_OPTIONS.flatMap((option) => option.keys);

const defaultMailPrefs = () => Object.fromEntries(MAIL_PREF_KEYS.map((key) => [key, true]));

const readMailPrefs = (data) => Object.fromEntries(
    MAIL_PREF_KEYS.map((key) => [key, data?.[key] !== false])
);

const isMailOptionOn = (prefs, option) => option.keys.some((key) => prefs[key]);

const Profile = () => {
    const { currentUser, updateCurrentUser } = useContext(AuthContext); 
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email] = useState(currentUser?.email || '');
    const [photo, setPhoto] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [editMode, setEditMode] = useState(false); 
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [previewImage, setPreviewImage] = useState(''); 
    const [showErrorPopup, setShowErrorPopup] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [cropSrc, setCropSrc] = useState('');
    const [mailPrefs, setMailPrefs] = useState(defaultMailPrefs);
    const [mailSaving, setMailSaving] = useState('');
    const [startSlide] = useState(() => randomLocalSceneryIndex());
    const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });

    const avatars = [
        avatar1, avatar2, avatar3, avatar4, avatar5,
        avatar6, avatar7, avatar8, avatar9, avatar10,
        avatar11, avatar12, avatar13, avatar14, avatar15, avatar16
    ];
    

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await apiClient.get('/users/profile');
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
                setDateOfBirth(data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '');
            setPhoto(mediaUrl(data.profile_picture) || '');
                setPreviewImage(data.profile_picture || '');
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };

        const fetchMailPrefs = async () => {
            try {
                const { data } = await apiClient.get('/users/email-preferences');
                setMailPrefs(readMailPrefs(data));
            } catch (error) {
                console.error('Error fetching email preferences:', error);
            }
        };

        fetchProfile();
        fetchMailPrefs();
    }, []);

    const toggleMail = async (option) => {
        const turnOn = !isMailOptionOn(mailPrefs, option);
        const next = { ...mailPrefs };
        option.keys.forEach((key) => { next[key] = turnOn; });
        setMailPrefs(next);
        setMailSaving(option.key);
        try {
            const { data } = await apiClient.put('/users/email-preferences', next);
            setMailPrefs(readMailPrefs(data));
        } catch (error) {
            console.error('Error saving email preferences:', error);
            setMailPrefs(mailPrefs);
        } finally {
            setMailSaving('');
        }
    };

    const handleSave = async () => {
        if (!firstName || !lastName) {
            setValidationError('Both first and last name are required.');
            return;
        }
    
        try {
            const response = await apiClient.put('/users/profile', {
                first_name: firstName,
                last_name: lastName,
                date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth || '')) && !String(dateOfBirth).includes('0000') && !String(dateOfBirth).includes('-00')
                    ? String(dateOfBirth).slice(0, 10)
                    : null,
            });
    
            console.log('Profile updated:', response.data);
            setValidationError('');
            setShowSavePopup(true);
            setEditMode(false); 
    
            setTimeout(() => {
                setShowSavePopup(false);
            }, 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setValidationError('Failed to save profile.');
        }
    };

    const handleAvatarSelection = async (selectedAvatar) => {
        try {
            await apiClient.put("/users/profile-picture", {
                avatarUrl: selectedAvatar, 
            });
    
            setPhoto(mediaUrl(selectedAvatar));
            updateCurrentUser?.({ photoURL: mediaUrl(selectedAvatar) });
            const customEvent = new CustomEvent('profilePictureUpdated', {
                detail: { avatarUrl: mediaUrl(selectedAvatar) }
            });
            window.dispatchEvent(customEvent); 
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Failed to update avatar. Please try again.");
        }
    };

    const handleCustomPhoto = async (event) => {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        setCropSrc(URL.createObjectURL(file));
    };

    const uploadCroppedPhoto = async (blob) => {
        setPhotoUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            const response = await apiClient.post('/upload/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = mediaUrl(response.data.profile_picture);
            setPhoto(url);
            updateCurrentUser?.({ photoURL: url });
            window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
                detail: { avatarUrl: url },
            }));
            setShowAvatarModal(false);
            setCropSrc('');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Could not upload that photo. Try a JPG or PNG.');
        } finally {
            setPhotoUploading(false);
        }
    };     
    
    const handleDateChange = (part, value) => {
        const current = String(dateOfBirth || '0000-00-00').slice(0, 10).split('-');
        const year = part === 'year' ? value : (current[0] === '0000' ? '' : current[0]);
        const month = part === 'month' ? value : (current[1] === '00' ? '' : current[1]);
        const day = part === 'day' ? value : (current[2] === '00' ? '' : current[2]);
        setDateOfBirth(`${year || '0000'}-${month || '00'}-${day || '00'}`);
    };

    const displayName = `${firstName} ${lastName}`.trim() || 'Your profile';

    return (
        <div className="profile-page">
            <div className="profile-carousel" aria-hidden="true" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
                {sceneryImages.map((image, index) => (
                    <div
                        key={image}
                        className={`profile-carousel-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))}
            </div>
        <div className="profile-shell">
            <section className="profile-card profile-identity">
                <img
                    src={photo || avatar1}
                    alt="Profile"
                    className="profile-page-picture"
                />
                <h1>{displayName}</h1>
                <p>{email}</p>
                <button
                    type="button"
                    className="change-picture-button"
                    onClick={() => setShowAvatarModal(true)}
                >
                    Change Photo
                </button>
            </section>

            {/* Avatar Selection Modal */}
            {showAvatarModal && (
                <div className="avatar-selection-modal">
                    <h3>Select Your Avatar</h3>
                    <div className="avatar-grid">
                        {avatars.map((avatar, index) => (
                            <img
                                key={index}
                                src={avatar}
                                alt={`Avatar ${index + 1}`}
                                className={`avatar-icon ${
                                    avatar === photo ? "selected" : ""
                                }`}
                                onClick={() => handleAvatarSelection(avatar)}
                            />
                        ))}
                        {currentUser?.googlePhotoURL ? (
                            <img
                                src={currentUser.googlePhotoURL}
                                alt="Google Profile"
                                title="Google Profile"
                                className={`avatar-icon google-avatar ${
                                    photo === currentUser.googlePhotoURL ? "selected" : ""
                                }`}
                                onClick={() => handleAvatarSelection(currentUser.googlePhotoURL)}
                            />
                        ) : null}
                    </div>
                    <div className="avatar-modal-actions">
                    <button
                        className="close-modal"
                        onClick={() => setShowAvatarModal(false)}
                    >
                        Close
                    </button>
                    <label className="upload-photo-label">
                        {photoUploading ? 'Uploading...' : 'Upload Photo'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomPhoto}
                            hidden
                            disabled={photoUploading}
                        />
                    </label>
                    </div>
                </div>
            )}

            {cropSrc ? (
                <AvatarCropModal
                    imageSrc={cropSrc}
                    onCancel={() => setCropSrc('')}
                    onConfirm={uploadCroppedPhoto}
                />
            ) : null}

            <section className="profile-card profile-details">
            <h2>Account</h2>
            <div className="profile-form-container">
                <div className="form-group">
                    <label htmlFor="first-name">First Name</label>
                    <input
                        type="text"
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={editMode ? '' : 'greyed-out'}
                        disabled={!editMode}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="last-name">Last Name</label>
                    <input
                        type="text"
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={!editMode ? 'greyed-out' : ''}
                        disabled={!editMode}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        className="greyed-out"
                        disabled
                        readOnly
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="date-of-birth">Date of Birth</label>
                    <div className="dob-picker">
                        <select
                            aria-label="Birth month"
                            disabled={!editMode}
                            className={!editMode ? 'greyed-out' : ''}
                            value={(() => {
                                const month = String(dateOfBirth || '').slice(5, 7);
                                return month === '00' ? '' : month;
                            })()}
                            onChange={(event) => handleDateChange('month', event.target.value)}
                        >
                            <option value="">Month</option>
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, index) => {
                                const value = String(index + 1).padStart(2, '0');
                                return <option key={value} value={value}>{name}</option>;
                            })}
                        </select>
                        <select
                            aria-label="Birth day"
                            disabled={!editMode}
                            className={!editMode ? 'greyed-out' : ''}
                            value={(() => {
                                const day = String(dateOfBirth || '').slice(8, 10);
                                return day === '00' ? '' : day;
                            })()}
                            onChange={(event) => handleDateChange('day', event.target.value)}
                        >
                            <option value="">Day</option>
                            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => (
                                <option key={day} value={day}>{Number(day)}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Birth year"
                            disabled={!editMode}
                            className={!editMode ? 'greyed-out' : ''}
                            value={(() => {
                                const year = String(dateOfBirth || '').slice(0, 4);
                                return year === '0000' ? '' : year;
                            })()}
                            onChange={(event) => handleDateChange('year', event.target.value)}
                        >
                            <option value="">Year</option>
                            {Array.from({ length: 90 }, (_, index) => String(new Date().getFullYear() - 12 - index)).map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Edit/Save Buttons Side by Side */}
                <div className="button-group">
                    <button onClick={() => setEditMode(true)} className="edit-button">
                        Edit
                    </button>
                    <button onClick={handleSave} className="save-button" disabled={!editMode}>
                        Save
                    </button>
                </div>

                {/* Validation Error */}
                {validationError && <p className="error-message">{validationError}</p>}
                {showSavePopup && <div className="save-popup">Profile saved.</div>}
                {showErrorPopup && <div className="error-popup">Could not update that photo.</div>}
            </div>
            </section>

            <section className="profile-card profile-mail">
                <h2>Email Alerts</h2>
                <p className="mail-lead">
                    Choose which updates also arrive by email.
                </p>
                {MAIL_OPTIONS.map((option) => (
                    <div className="mail-row" key={option.key}>
                        <div>
                            <strong>{option.title}</strong>
                            <span>{option.detail}</span>
                        </div>
                        <button
                            type="button"
                            className={`mail-switch${isMailOptionOn(mailPrefs, option) ? ' is-on' : ''}`}
                            aria-pressed={isMailOptionOn(mailPrefs, option)}
                            aria-label={option.title}
                            disabled={mailSaving === option.key}
                            onClick={() => toggleMail(option)}
                        >
                            <span />
                        </button>
                    </div>
                ))}
            </section>
        </div>
        </div>
    );
};

export default Profile;
