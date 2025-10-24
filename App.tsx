import React, { useState, useCallback } from 'react';
import type { GeneratedFile } from './types';
import FileUpload from './components/FileUpload';
import DownloadLink from './components/DownloadLink';
import { SpinnerIcon, ZipIcon } from './components/IconComponents';

// PapaParse and JSZip are loaded from a CDN, so we declare them to TypeScript.
declare const Papa: any;
declare const JSZip: any;

const App: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        setError('Invalid file type. Please upload a CSV file.');
        setSourceFile(null);
        return;
    }
    setError(null);
    setGeneratedFiles([]);
    setSourceFile(file);
  };
  
  const clearFile = () => {
    setSourceFile(null);
    setGeneratedFiles([]);
    setError(null);
  }

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').trim() + '.csv';
  };

  const processCsvFile = useCallback(async () => {
    if (!sourceFile) {
      setError('Please select a file to process.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedFiles([]);

    const parseWithEncoding = (file: File, encoding: string): Promise<{ data: any[], errors: any[] }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                Papa.parse(event.target.result, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (res: any) => resolve(res),
                    error: (err: any) => reject(err),
                });
            } else {
                reject(new Error('Could not read file content.'));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsText(file, encoding);
        });
    };

    try {
      let results;
      const possibleColumnNames = ['Nome da operadora:', 'Nome do restaurante:', 'Nome da empresa:'];

      const findGroupingColumn = (data: any[]): string | undefined => {
        if (!data || data.length === 0) return undefined;
        const firstRow = data[0];
        return possibleColumnNames.find(name => firstRow.hasOwnProperty(name));
      }

      try {
        // Try parsing with UTF-8 first
        results = await parseWithEncoding(sourceFile, 'UTF-8');
        const groupingColumnFound = !!findGroupingColumn(results.data);
        
        if (!groupingColumnFound && results.data.length > 0) {
           throw new Error('Grouping header not found with UTF-8, trying fallback encoding.');
        }
        if (results.errors.length > 0 && results.data.length === 0) {
            throw new Error('Parsing with UTF-8 failed, trying fallback encoding.');
        }
      } catch (e) {
        console.warn('UTF-8 parsing was inconclusive, falling back to ISO-8859-1.', e);
        results = await parseWithEncoding(sourceFile, 'ISO-8859-1');
      }


      if (results.errors.length > 0) {
        if(results.data.length > 0) {
            console.warn("CSV parsing produced non-critical errors:", results.errors);
        } else {
            const firstError = results.errors[0];
            throw new Error(`Error parsing CSV file on line ${firstError.row}: ${firstError.message}. Please check the file format.`);
        }
      }
      
      const groupingColumnName = findGroupingColumn(results.data);

      if (!groupingColumnName) {
        const expectedColumnsString = possibleColumnNames.map(name => `'${name}'`).join(', ');
        throw new Error(`CSV must contain one of the following columns: ${expectedColumnsString}`);
      }

      const groupedByValue = results.data.reduce((acc, row) => {
        const groupName = row[groupingColumnName]?.trim();
        if (groupName) {
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(row);
        }
        return acc;
      }, {} as Record<string, any[]>);

      const files: GeneratedFile[] = Object.entries(groupedByValue).map(([groupName, rows]) => {
        const csvContent = Papa.unparse(rows);
        return {
          filename: sanitizeFilename(groupName),
          content: csvContent,
        };
      });

      setGeneratedFiles(files);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFile]);

  const downloadAllAsZip = async () => {
    if (generatedFiles.length === 0) return;

    setIsZipping(true);
    try {
        const zip = new JSZip();
        generatedFiles.forEach(file => {
            zip.file(file.filename, file.content);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'planilhas_por_operadora.zip');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error creating ZIP file", err);
        setError("Could not create the ZIP file. Please try downloading files individually.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 font-sans">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            CSV <span className="text-sky-400">Splitter</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Upload a CSV file to split it into individual files based on columns like company or restaurant name.
          </p>
        </header>

        <main className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-sm">
          <div className="space-y-6">
            <FileUpload onFileSelect={handleFileSelect} selectedFile={sourceFile} clearFile={clearFile} />
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md text-center">
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={processCsvFile}
                disabled={!sourceFile || isLoading}
                className="inline-flex items-center justify-center px-8 py-3 font-semibold text-white bg-sky-600 rounded-full hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  'Split File'
                )}
              </button>
            </div>
          </div>
          
          {generatedFiles.length > 0 && (
            <div className="mt-10 pt-8 border-t border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-white text-center sm:text-left">
                  Generated Files ({generatedFiles.length})
                </h2>
                <button
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg"
                >
                  {isZipping ? (
                    <>
                      <SpinnerIcon className="w-5 h-5 mr-2" />
                      Zipping...
                    </>
                  ) : (
                    <>
                      <ZipIcon className="w-5 h-5 mr-2" />
                      Download All (.zip)
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedFiles.map((file) => (
                  <DownloadLink key={file.filename} {...file} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="text-center text-slate-500 mt-8">
        <p>Built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;