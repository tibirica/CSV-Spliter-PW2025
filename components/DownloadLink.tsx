
import React from 'react';
import type { GeneratedFile } from '../types';
import { DownloadIcon } from './IconComponents';

const DownloadLink: React.FC<GeneratedFile> = ({ filename, content }) => {
  const downloadFile = () => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadFile}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
    >
      <span className="font-mono text-sm text-slate-300 truncate">{filename}</span>
      <DownloadIcon className="w-5 h-5 text-sky-400 ml-4 flex-shrink-0" />
    </button>
  );
};

export default DownloadLink;
