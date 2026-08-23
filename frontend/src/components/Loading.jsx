import React from "react";

export const Loading = ({ text = "Loading clinical intelligence..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="relative w-12 h-12 mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-fixed border-t-primary animate-spin"></div>
        <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-primary text-xl">
          local_hospital
        </span>
      </div>
      <p className="font-body-md text-on-surface-variant font-medium">{text}</p>
      <span className="font-label-sm text-xs text-outline mt-1 uppercase tracking-wider">
        Aarogya Pravah AI Engine
      </span>
    </div>
  );
};

export default Loading;
