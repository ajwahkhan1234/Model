import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { AppState, Contact, EmailTemplate, SmtpConfig, CampaignRecord } from './types';
import SmtpSettings from './components/SmtpSettings';
import ContactImport from './components/ContactImport';
import EmailEditor from './components/EmailEditor';
import CampaignRunner from './components/CampaignRunner';
import { ArrowRight, BarChart3, Users, Zap, Loader2, AlertTriangle, RefreshCw, Mail, Terminal, MonitorPlay } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './services/firebase';

// Use a popular charting library for the dashboard
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.DASHBOARD);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [template, setTemplate] = useState<EmailTemplate>({ subject: '', body: '' });
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: 'smtp.hostinger.com',
    port: 465,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: ''
  });

  // Handle Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthError(null);
      }
    });

    signInAnonymously(auth).catch((error) => {
      console.error("Auth Error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError("Anonymous authentication is disabled. Please enable it in the Firebase Console.");
      } else {
        setAuthError(error.message);
      }
      setLoadingContacts(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync contacts from Firestore once authenticated
  useEffect(() => {
    if (!user) return;

    // Fetch Contacts
    const unsubscribeContacts = onSnapshot(collection(db, "contacts"), (snapshot) => {
        const fetchedContacts: Contact[] = [];
        snapshot.forEach((doc) => {
            fetchedContacts.push(doc.data() as Contact);
        });
        setContacts(fetchedContacts);
        setLoadingContacts(false);
    }, (error) => {
        console.error("Error fetching contacts:", error);
        setLoadingContacts(false);
    });

    // Fetch Campaigns History
    const q = query(collection(db, "campaigns"), orderBy("date", "desc"), limit(7));
    const unsubscribeCampaigns = onSnapshot(q, (snapshot) => {
        const fetchedCampaigns: CampaignRecord[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedCampaigns.push({
                id: doc.id,
                date: data.date,
                subject: data.subject || 'No Subject',
                sent: data.sent || 0,
                failed: data.failed || 0,
                total: data.total || 0
            });
        });
        // Sort by date ascending for chart
        setCampaigns(fetchedCampaigns.reverse());
    }, (error) => {
        console.error("Error fetching campaigns:", error);
    });

    return () => {
        unsubscribeContacts();
        unsubscribeCampaigns();
    };
  }, [user]);

  // Transform campaign data for chart
  const chartData = campaigns.map(c => ({
      name: c.date ? new Date(c.date.seconds * 1000).toLocaleDateString(undefined, {weekday: 'short'}) : 'N/A',
      emails: c.sent
  }));

  const totalSent = campaigns.reduce((acc, curr) => acc + curr.sent, 0);

  const renderContent = () => {
    switch (currentState) {
      case AppState.DASHBOARD:
        return (
          <div className="space-y-6 animate-fade-in">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
              <p className="text-slate-500">Free Email Marketing Suite (Local Edition)</p>
            </header>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-sm">Authentication Error</h3>
                  <p className="text-sm mt-1">{authError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                onClick={() => setCurrentState(AppState.CONTACTS)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-100 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Audience Size</p>
                    {loadingContacts ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="animate-spin" size={16} /> <span className="text-sm">Syncing...</span>
                        </div>
                    ) : (
                        <h3 className="text-2xl font-bold text-slate-800">{contacts.length}</h3>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-100 rounded-xl text-blue-600">
                    <MonitorPlay size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">System Mode</p>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Localhost
                    </h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-green-100 rounded-xl text-green-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Lifetime Emails</p>
                    <h3 className="text-2xl font-bold text-slate-800">{totalSent}</h3>
                  </div>
                </div>
              </div>

              {/* Local Server Instruction Card */}
              <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-700 rounded-xl text-yellow-400">
                    <Terminal size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Required Action</p>
                    <p className="text-white text-sm mt-1">
                        Run this in terminal:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-mono text-green-400 bg-slate-900 px-2 py-1 rounded w-full">npm run server</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Performance (Last 7 Runs)</h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                    <RefreshCw size={12} /> Live
                    </span>
                </div>
                
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                        />
                        <Bar dataKey="emails" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100">
                        <BarChart3 size={48} className="mb-3 opacity-20"/>
                        <p className="text-sm">No campaign history data yet.</p>
                    </div>
                )}
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-xl">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                            <Mail className="text-white" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Start New Blast</h2>
                        <p className="text-slate-300 mb-8 text-sm leading-relaxed">
                            Create a new campaign using Gemini AI (Free) to optimize your subject lines for higher open rates.
                        </p>
                        <button 
                            onClick={() => setCurrentState(AppState.COMPOSE)}
                            className="w-full bg-white text-slate-900 px-6 py-4 rounded-xl font-bold hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                            Create Campaign <ArrowRight size={18} />
                        </button>
                    </div>
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                </div>
            </div>
          </div>
        );
      case AppState.SETTINGS:
        return <SmtpSettings config={smtpConfig} onSave={setSmtpConfig} />;
      case AppState.CONTACTS:
        return <ContactImport contacts={contacts} setContacts={setContacts} isAuthenticated={!!user} />;
      case AppState.COMPOSE:
        return <EmailEditor template={template} setTemplate={setTemplate} />;
      case AppState.SENDING:
        return <CampaignRunner contacts={contacts} template={template} config={smtpConfig} />;
      default:
        return <div>Unknown State</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-inter">
      <Sidebar currentState={currentState} onNavigate={setCurrentState} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;