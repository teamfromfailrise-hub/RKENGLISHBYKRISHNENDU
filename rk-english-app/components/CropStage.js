'use client';
import { useEffect, useRef } from 'react';

// Pure cropping UI. Calls onConfirm(croppedCanvas, sourceImage) or onCancel().
// Doesn't know anything about OCR — that's the caller's job, so this one component
// can back both "scan the text" and "learn the format" flows.
export default function CropStage({ image, busy, busyLabel, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const rectRef = useRef(null);
  const stageRef = useRef(null);
  const rectState = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const scaleRef = useRef(1);

  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const maxW = Math.min(window.innerWidth, 480) - 20;
    const maxH = window.innerHeight * 0.6;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    scaleRef.current = scale;
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    rectState.current = { x: canvas.width * 0.08, y: canvas.height * 0.06, w: canvas.width * 0.84, h: canvas.height * 0.88 };
    layout();

    function layout() {
      const cRect = canvas.getBoundingClientRect();
      const sRect = stageRef.current.getBoundingClientRect();
      const offX = cRect.left - sRect.left, offY = cRect.top - sRect.top;
      const r = rectState.current;
      const el = rectRef.current;
      if (!el) return;
      el.style.left = offX + r.x + 'px';
      el.style.top = offY + r.y + 'px';
      el.style.width = r.w + 'px';
      el.style.height = r.h + 'px';
    }
    function clamp() {
      const r = rectState.current;
      r.x = Math.max(0, Math.min(r.x, canvas.width - 20));
      r.y = Math.max(0, Math.min(r.y, canvas.height - 20));
      r.w = Math.max(30, Math.min(r.w, canvas.width - r.x));
      r.h = Math.max(30, Math.min(r.h, canvas.height - r.y));
    }
    function dragify(el, mode) {
      let sx = 0, sy = 0, startR = null;
      function down(ev) {
        ev.preventDefault();
        const t = ev.touches ? ev.touches[0] : ev;
        sx = t.clientX; sy = t.clientY; startR = { ...rectState.current };
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('mouseup', up);
        document.addEventListener('touchend', up);
      }
      function move(ev) {
        ev.preventDefault();
        const t = ev.touches ? ev.touches[0] : ev;
        const dx = t.clientX - sx, dy = t.clientY - sy;
        const r = rectState.current;
        if (mode === 'move') { r.x = startR.x + dx; r.y = startR.y + dy; }
        else if (mode === 'tl') { r.x = startR.x + dx; r.y = startR.y + dy; r.w = startR.w - dx; r.h = startR.h - dy; }
        else if (mode === 'br') { r.w = startR.w + dx; r.h = startR.h + dy; }
        clamp(); layout();
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchend', up);
      }
      el.addEventListener('mousedown', down);
      el.addEventListener('touchstart', down, { passive: false });
    }
    const el = rectRef.current;
    dragify(el, 'move');
    dragify(el.querySelector('.hTL'), 'tl');
    dragify(el.querySelector('.hBR'), 'br');
  }, [image]);

  function confirm() {
    const r = rectState.current;
    const scale = scaleRef.current;
    const sx = r.x / scale, sy = r.y / scale, sw = r.w / scale, sh = r.h / scale;
    const out = document.createElement('canvas');
    out.width = sw; out.height = sh;
    out.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    onConfirm(out);
  }

  if (!image) return null;

  return (
    <div className="crop-wrap">
      <div className="crop-stage" ref={stageRef}>
        <canvas ref={canvasRef} />
        <div className="crop-rect" ref={rectRef}>
          <div className="crop-handle hTL" style={{ left: -11, top: -11 }} />
          <div className="crop-handle hBR" style={{ right: -11, bottom: -11 }} />
        </div>
      </div>
      {busy && <div className="ocr-progress">{busyLabel}</div>}
      <div className="crop-bar">
        <button className="cancel" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="confirm" onClick={confirm} disabled={busy}>{busy ? 'Reading…' : 'Use this crop'}</button>
      </div>
    </div>
  );
}
