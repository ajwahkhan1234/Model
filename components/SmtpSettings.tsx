import React, { useState } from 'react';
import { SmtpConfig } from '../types';
import { Save, Server, ShieldCheck, Check, Globe } from 'lucide-react';

interface SmtpSettingsProps {
  config: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
}

const SmtpSettings: React.FC<SmtpSettingsProps> = ({ config, onSave }) => {
  // Initialize with Hostinger defaults
  const [formData, setFormData] = useState<SmtpConfig>(
    config.host ? config : {
      host: 'smtp.hostinger.com',
      port: 465,
      user: '',
      pass: '',
      fromName: '',
      fromEmail: ''
    }
  );
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const applyHostingerPreset = () => {
    setFormData({
      ...formData,
      host: 'smtp.hostinger.com',
      port: 465,
      // Preserve existing credentials if any
      user: formData.user || '',
      fromEmail: formData.fromEmail || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-purple-600" />
            Hostinger SMTP Config
          </h2>
          <button
            type="button"
            onClick={applyHostingerPreset}
            className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-medium hover:bg-purple-200 transition flex items-center gap-2"
          >
            <Globe size={14} /> Reset to Hostinger Defaults
          </button>
        </div>

        <p className="text-slate-600 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <strong>Important:</strong> Enter your Hostinger email credentials below. These are passed securely to the <code>send.php</code> script on your server to send emails.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Outgoing Server (SMTP)</label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="smtp.hostinger.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Port (SSL)</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="465"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hostinger Email</label>
              <input
                type="email"
                name="user"
                value={formData.user}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="name@yourdomain.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                name="pass"
                value={formData.pass}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Your email password"
                required
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Sender Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">From Name</label>
                <input
                  type="text"
                  name="fromName"
                  value={formData.fromName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="Your Name or Company"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">From Email</label>
                <input
                  type="email"
                  name="fromEmail"
                  value={formData.fromEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="name@yourdomain.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg shadow-purple-600/30"
            >
              <Save size={18} />
              {saved ? 'Settings Saved' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
        <ShieldCheck className="text-blue-600 flex-shrink-0" size={24} />
        <div>
          <h4 className="font-semibold text-blue-800">Security Note</h4>
          <p className="text-sm text-blue-600 mt-1">
            Your credentials are transmitted securely via HTTPS to your own hosting server and are not stored externally.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmtpSettings;