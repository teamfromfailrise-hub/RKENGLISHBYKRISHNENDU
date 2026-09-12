'use client';
import { useState } from 'react';
import CropStage from './CropStage';

// Renders nothing until `image` (an HTMLImageElement) is provided by the parent.
// Calls onDone(text) with the OCR'd text, or onDone(null, errorMessage) if reading failed.
export default function ScanCropModal({ image, onDone, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('Reading the text…');

  async function handleCropped(canvas) {
    setBusy(true);
    setLabel('Reading the text…');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(canvas.toDataURL('image/png'), 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setLabel('Reading the text… ' + Math.round(m.progress * 100) + '%');
        }
      });
      onDone(result.data.text.trim());
    } catch (e) {
      onDone(null, 'Could not read the photo clearly — please type the writing, or try a clearer, well-lit photo.');
    }
  }

  return <CropStage image={image} busy={busy} busyLabel={label} onConfirm={handleCropped} onCancel={onCancel} />;
}
