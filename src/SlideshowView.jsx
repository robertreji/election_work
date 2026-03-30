import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SlideshowView.css';

function SlideshowView({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const carouselRef = useRef(null);

  // Navigation with smooth wrapping
  const goToPrevious = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, []);

  const goToNext = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  // Handle infinite loop wraparound
  useEffect(() => {
    if (!isTransitioning || carouselRef.current === null) return;

    const handleTransitionEnd = () => {
      setIsTransitioning(false);
      setCurrentIndex((prev) => {
        if (prev <= 0) return images.length;
        if (prev > images.length) return 1;
        return prev;
      });
    };

    const carousel = carouselRef.current;
    carousel.addEventListener('transitionend', handleTransitionEnd);
    return () => carousel.removeEventListener('transitionend', handleTransitionEnd);
  }, [isTransitioning, images.length]);

  // Autoplay
  useEffect(() => {
    if (!isAutoPlay || images.length === 0) return;

    const timer = setInterval(goToPrevious, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlay, goToPrevious, images.length]);

  // Keyboard
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key === 'ArrowLeft') return goToPrevious();
      if (e.key === 'ArrowRight') return goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setIsAutoPlay((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious, onClose]);

  if (images.length === 0) {
    return (
      <div className="slideshow-container">
        <p>No Images</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div
      className="carousel-fullscreen"
      onMouseMove={() => setShowUI(true)}
      onMouseLeave={() => setTimeout(() => setShowUI(false), 3000)}
    >
      {/* 🎯 CAROUSEL TRACK */}
      <div
        ref={carouselRef}
        className="carousel-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning ? 'transform 0.6s ease-in-out' : 'none',
        }}
      >
        {/* Duplicate last image at start for infinite loop */}
        <div className="carousel-slide">
          <img
            src={`http://localhost:3001${images[images.length - 1].url}`}
            alt={`slide-duplicate`}
            className="carousel-image"
          />
        </div>

        {/* All images */}
        {images.map((img, index) => (
          <div className="carousel-slide" key={index}>
            <img
              src={`http://localhost:3001${img.url}`}
              alt={`slide-${index}`}
              className="carousel-image"
            />
          </div>
        ))}

        {/* Duplicate first image at end for infinite loop */}
        <div className="carousel-slide">
          <img
            src={`http://localhost:3001${images[0].url}`}
            alt={`slide-duplicate`}
            className="carousel-image"
          />
        </div>
      </div>

      {/* Arrows */}
      <button className="carousel-btn prev" onClick={goToPrevious}>
        ◀
      </button>

      <button className="carousel-btn next" onClick={goToNext}>
        ▶
      </button>

      {/* Controls */}
      <div className={`carousel-ui ${showUI ? 'show' : 'hide'}`}>
        <div className="top-bar">
          <button onClick={onClose}>✕</button>
        </div>
      </div>
    </div>
  );
}

export default SlideshowView;