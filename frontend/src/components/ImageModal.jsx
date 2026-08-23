import React from "react";
import { getAssetUrl } from "../services/apiClient";

export const ImageModal = ({ isOpen, onClose, imageUrl, title = "Medical Image Viewer" }) => {
  if (!isOpen || !imageUrl) return null;

  const fullUrl = getAssetUrl(imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/80 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-surface rounded-xl border border-outline-variant max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">radiology</span>
            <h3 className="font-title-md text-on-surface font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Image Canvas */}
        <div className="flex-1 overflow-auto p-4 bg-inverse-surface flex items-center justify-center min-h-[300px]">
          <img
            src={fullUrl}
            alt={title}
            className="max-h-[65vh] max-w-full object-contain rounded border border-outline-variant/30 shadow-md"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-label-sm text-on-surface-variant">
          <span>Preliminary Radiological Scan View (Non-diagnostic support)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-on-primary rounded font-medium hover:bg-on-primary-fixed-variant transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
