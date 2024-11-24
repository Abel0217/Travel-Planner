import React, { useState, useContext, useEffect } from 'react';
import './css/Profile.css';
import { AuthContext } from '../Contexts/AuthContext';
import apiClient from '../api/apiClient';
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
                setDateOfBirth(data.date_of_birth || '');
                setPhoto(data.profile_picture || '');
                setPreviewImage(data.profile_picture || '');
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };

        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!firstName || !lastName) {
            setValidationError('Both first and last name are required.');
            return;
        }
    
        try {
            const response = await apiClient.put('/users/profile', {
                first_name: firstName,
                last_name: lastName
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
    
            setPhoto(selectedAvatar); 
            const customEvent = new CustomEvent('profilePictureUpdated', {
                detail: { avatarUrl: selectedAvatar }
            });
            window.dispatchEvent(customEvent); 
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Failed to update avatar. Please try again.");
        }
    };     
    
    const handleDateChange = (e) => {
        const input = e.target.value;
        const currentDate = new Date().toISOString().split("T")[0]; 
        const formattedInput = input
            .replace(/[^0-9]/g, "")
            .replace(/(\d{4})(\d{2})?(\d{2})?/, "$1-$2-$3")
            .slice(0, 10);

        if (formattedInput <= currentDate) {
            setDateOfBirth(formattedInput);
        }
    };

    return (
        <div className="profiles-container">
            {/* Profile Picture Section */}
            <div className="profile-page-picture-container">
                <img
                    src={photo || './css/Avatars/Avatar (1).png'}
                    alt="Profile"
                    className="profile-page-picture"
                />
                <button
                    className="change-picture-button"
                    onClick={() => setShowAvatarModal(true)}
                >
                    Change Profile Picture
                </button>
            </div>

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
                    </div>
                    <button
                        className="close-modal"
                        onClick={() => setShowAvatarModal(false)}
                    >
                        Close
                    </button>
                </div>
            )}

            {/* User Information Form */}
            <div className="profile-form-container">
                <div className="form-group">
                    <label htmlFor="first-name">First Name</label>
                    <input
                        type="text"
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={!editMode ? 'greyed-out' : ''}
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
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="date-of-birth">Date of Birth</label>
                    <input
                        type="text"
                        id="date-of-birth"
                        value={dateOfBirth}
                        placeholder="yyyy-mm-dd"
                        onChange={handleDateChange}
                        className={!editMode ? 'greyed-out' : ''}
                        disabled={!editMode}
                    />
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
            </div>

            {/* Save Popup */}
            {showSavePopup && <div className="save-popup">Profile Picture Updated Successfully!</div>}

            {/* Error Popup */}
            {showErrorPopup && <div className="error-popup">Failed to Update Profile Picture.</div>}
        </div>
    );
};

export default Profile;
