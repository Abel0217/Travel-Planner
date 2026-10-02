import React, { useState } from 'react';
import apiClient from '../../api/apiClient';
import './css/Upload.css';

function UploadFile({
  onExtractedData,
  bookingType = 'flight',
  compact = false,
  buttonLabel = 'Upload Confirmation',
  hint = '',
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setError('');
    setStatus('Reading your file...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookingType', bookingType);

      const response = await apiClient.post('/upload/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fields = response.data.fields || {};
      if (onExtractedData) onExtractedData(fields);
      setStatus(response.data.message || 'Filled what we could. Add anything missing, then save.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not read that file. Try a clearer photo or PDF.');
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const inputId = `file-upload-${bookingType}`;

  return (
    <div className={`upload-container ${compact ? 'compact' : ''}`}>
      {hint ? <p className="upload-hint">{hint}</p> : null}
      <div className="upload-button-container">
        <label htmlFor={inputId} className="upload-button">
          {isLoading ? 'Reading...' : buttonLabel}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        {selectedFile ? <span className="file-name">{selectedFile.name}</span> : null}
      </div>
      {isLoading ? (
        <div className="loading-message">
          Processing file...
          <div className="loading-spinner"></div>
        </div>
      ) : null}
      {status ? <p className="upload-status">{status}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
    </div>
  );
}

export default UploadFile;
