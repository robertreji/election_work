// Template Generator - Creates a Polaroid-style frame with logos and quote

export const generateTemplate = async (caricatureBase64, voterType, voterMessage) => {
  return new Promise((resolve, reject) => {
    try {
      // Create main canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');

      // Background color
      ctx.fillStyle = '#E6E0D4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load caricature image
      const img = new Image();
      img.onload = () => {
        // Draw decorative background (semi-transparent overlay)
        ctx.fillStyle = 'rgba(173, 160, 140, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Polaroid-style frame
        const frameX = 150;
        const frameY = 100;
        const frameWidth = 900;
        const frameHeight = 850;

        // White frame background
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;
        ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
        ctx.shadowColor = 'transparent';

        // Draw caricature in frame
        const imgX = frameX + 50;
        const imgY = frameY + 50;
        const imgWidth = frameWidth - 100;
        const imgHeight = 600;

        // Create rounded corners for image
        const radioRadius = 15;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imgX + radioRadius, imgY);
        ctx.lineTo(imgX + imgWidth - radioRadius, imgY);
        ctx.quadraticCurveTo(imgX + imgWidth, imgY, imgX + imgWidth, imgY + radioRadius);
        ctx.lineTo(imgX + imgWidth, imgY + imgHeight - radioRadius);
        ctx.quadraticCurveTo(imgX + imgWidth, imgY + imgHeight, imgX + imgWidth - radioRadius, imgY + imgHeight);
        ctx.lineTo(imgX + radioRadius, imgY + imgHeight);
        ctx.quadraticCurveTo(imgX, imgY + imgHeight, imgX, imgY + imgHeight - radioRadius);
        ctx.lineTo(imgX, imgY + radioRadius);
        ctx.quadraticCurveTo(imgX, imgY, imgX + radioRadius, imgY);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        ctx.restore();

        // Draw bottom text section
        const textY = frameY + 700;
        
        // "Thanks for Voting" text
        ctx.fillStyle = '#3C3C3C';
        ctx.font = 'bold 48px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Thanks for Voting!', frameX + frameWidth / 2, textY + 80);

        // Draw top logos section
        const logoY = 40;
        const logoSize = 60;
        const logoSpacing = canvas.width / 4;

        // Voting Logo (left)
        drawLogo(ctx, logoSpacing - 60, logoY, logoSize, 'VOTING', '#FFDE00');

        // Election Commission Logo (center)
        drawLogo(ctx, logoSpacing * 2 - 60, logoY, logoSize, 'ELECTION', '#FF69B4');

        // College Logo (right)
        drawLogo(ctx, logoSpacing * 3 - 60, logoY, logoSize, 'COLLEGE', '#00E5FF');

        // Draw voter type quote below the message
        ctx.fillStyle = '#555555';
        ctx.font = '18px "Arial", sans-serif';
        ctx.textAlign = 'center';
        const quoteY = frameY + frameHeight + 50;
        ctx.fillText(`"${voterMessage}"`, canvas.width / 2, quoteY);

        // Convert to base64 and resolve
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        }, 'image/png');
      };

      img.onerror = () => {
        reject(new Error('Failed to load caricature image'));
      };

      img.src = caricatureBase64;
    } catch (error) {
      reject(error);
    }
  });
};

const drawLogo = (ctx, x, y, size, text, color) => {
  // Draw circular logo background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size / 2, y + size / 2);
};

export const VOTER_MESSAGES = {
  'normal': 'Your Voice Matters. Thank You for Voting!',
  'first-of-day': 'You are the First Voter! Proud Moment!',
  'first-time': 'Congratulations, Your First Vote - A Proud Beginning'
};
