// src/components/Modal.js
import React from 'react';

const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-2 right-3 text-gray-600" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 