import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateCaricatureDirectly, DEFAULT_IMAGEN_PROMPT } from './geminiService';
import TemplateView from './TemplateView';
import WelcomeScreen from './WelcomeScreen';
import SlideshowView from './SlideshowView';
import './App.css';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showVoterSelection, setShowVoterSelection] = useState(false);
  const [voterType, setVoterType] = useState(null); // 'normal', 'first-of-day', 'first-time'
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [caricature, setCaricature] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, analyzing, drawing, done, error
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const templateRef = useRef(null);

  // Debug State
  const [showDebug, setShowDebug] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [imagenPrompt, setImagenPrompt] = useState(DEFAULT_IMAGEN_PROMPT);
  const [pdfFileName, setPdfFileName] = useState('voting-caricature');

  // Slideshow State
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  
  // Poster Template State
  const [posterBase64, setPosterBase64] = useState(null);

  const fileInputRef = useRef(null);

  const pushLog = (logEntry) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), ...logEntry }]);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
        setCaricature(null);
        setStatus('idle');
        setErrorMsg('');
        setTokenUsage(0);
        setLogs([]);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    if (!voterType) {
      setShowVoterSelection(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setPhoto(null);
      setCaricature(null);
      setStatus('idle');
      setErrorMsg('');
      setTokenUsage(0);
      setLogs([]);
    } catch (err) {
      console.error("Camera access denied", err);
      setErrorMsg("Could not access camera. Please allow permissions.");
      setStatus('error');
    }
  };;

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      // Flip image horizontally since webcam is usually mirrored
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      setShowCountdown(true);
      setCountdown(3);
      stopCamera();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Timer for loading counter
  useEffect(() => {
    let interval;
    if (status === 'generating') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Countdown effect
  useEffect(() => {
    let interval;
    if (showCountdown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && showCountdown) {
      setShowCountdown(false);
      setCountdown(3);
    }
    return () => clearInterval(interval);
  }, [showCountdown, countdown]);

  // Load images from API on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/images');
        if (response.ok) {
          const images = await response.json();
          setGeneratedImages(images);
        }
      } catch (err) {
        console.error("Failed to load images from API:", err);
      }
    };
    loadImages();
  }, []);

  // Load poster template image on mount
  useEffect(() => {
    const loadPosterTemplate = async () => {
      try {
        const response = await fetch('/images/poster01.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setPosterBase64(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Failed to load poster template:", err);
      }
    };
    loadPosterTemplate();
  }, []);

  // Save image to file system via API
  const saveGeneratedImage = useCallback(async (caricatureData) => {
    try {
      const payload = {
        data: caricatureData,
        voterType: voterType,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('http://localhost:3001/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Reload images from API
        const imagesResponse = await fetch('http://localhost:3001/api/images');
        if (imagesResponse.ok) {
          const updatedImages = await imagesResponse.json();
          setGeneratedImages(updatedImages);
        }
      } else {
        console.error('Failed to save image:', await response.text());
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    }
  }, [voterType]);

  const downloadImage = async (format = 'pdf') => {
    if (!templateRef.current && !caricature) return;
    try {
      const defaultFilename = templateRef.current ? 'voting-caricature' : 'election-caricature';

      if (format === 'pdf') {
        // Download as PDF with filename dialog
        if (templateRef.current) {
          const canvas = await html2canvas(templateRef.current, {
            backgroundColor: '#E6E0D4',
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });

          // Get canvas dimensions
          const imgSize = canvas.width > canvas.height ? 'landscape' : 'portrait';
          const pdf = new jsPDF({
            orientation: imgSize === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: 'a4'
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate dimensions maintaining aspect ratio
          const imgWidth = pdfWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          const imgData = canvas.toDataURL('image/png');
          const yPosition = (pdfHeight - imgHeight) / 2;
          
          pdf.addImage(imgData, 'PNG', 10, Math.max(10, yPosition), imgWidth, imgHeight);
          
          // Ask user for filename
          if (window.showSaveFilePicker) {
            try {
              const fileHandle = await window.showSaveFilePicker({
                suggestedName: `${pdfFileName}.pdf`,
                types: [{
                  description: 'PDF Document',
                  accept: { 'application/pdf': ['.pdf'] },
                }],
              });
              const writableStream = await fileHandle.createWritable();
              await writableStream.write(pdf.output('blob'));
              await writableStream.close();
            } catch (err) {
              if (err.name !== 'AbortError') {
                // Fallback if dialog is cancelled or not supported
                pdf.save(`${pdfFileName}.pdf`);
              }
            }
          } else {
            // Fallback: Use pdfFileName from state
            pdf.save(`${pdfFileName}.pdf`);
          }
        } else {
          // Fallback: create PDF from base64 image
          const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
          });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(caricature, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20);
          pdf.save(`${pdfFileName}.pdf`);
        }
      } else {
        // Download as PNG (original functionality)
        let blob;

        if (templateRef.current) {
          const canvas = await html2canvas(templateRef.current, {
            backgroundColor: '#E6E0D4',
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } else {
          const mimeMatch = caricature.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const base64Data = caricature.includes(',') ? caricature.split(',')[1] : caricature;
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          blob = new Blob(byteArrays, { type: mimeType });
        }
        
        if (window.showSaveFilePicker) {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${defaultFilename}.png`,
            types: [{
              description: 'Caricature Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(blob);
          await writableStream.close();
        } else {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${defaultFilename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Download failed", e);
      }
    }
  };

  const startGeneration = async () => {
    if (!photo || !posterBase64) return;
    try {
      setElapsedTime(0);
      setStatus('generating');
      const resultImageBase64 = await generateCaricatureDirectly(photo, posterBase64, pushLog, imagenPrompt);
      
      setCaricature(resultImageBase64);
      setStatus('done');
      setShowFinalMessage(true);
      // Template will be captured and saved in useEffect below
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setStatus('error');
    }
  };

  // Capture and save template when final message is shown
  useEffect(() => {
    if (showFinalMessage && templateRef.current && status === 'done') {
      const captureTemplate = async () => {
        try {
          const canvas = await html2canvas(templateRef.current, {
            backgroundColor: '#E6E0D4',
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          const templateImage = canvas.toDataURL('image/png');
          await saveGeneratedImage(templateImage);
        } catch (err) {
          console.error('Failed to capture template:', err);
        }
      };
      
      // Wait a moment for template to fully render
      const timer = setTimeout(captureTemplate, 500);
      return () => clearTimeout(timer);
    }
  }, [showFinalMessage, status, saveGeneratedImage]);

  if (showWelcome) {
    return <WelcomeScreen onEnter={() => {
      setShowWelcome(false);
      setShowVoterSelection(true);
    }} />;
  }

  if (showVoterSelection) {
    const voterOptions = [
      {
        id: 'normal',
        title: 'Normal Voter'
      },
      {
        id: 'first-of-day',
        title: 'First Voter of the Day'},
      {
        id: 'first-time',
        title: 'First Time Voter',
      }
    ];

    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return (
      <div className="app-container">
        <div className="background-shapes">
          <img src="/images/sideimg1.png" alt="shape-1" className="shape shape-1" />
          <img src="/images/sideimg2.png" alt="shape-2" className="shape shape-2" />
          <img src="/images/sideimg3.png" alt="shape-3" className="shape shape-3" />
        </div>

        <div className="voter-selection-card">
          <h1 className="voter-selection-title">Select Voter Type</h1>
          <div className="voter-selection-divider"></div>

          <div className="voter-options">
            {voterOptions.map(option => (
              <button
                key={option.id}
                className="voter-option-btn"
                onClick={() => {
                  setVoterType(option.id);
                  setShowVoterSelection(false);
                }}
              >
                <span className="voter-option-title">{option.title}</span>
                <span className="voter-option-message">{option.message}</span>
              </button>
            ))}
          </div>

          <div className="voter-selection-info">
            <p className="voter-info-label">Booth Name: Voting Booth - Mananthavady</p>
            <p className="voter-info-label">Date: {dateString}</p>
          </div>

          <button
            className="voter-back-btn"
            onClick={() => {
              setShowVoterSelection(false);
              setShowWelcome(true);
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (showFinalMessage && voterType) {
    const messageMap = {
      'normal': 'Your Voice Matters. Thank You for Voting!',
      'first-of-day': 'You are the First Voter! Proud Moment!',
      'first-time': 'Congratulations, Your First Vote - A Proud Beginning'
    };

    return (
      <div className="app-container">
        <div className="background-shapes">
          <img src="/images/sideimg1.png" alt="shape-1" className="shape shape-1" />
          <img src="/images/sideimg2.png" alt="shape-2" className="shape shape-2" />
          <img src="/images/sideimg3.png" alt="shape-3" className="shape shape-3" />
        </div>

        <div className="final-message-card">
          <div className="caricature-display">
            {caricature && (
              <TemplateView
                ref={templateRef}
                caricatureImage={caricature}
                voterType={voterType}
                voterMessage={messageMap[voterType]}
              />
            )}
          </div>

          <div className="pdf-filename-section">
            <label htmlFor="pdf-filename">PDF File Name</label>
            <input
              id="pdf-filename"
              type="text"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              placeholder="Enter PDF filename"
              className="pdf-filename-input"
            />
          </div>

          <div className="final-message-actions">
            <button
              onClick={() => downloadImage('pdf')}
              className="action-btn download-action-btn"
            >
              📄 Download PDF
            </button>
            <button
              onClick={() => downloadImage('png')}
              className="action-btn download-action-btn"
            >
              🖼️ Download PNG
            </button>
            <button
              onClick={() => {
                setShowFinalMessage(false);
                setVoterType(null);
                setPhoto(null);
                setCaricature(null);
                setStatus('idle');
                setPdfFileName('voting-caricature');
              }}
              className="action-btn new-action-btn"
            >
              ➕ Create Another
            </button>
            <button
              onClick={() => setShowSlideshow(true)}
              className="action-btn gallery-action-btn"
              title={`View ${generatedImages.length} saved caricatures`}
            >
              🎬 Slideshow ({generatedImages.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSlideshow) {
    return <SlideshowView images={generatedImages} onClose={() => setShowSlideshow(false)} />;
  }

  return (
    <div className="app-container">
      <div className="background-shapes">
        <img src="/images/sideimg1.png" alt="shape-1" className="shape shape-1" />
        <img src="/images/sideimg2.png" alt="shape-2" className="shape shape-2" />
        <img src="/images/sideimg3.png" alt="shape-3" className="shape shape-3" />
      </div>

      <main className="main-content">
        <header>
          <div className="header-left">
            <h1>Vote & Smile!</h1>
            <p>Get your digital caricature instantly after you cast your vote.</p>
          </div>
          <button 
            className="gallery-btn"
            onClick={() => setShowSlideshow(true)}
            title={`View ${generatedImages.length} saved caricatures`}
          >
            🎬 Gallery
            <span className="gallery-count">{generatedImages.length}</span>
          </button>
        </header>

        <div className="workspace">
          <div className="photo-section">
            
            <div className="input-options">
              <button className="option-btn" onClick={() => fileInputRef.current.click()}>
                📁 Upload Photo
              </button>
              <button className={`option-btn ${isCameraOpen ? 'active' : ''}`} onClick={isCameraOpen ? stopCamera : startCamera}>
                {isCameraOpen ? '❌ Cancel Camera' : '📸 Use Webcam'}
              </button>
            </div>

            {isCameraOpen ? (
              <div className="camera-box">
                <video ref={videoRef} autoPlay playsInline className="video-preview" style={{ transform: 'scaleX(-1)' }}></video>
                <button className="capture-btn" onClick={capturePhoto}>SNAP PHOTO 📸</button>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>
            ) : (
              <div 
                className={`upload-box ${photo ? 'has-image' : ''}`}
                onClick={() => !photo && fileInputRef.current.click()}
              >
                {status === 'generating' ? (
                  <div className="loader-container">
                    <div className="spinner"></div>
                    <p className="loading-text">
                      Generating in Progress...
                    </p>
                  </div>
                ) : caricature && status === 'done' ? (
                  <>
                    <img src={caricature} alt="Caricature" className="preview-image" />
                    <button className="remove-photo-btn" onClick={(e) => { e.stopPropagation(); setCaricature(null); setPhoto(null); setStatus('idle'); }}>Back to Upload</button>
                  </>
                ) : photo ? (
                  <>
                    <img src={photo} alt="Original" className="preview-image" />
                    <button className="remove-photo-btn" onClick={(e) => { e.stopPropagation(); setPhoto(null); }}>Discard Photo</button>
                  </>
                ) : (
                  <div className="upload-placeholder">
                    <span className="icon">⬇️</span>
                    <span>Drag & Drop or Click to Upload</span>
                  </div>
                )}
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              style={{ display: 'none' }} 
            />
            
            <button 
              className={`generate-btn ${status !== 'idle' && status !== 'done' && status !== 'error' ? 'loading' : ''}`}
              onClick={startGeneration}
              disabled={!photo || (status !== 'idle' && status !== 'done' && status !== 'error')}
            >
              {status === 'idle' || status === 'error' ? 'DRAW MY CARICATURE ✨' : 
               status === 'generating' ? 'CREATING CARICATURE...' : 'MAKE ANOTHER!'}
            </button>
            
            {status === 'error' && (
              <div className="error-message">{errorMsg}</div>
            )}
          </div>

          {caricature && status === 'done' && (
            <div className={`result-section fade-in`}>
              <button onClick={downloadImage} className="option-btn download-btn">
                💾 Save Image
              </button>
            </div>
          )}
        </div>
      </main>

      <div className={`debug-panel ${showDebug ? 'open' : ''}`}>
        <button className="debug-toggle" onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? 'Hide Debug Info ▲' : 'Show Debug Info ▼'}
        </button>
        
        {showDebug && (
          <div className="debug-content">
            <div className="debug-stats">
              <div className="stat-card">
                <span className="stat-label">Tokens Used</span>
                <span className="stat-value">{tokenUsage}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total API Calls</span>
                <span className="stat-value">{logs.length / 2}</span>
              </div>
            </div>
            
            <div className="debug-prompts">
              <h3>Edit Prompts</h3>
              <div className="prompt-editor">
                <label>Caricature Generation Prompt</label>
                <textarea value={imagenPrompt} onChange={(e) => setImagenPrompt(e.target.value)} rows="12"></textarea>
              </div>
              <button 
                className="option-btn" 
                style={{ marginTop: '0.5rem', alignSelf: 'flex-start', padding: '0.5rem 1rem', flex: 'none' }} 
                onClick={() => { setImagenPrompt(DEFAULT_IMAGEN_PROMPT); }}
              >
                Reset to Defaults
              </button>
            </div>

            <div className="debug-logs">
              <h3>API Query Logs</h3>
              {logs.length === 0 ? <p>No logs yet.</p> : (
                <ul className="log-list">
                  {logs.map((log, index) => (
                    <li key={index} className="log-item">
                      <span className="log-time">{log.time}</span>
                      <span className="log-endpoint">{log.endpoint}</span>
                      <pre className="log-data">{JSON.stringify(log.request || log.response, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {showCountdown && (
        <div className="countdown-overlay">
          <div className="countdown-card">
            <div className="countdown-section">
              <p className="countdown-label">Preparing captured image...</p>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>

            <div className="countdown-section ready-section">
              <p className="get-ready">Get ready!</p>
            </div>

            <div className="countdown-timer">
              <span className="countdown-number">{countdown > 0 ? countdown : 'GO!'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
