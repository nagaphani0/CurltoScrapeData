
import React, { useState } from 'react';
import { AppStatus, ConversionResponse } from './types';
import { convertCurlToPython, analyzeCurlSchema } from './services/geminiService';

const App: React.FC = () => {
  const [curlInput, setCurlInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [volatileInputs, setVolatileInputs] = useState<any[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ConversionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customField, setCustomField] = useState('');

  const handleAnalyze = async () => {
    if (!curlInput.trim()) return;

    setStatus(AppStatus.ANALYZING);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeCurlSchema(curlInput);
      setAvailableFields(analysis.responseFields);
      setVolatileInputs(analysis.volatileInputs);
      // Auto-select first few fields
      setSelectedFields(new Set(analysis.responseFields.slice(0, 3)));
      setStatus(AppStatus.AWAITING_SELECTION);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze cURL. Please check the command.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleGenerate = async () => {
    setStatus(AppStatus.GENERATING);
    setError(null);

    try {
      const data = await convertCurlToPython(
        curlInput, 
        Array.from(selectedFields),
        volatileInputs
      );
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
    setVolatileInputs([]);
    setSelectedFields(new Set());
    setResult(null);
    setError(null);
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) newSelected.delete(field);
    else newSelected.add(field);
    setSelectedFields(newSelected);
  };

  const handleExample = () => {
    setCurlInput(`curl -X GET "https://api.github.com/user" -H "Authorization: Bearer YOUR_EXPIRING_TOKEN" -H "X-GitHub-Api-Version: 2022-11-28"`);
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Curl2Py <span className="text-indigo-600">Pro</span></h1>
        </div>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Convert cURL to reusable Python. Automatically detects tokens and headers that expire tomorrow.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Input cURL</label>
              <button onClick={handleExample} className="text-xs font-semibold text-indigo-600 hover:underline">Try Token Example</button>
            </div>
            <textarea
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder="Paste your curl command here..."
              className="w-full h-40 p-4 code-font text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={!curlInput || status === AppStatus.ANALYZING}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md disabled:bg-slate-300"
            >
              {status === AppStatus.ANALYZING ? 'Detecting Volatile Fields...' : 'Analyze Command'}
            </button>
          </div>

          {(status === AppStatus.AWAITING_SELECTION || status === AppStatus.SUCCESS) && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
              {/* Volatile Fields Display */}
              {volatileInputs.length > 0 && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <h3 className="text-amber-800 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Detected Expiring Inputs
                  </h3>
                  <div className="space-y-2">
                    {volatileInputs.map((input, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-amber-200/50">
                        <div>
                          <span className="text-xs font-bold text-slate-700">{input.name}</span>
                          <p className="text-[10px] text-amber-600 font-medium">{input.description}</p>
                        </div>
                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded uppercase">{input.type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-amber-700 italic">
                    These will be extracted into a <strong>Configuration</strong> block in your Python code for easy updates tomorrow.
                  </p>
                </div>
              )}

              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block mb-4">2. Select Response Fields</label>
              <div className="flex flex-wrap gap-2 mb-6">
                {availableFields.map(field => (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedFields.has(field)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400'
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={status === AppStatus.GENERATING}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:bg-slate-300"
              >
                {status === AppStatus.GENERATING ? 'Generating Reusable Script...' : 'Convert to Reusable Python'}
              </button>
            </div>
          )}
        </section>

        {/* Right Column */}
        <section className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="ml-4 text-[10px] font-mono text-slate-500">api_client.py</span>
            </div>
            {result && (
              <button onClick={() => copyToClipboard(result.pythonCode)} className="text-slate-400 hover:text-white transition-all text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Code
              </button>
            )}
          </div>

          <div className="flex-grow p-6 overflow-auto custom-scrollbar">
            {!result && status !== AppStatus.GENERATING && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <p className="text-sm font-mono italic">Awaiting analysis or generation...</p>
              </div>
            )}

            {status === AppStatus.GENERATING && (
              <div className="h-full flex flex-col items-center justify-center text-indigo-500">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-mono">Building configuration-ready script...</p>
              </div>
            )}

            {result && status === AppStatus.SUCCESS && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4 border-l-2 border-indigo-500 pl-2">Reusable Python Code</h3>
                  <pre className="code-font text-sm text-indigo-50/90 whitespace-pre-wrap selection:bg-indigo-500/30">
                    <code>{result.pythonCode}</code>
                  </pre>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border-l-2 border-emerald-500 pl-2">Filtered JSON Response</h3>
                  <pre className="code-font text-xs text-slate-400 bg-black/40 p-4 rounded-xl border border-slate-800">
                    <code>{JSON.stringify(JSON.parse(result.mockResponse), null, 2)}</code>
                  </pre>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Instructions</h3>
                  <p className="text-sm text-slate-500 leading-relaxed italic">
                    {result.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-20 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
        Built with Gemini 3 Pro & Flash • Reusable Code Engine
      </footer>
    </div>
  );
};

export default App;
