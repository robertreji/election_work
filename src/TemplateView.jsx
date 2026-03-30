import React from 'react';
import './TemplateView.css';

const TemplateView = React.forwardRef(({ caricatureImage, voterType, voterMessage }, ref) => {
  const messageMap = {
    'normal': 'Ink on my finger, pride in my heart.',
    'first-of-day': 'You are the First Voter! Proud Moment!',
    'first-time': 'Ink on my finger, pride in my heart.'
  };

  return (
    <div ref={ref} className="template-container">
      {/* Poster Background with Caricature */}
      <div className="poster">
        {/* Caricature Image - Absolutely Positioned */}
        {caricatureImage && (
          <div className="caricature-box">
            <img src={caricatureImage} alt="Your Caricature" className="caricature-img" />
          </div>
        )}
        
        {/* Message Below Caricature */}
        {voterType && (
          <div className="voter-message">
            <p>{messageMap[voterType]}</p>
          </div>
        )}
      </div>
    </div>
  );
});

TemplateView.displayName = 'TemplateView';

export default TemplateView;
