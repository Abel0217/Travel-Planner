import React from 'react';
import './css/Loading.css';

const Loading = () => {
    return (
        <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );
};

export default Loading;
