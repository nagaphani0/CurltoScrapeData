
import React, { useState, useCallback } from 'react';
import { AppStatus, ConversionResponse } from './types';
import { convertCurlToPython, analyzeCurlSchema } from './services/geminiService';

const App: React.FC = () => {
  const [curlInput, setCurlInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ConversionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customField, setCustomField] = useState('');

  // Step 1: Analyze the cURL to get potential fields
  const handleAnalyze = async () => {
    if (!curlInput.trim()) return;

    setStatus(AppStatus.ANALYZING);
    setError(null);
    setResult(null);

    try {
      const fields = await analyzeCurlSchema(curlInput);
      setAvailableFields(fields);
      // Auto-select the first few fields as a helpful default
      setSelectedFields(new Set(fields.slice(0, 3)));
      setStatus(AppStatus.AWAITING_SELECTION);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze cURL. Please check the command.');
      setStatus(AppStatus.ERROR);
    }
  };

  // Step 2: Generate the code based on selected fields
  const handleGenerate = async () => {
    setStatus(AppStatus.GENERATING);
    setError(null);

    try {
      const data = await convertCurlToPython(curlInput, Array.from(selectedFields));
      setResult(data);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate code.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setAvailableFields([]);
    setSelectedFields(new Set());
    setResult(null);
    setError(null);
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const addCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (customField.trim()) {
      const newField = customField.trim();
      setAvailableFields([...availableFields, newField]);
      toggleField(newField);
      setCustomField('');
    }
  };

  const handleExample = () => {
    setCurlInput(`curl -X GET "https://api.github.com/users/octocat" -H "accept: application/json"`);
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Curl2Py</h1>
        </div>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Transform raw cURL commands into optimized Python scripts with intelligent field filtering.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Configuration */}
        <section className="space-y-6">
          
          {/* Input Box */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 transition-all">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                1. Paste cURL Command
              </label>
              {status === AppStatus.IDLE && (
                <button 
                  onClick={handleExample}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Try an example
                </button>
              )}
              {status !== AppStatus.IDLE && status !== AppStatus.ANALYZING && (
                 <button 
                 onClick={handleReset}
                 className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors underline"
               >
                 Start Over
               </button>
              )}
            </div>
            
            <textarea
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              disabled={status !== AppStatus.IDLE && status !== AppStatus.ERROR}
              placeholder="curl -X GET 'https://api.example.com/data'..."
              className={`w-full h-32 p-4 code-font text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${
                status !== AppStatus.IDLE && status !== AppStatus.ERROR ? 'opacity-75 border-slate-100' : 'border-slate-200'
              }`}
            />

            {status === AppStatus.IDLE || status === AppStatus.ERROR || status === AppStatus.ANALYZING ? (
              <button
                onClick={handleAnalyze}
                disabled={status === AppStatus.ANALYZING || !curlInput}
                className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-md transition-all ${
                  status === AppStatus.ANALYZING || !curlInput
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
                }`}
              >
                {status === AppStatus.ANALYZING ? 'Analyzing API Schema...' : 'Analyze & Detect Fields'}
              </button>
            ) : null}
          </div>

          {/* Field Selection (Visible after Analysis) */}
          {(status === AppStatus.AWAITING_SELECTION || status === AppStatus.GENERATING || status === AppStatus.SUCCESS) && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-[fadeIn_0.5s_ease-out]">
              <div className="flex justify-between items-end mb-4">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  2. Select Desired Fields
                </label>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {selectedFields.size} selected
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar">
                {availableFields.map((field) => (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      selectedFields.has(field)
                        ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm ring-1 ring-blue-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {field}
                  </button>
                ))}
                {availableFields.length === 0 && (
                  <p className="text-slate-400 text-sm italic p-2">No fields automatically detected. Add one below.</p>
                )}
              </div>

              {/* Add Custom Field */}
              <form onSubmit={addCustomField} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={customField}
                  onChange={(e) => setCustomField(e.target.value)}
                  placeholder="Add custom field (e.g. data.items)"
                  className="flex-grow px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!customField.trim()}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50"
                >
                  Add
                </button>
              </form>

              <button
                onClick={handleGenerate}
                disabled={status === AppStatus.GENERATING}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] ${
                  status === AppStatus.GENERATING
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5'
                }`}
              >
                {status === AppStatus.GENERATING ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Code...
                  </span>
                ) : 'Generate Python Script'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start animate-bounce-in">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Output */}
        <section className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col border border-slate-800">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-4 text-xs font-medium text-slate-400 font-mono">
                {result ? 'filtered_request.py' : 'terminal'}
              </span>
            </div>
            {result && (
              <button
                onClick={() => copyToClipboard(result.pythonCode)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Copy code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex-grow p-6 overflow-auto relative">
            {/* Empty State */}
            {!result && status !== AppStatus.GENERATING && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                {status === AppStatus.ANALYZING ? (
                  <div className="flex flex-col items-center">
                     <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="font-mono text-sm">Detecting JSON structure...</p>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="font-medium text-sm">
                      {status === AppStatus.AWAITING_SELECTION 
                        ? 'Select fields on the left to generate code.' 
                        : 'Ready to convert your command.'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Generating State */}
            {status === AppStatus.GENERATING && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="flex space-x-2 mb-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
                </div>
                <p className="text-slate-400 font-mono text-sm">Writing Python script...</p>
              </div>
            )}

            {/* Success State */}
            {result && status === AppStatus.SUCCESS && (
              <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Python Code</h3>
                  <pre className="code-font text-sm text-blue-50 whitespace-pre-wrap">
                    <code>{result.pythonCode}</code>
                  </pre>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Mock Response (Filtered)</h3>
                  <pre className="code-font text-sm text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                    <code>{JSON.stringify(JSON.parse(result.mockResponse), null, 2)}</code>
                  </pre>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">AI Explanation</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-24 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>Built with Gemini 3 Pro & Flash • React 19</p>
      </footer>
    </div>
  );
};

export default App;
