import React, { useState, useEffect } from 'react';
import { Contact, EmailTemplate, SmtpConfig, CampaignStats } from '../types';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Search, CheckSquare, Square, UserCheck, Server, Zap, CloudLightning, Terminal, AlertTriangle, Save, ShieldAlert } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface CampaignRunnerProps {
  contacts: Contact[];
  template: EmailTemplate;
  config: SmtpConfig;
}

type CampaignStep = 'SELECT' | 'SENDING' | 'COMPLETED';

// CHANGED: Point to Local Server (Free) instead of Cloud Function (Paid)
const LOCAL_SERVER_URL = "http://localhost:3001/api/send";

const CampaignRunner: React.FC<CampaignRunnerProps> = ({ contacts, template, config }) => {
  const [step, setStep] = useState<CampaignStep>('SELECT');
  
  // Selection State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Execution State
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mixedContentError, setMixedContentError] = useState(false);
  
  const [stats, setStats] = useState<CampaignStats>({
    sent: 0,
    failed: 0,
    total: 0,
    logs: []
  });
  
  const [processingQueue, setProcessingQueue] = useState<number[]>([]);
  const [savedToHistory, setSavedToHistory] = useState(false);

  useEffect(() => {
    if (contacts.length > 0) {
      setSelectedIndices(new Set(contacts.map((_, i) => i)));
    }
  }, [contacts]);

  // Check for Mixed Content issues (HTTPS frontend -> HTTP backend)
  useEffect(() => {
    if (window.location.protocol === 'https:') {
        setMixedContentError(true);
    }
  }, []);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStats(prev => ({
      ...prev,
      logs: [`[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${msg}`, ...prev.logs].slice(0, 100)
    }));
  };

  const sendCampaign = async () => {
    setIsSending(true);
    let sentCount = 0;
    let failedCount = 0;
    const total = processingQueue.length;

    addLog(`Starting campaign for ${total} recipients via Local Relay...`, 'info');

    for (let i = 0; i < total; i++) {
        if (!isSending && i > 0) { 
            addLog("Campaign paused by user.", 'info');
            break; 
        }

        const contactIndex = processingQueue[i];
        const contact = contacts[contactIndex];
        
        // Robust email finding
        const emailKey = Object.keys(contact).find(k => k.toLowerCase().includes('email'));
        const email = emailKey ? contact[emailKey] : Object.values(contact).find((v) => String(v).includes('@'));

        if (!email) {
            failedCount++;
            setStats(prev => ({ ...prev, failed: failedCount }));
            addLog(`Skipped: No email found for contact #${contactIndex + 1}`, 'error');
            updateProgress(i + 1, total);
            continue;
        }

        try {
            // Personalize body
            let personalizedBody = template.body;
            Object.keys(contact).forEach(key => {
                personalizedBody = personalizedBody.replace(new RegExp(`{{${key}}}`, 'g'), contact[key]);
            });

            // Send to Local Server
            // The payload is direct JSON, simpler than Cloud Function structure
            const response = await fetch(LOCAL_SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp: {
                        host: config.host || 'smtp.hostinger.com',
                        port: config.port || 465,
                        user: config.user,
                        pass: config.pass,
                        fromName: config.fromName,
                        fromEmail: config.fromEmail
                    },
                    mail: {
                        to: email,
                        subject: template.subject,
                        text: personalizedBody,
                        html: personalizedBody.replace(/\n/g, '<br/>')
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Server error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                sentCount++;
                setStats(prev => ({ ...prev, sent: sentCount }));
                addLog(`Sent to ${email}`, 'success');
            } else {
                throw new Error(result.error || 'Relay Server Error');
            }

        } catch (error: any) {
            failedCount++;
            setStats(prev => ({ ...prev, failed: failedCount }));
            
            if (error.message.includes("Failed to fetch")) {
                 if (window.location.protocol === 'https:') {
                     addLog(`BLOCKED: Browser blocked insecure request to localhost. Run frontend locally!`, 'error');
                 } else {
                     addLog(`CRITICAL: Local server not found! Run 'npm run server' in terminal.`, 'error');
                 }
                 setIsSending(false); // Stop campaign immediately if server is down
                 break;
            } else {
                 addLog(`Failed: ${email} - ${error.message.substring(0, 50)}`, 'error');
            }
        }

        updateProgress(i + 1, total);
        
        // Delay to respect Hostinger rate limits (500/hr)
        await new Promise(r => setTimeout(r, 5000));
    }

    setIsSending(false);
    
    if (processingQueue.length === (sentCount + failedCount)) {
        setStep('COMPLETED');
        addLog("Campaign Finished.", 'success');
        saveCampaignToHistory(sentCount, failedCount, total);
    }
  };

  const saveCampaignToHistory = async (sent: number, failed: number, total: number) => {
    try {
        await addDoc(collection(db, "campaigns"), {
            subject: template.subject,
            date: serverTimestamp(),
            sent,
            failed,
            total
        });
        setSavedToHistory(true);
    } catch (e) {
        console.error("Failed to save history", e);
    }
  };

  const updateProgress = (current: number, total: number) => {
      setProgress(Math.round((current / total) * 100));
  };

  const filteredContacts = contacts.map((c, i) => ({ ...c, originalIndex: i })).filter(c => 
    Object.values(c).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    if (selectedIndices.size === filteredContacts.length) {
      setSelectedIndices(new Set());
    } else {
      const newSet = new Set(selectedIndices);
      filteredContacts.forEach(c => newSet.add(c.originalIndex));
      setSelectedIndices(newSet);
    }
  };

  const handleStart = () => {
      setIsSending(true);
      sendCampaign();
  };

  if (step === 'SELECT') {
      return (
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <UserCheck className="text-purple-600" /> Select Audience
                        </h2>
                        <p className="text-slate-500 mt-1">Review recipients for: <span className="font-semibold text-slate-700">"{template.subject || 'Untitled Campaign'}"</span></p>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="relative flex-1 md:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="text" 
                                placeholder="Search list..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                              />
                          </div>
                          <button 
                            onClick={() => {
                                const queue = Array.from(selectedIndices).sort((a: number, b: number) => a - b);
                                setProcessingQueue(queue);
                                setStats({ sent: 0, failed: 0, total: queue.length, logs: [] });
                                setStep('SENDING');
                            }}
                            disabled={selectedIndices.size === 0}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold transition flex items-center gap-2 whitespace-nowrap shadow-lg shadow-purple-600/20"
                          >
                             Ready to Send ({selectedIndices.size}) <Play size={16} fill="currentColor" />
                          </button>
                      </div>
                  </div>

                  {mixedContentError && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6">
                        <ShieldAlert className="shrink-0 mt-0.5 text-amber-600" size={20} />
                        <div>
                          <h3 className="font-bold text-sm">Deployment Environment Detected</h3>
                          <p className="text-sm mt-1">
                            You are running this on a secure (HTTPS) website, but the email server is running locally on your computer (HTTP). 
                            <br/><br/>
                            <strong>Browsers block this for security.</strong> To use this app properly:
                            <ul className="list-disc ml-5 mt-1">
                                <li>Run the frontend locally: <code>npm start</code></li>
                                <li>Keep the backend running: <code>npm run server</code></li>
                            </ul>
                          </p>
                        </div>
                      </div>
                  )}

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                          <button onClick={toggleAll} className="text-sm font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-2">
                              {selectedIndices.size === filteredContacts.length ? <CheckSquare size={18} /> : <Square size={18} />}
                              {selectedIndices.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                          </button>
                          <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded border border-slate-200">
                              {selectedIndices.size} selected
                          </span>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr className="text-slate-800 font-bold uppercase text-xs tracking-wider">
                                    <th className="px-6 py-4 w-16 bg-slate-50/90 backdrop-blur">Select</th>
                                    {contacts.length > 0 && Object.keys(contacts[0]).slice(0, 4).map(k => (
                                        <th key={k} className="px-6 py-4 bg-slate-50/90 backdrop-blur">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredContacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            No contacts match your search.
                                        </td>
                                    </tr>
                                ) : filteredContacts.map((contact) => (
                                    <tr key={contact.originalIndex} className={`transition-colors ${selectedIndices.has(contact.originalIndex) ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-3">
                                            <button onClick={() => toggleSelection(contact.originalIndex)} className="text-purple-600 hover:text-purple-800 transition">
                                                {selectedIndices.has(contact.originalIndex) ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                                            </button>
                                        </td>
                                        {Object.values(contact).slice(0, 4).map((val, i) => (
                                            <td key={i} className="px-6 py-3 whitespace-nowrap text-slate-700">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6 border-b border-slate-100 pb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {step === 'COMPLETED' ? <CheckCircle className="text-green-500" /> : <Server className="text-blue-500" />}
                    {step === 'COMPLETED' ? 'Campaign Complete' : 'Mission Control'}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-medium text-slate-500">Target: <span className="text-slate-800">{processingQueue.length} emails</span></span>
                    <span className="h-4 w-px bg-slate-300"></span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold border border-emerald-200">
                          <Terminal size={12}/> Local Relay
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
                {step !== 'COMPLETED' && !isSending && progress === 0 && (
                    <button 
                        onClick={handleStart} 
                        className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-0.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30"
                    >
                        <Zap size={20} fill="currentColor" /> Send Now
                    </button>
                )}
                
                {isSending && (
                    <button onClick={() => setIsSending(false)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition">
                        <Pause size={20} fill="currentColor" /> Pause
                    </button>
                )}
                
                {!isSending && step !== 'COMPLETED' && progress > 0 && (
                     <button onClick={handleStart} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition">
                        <Play size={20} fill="currentColor" /> Resume
                    </button>
                )}

                {!isSending && (
                    <button onClick={() => { setIsSending(false); setStep('SELECT'); setProgress(0); }} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl font-bold transition shadow-sm">
                        <RotateCcw size={18} /> Back
                    </button>
                )}
            </div>
        </div>

        {step === 'COMPLETED' && savedToHistory && (
             <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 font-medium animate-fade-in">
                 <div className="bg-green-100 p-1.5 rounded-full"><Save size={18} /></div>
                 Campaign completed and saved to history successfully.
             </div>
        )}

        {mixedContentError && (
             <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
               <ShieldAlert className="shrink-0 mt-0.5 text-amber-600" size={20} />
               <div className="flex-1">
                 <h3 className="font-bold text-sm">Connection Blocked (Mixed Content)</h3>
                 <p className="text-sm mt-1">
                   This app is running on <strong>HTTPS</strong>, but attempting to connect to <strong>localhost (HTTP)</strong>. 
                   Browsers block this security risk.
                 </p>
                 <div className="mt-2 text-xs bg-amber-100 p-2 rounded">
                    <strong>Solution:</strong> Run the frontend locally (http://localhost:3000) using <code>npm start</code> to match the backend.
                 </div>
               </div>
             </div>
        )}

        <div className="relative pt-1 mb-10">
            <div className="flex mb-3 items-center justify-between">
                <div>
                    <span className="text-xs font-bold inline-block py-1 px-3 uppercase rounded-full text-indigo-600 bg-indigo-100">
                        Sending Progress
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-sm font-bold inline-block text-indigo-600">
                        {progress}%
                    </span>
                </div>
            </div>
            <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 box-border border border-slate-200">
                <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500 ease-out"></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border border-green-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Delivered</p>
                    <p className="text-4xl font-bold text-slate-800">{stats.sent}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckCircle size={32} /></div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Failed</p>
                    <p className="text-4xl font-bold text-slate-800">{stats.failed}</p>
                </div>
                 <div className="bg-red-100 p-3 rounded-full text-red-600"><XCircle size={32} /></div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Queue</p>
                    <p className="text-4xl font-bold text-slate-800">{stats.total - stats.sent - stats.failed}</p>
                </div>
                <div className="text-slate-300 font-bold text-xl">
                   Pending
                </div>
            </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 shadow-inner border border-slate-800">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Terminal size={14} /> Live Terminal Logs
            </h4>
            <div className="font-mono text-xs h-64 overflow-y-auto custom-scrollbar space-y-2">
                {stats.logs.length === 0 ? (
                    <div className="flex flex-col gap-2 text-slate-600 italic">
                        <p>Waiting to start...</p>
                        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded border border-slate-700 text-yellow-500 not-italic">
                            <AlertTriangle size={16} />
                            <span>Ensure <strong>npm run server</strong> is running in your terminal!</span>
                        </div>
                    </div>
                ) : (
                    stats.logs.map((log, i) => (
                        <div key={i} className={`pb-1 border-b border-slate-800/50 last:border-0 ${
                            log.includes('ERROR') ? 'text-red-400' : 
                            log.includes('SUCCESS') ? 'text-green-400' : 'text-slate-300'
                        }`}>
                            <span className="opacity-50 mr-2">➜</span>{log}
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignRunner;