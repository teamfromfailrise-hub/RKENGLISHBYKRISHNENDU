'use client';

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

export function ConfirmDialog({ config, onCancel, onConfirm }) {
  if (!config) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <h3>{config.title}</h3>
        <p>{config.message}</p>
        <div className="confirm-actions">
          <button className="cancel" onClick={onCancel}>{config.cancelLabel || 'Cancel'}</button>
          <button className="ok" onClick={onConfirm}>{config.okLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
