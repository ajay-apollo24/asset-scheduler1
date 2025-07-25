// src/components/Modal.js
import React from 'react';

const Modal = ({ children, onClose }) => {
  return (
    <div className="modal modal-open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 