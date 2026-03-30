import React from 'react';
import './WelcomeScreen.css';

function WelcomeScreen({ onEnter }) {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="welcome-container">
      <div className="background-shapes welcome-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="welcome-card">
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome to the Smart Voting Experience</h1>
          <div className="welcome-divider"></div>
        </div>

        <div className="welcome-content">
          <p className="welcome-subtitle">
            Thank you for being a part of democracy
          </p>
          
          <div className="booth-info">
            <div className="booth-detail">
              <span className="label">Booth Name:</span>
              <span className="value">Voting Booth - Mananthavady</span>
            </div>
            <div className="booth-detail">
              <span className="label">Date:</span>
              <span className="value">{dateString}</span>
            </div>
          </div>

          <button className="welcome-btn" onClick={onEnter}>
            GET STARTED ✨
          </button>
        </div>

        <p className="welcome-footer">Create your voting caricature now!</p>
      </div>
    </div>
  );
}

export default WelcomeScreen;
