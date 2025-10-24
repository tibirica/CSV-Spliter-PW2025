
import React, { useState, useRef } from 'react';
import { UploadIcon, FileCsvIcon } from './IconComponents';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  clearFile: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, clearFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  const handleClearFile = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    clearFile();
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {!selectedFile ? (
        <label
          htmlFor="file-upload"
          className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
            ${isDragging ? 'border-sky-400 bg-slate-700/50' : 'border-slate-600 hover:border-sky-500 hover:bg-slate-800'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
            <UploadIcon className="w-10 h-10 mb-3" />
            <p className="mb-2 text-sm"><span className="font-semibold text-sky-400">Click to upload</span> or drag and drop</p>
            <p className="text-xs">CSV file only</p>
          </div>
          <input id="file-upload" ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileCsvIcon className="w-8 h-8 text-sky-400 flex-shrink-0" />
            <span className="text-slate-300 font-medium truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={handleClearFile}
            className="text-slate-400 hover:text-red-500 transition-colors duration-200"
            aria-label="Remove file"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
