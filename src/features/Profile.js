import React, { useState, useContext } from 'react';
import './css/Profile.css';
import { AuthContext } from '../Contexts/AuthContext';
import Cropper from 'react-easy-crop';
import ReactModal from 'react-modal';

const Profile = () => {
    const { currentUser, updateUserProfile } = useContext(AuthContext);
    const [firstName, setFirstName] = useState(currentUser?.displayName?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(currentUser?.displayName?.split(' ')[1] || '');
    const [email] = useState(currentUser?.email || '');
    const [photo, setPhoto] = useState(currentUser?.photoURL || '');
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [previewImage, setPreviewImage] = useState(photo);
    const [croppedArea, setCroppedArea] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);

    const handleSave = () => {
        if (!firstName || !lastName) {
            setValidationError('Both first and last name are required.');
            return;
        }

        updateUserProfile({ firstName, lastName, photo: previewImage });
        setValidationError('');
        setShowSavePopup(true);

        setTimeout(() => {
            setShowSavePopup(false);
        }, 3000);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result); // Open the cropping modal
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedAreaPercentage, croppedAreaPixels) => {
        setCroppedArea(croppedAreaPixels);
    };

    const handleCropConfirm = () => {
        // Convert the cropped area into a canvas to get the final image
        const image = new Image();
        image.src = imageToCrop;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = croppedArea.width;
        canvas.height = croppedArea.height;
        ctx.drawImage(
            image,
            croppedArea.x, croppedArea.y,
            croppedArea.width, croppedArea.height,
            0, 0, canvas.width, canvas.height
        );
        setPreviewImage(canvas.toDataURL('image/jpeg'));
        setShowCropModal(false); // Close the modal
    };

    const handleCancelCrop = () => {
        setShowCropModal(false);
    };

    return (
        <div className="profile-container">
            {/* Enlarged Profile Picture */}
            <div className="profile-picture-container">
                <img src={previewImage} alt="Profile" className="profile-picture" />
                <input type="file" accept="image/*" id="file-upload" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <button className="edit-button" onClick={() => document.getElementById('file-upload').click()}>Edit</button>
            </div>

            {/* User Information Form */}
            <div className="profile-form-container">
                <div className="form-group">
                    <label htmlFor="first-name">First Name</label>
                    <input
                        type="text"
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={firstName === '' && validationError ? 'input-error' : ''}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="last-name">Last Name</label>
                    <input
                        type="text"
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={lastName === '' && validationError ? 'input-error' : ''}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} disabled />
                </div>

                {/* Save Button */}
                <button onClick={handleSave} className="save-button">Save</button>

                {/* Validation Error Message */}
                {validationError && <p className="error-message">{validationError}</p>}
            </div>

            {/* Save Popup */}
            {showSavePopup && <div className="save-popup">Profile Saved Successfully!</div>}

            {/* Image Cropping Modal */}
            <ReactModal isOpen={showCropModal} onRequestClose={handleCancelCrop} className="crop-modal">
                <div className="crop-container">
                    <Cropper
                        image={imageToCrop}
                        cropShape="round"
                        aspect={1}
                        onCropComplete={handleCropComplete}
                        cropSize={{ width: 150, height: 150 }}
                    />
                    <div className="crop-buttons">
                        <button onClick={handleCropConfirm}>Confirm</button>
                        <button onClick={handleCancelCrop}>Cancel</button>
                    </div>
                </div>
            </ReactModal>
        </div>
    );
};

export default Profile;
