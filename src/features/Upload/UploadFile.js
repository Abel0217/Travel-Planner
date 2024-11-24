import React, { useState } from 'react';
import './css/Upload.css';

function UploadFile({ onExtractedData }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        if (file) {
            handleUpload(file);
        }
    };

    const handleUpload = (file) => {
        setIsLoading(true); 
        setTimeout(() => {
            setIsLoading(false); 
            console.log('Uploading file:', file);
            if (onExtractedData) {
                onExtractedData({ airline: "Sample Airline", flightNumber: "12345" });
            }
        }, 2000);
    };

    return (
        <div className="upload-container">
            <div className="upload-button-container">
                <label htmlFor="file-upload" className="upload-button">
                    Choose File
                </label>
                <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                />
                {selectedFile && <span className="file-name">{selectedFile.name}</span>}
            </div>

            {isLoading && (
                <div className="loading-message">
                    Processing file...
                    <div className="loading-spinner"></div>
                </div>
            )}
        </div>
    );
}

export default UploadFile;
