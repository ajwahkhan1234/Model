import React, { useState, useRef } from 'react';
import { EmailTemplate } from '../types';
import { Sparkles, Wand2, Search, CheckCircle2, Plus, Bold, Italic, Link, List, ListOrdered, Eye, Edit3 } from 'lucide-react';
import { generateEmailBody, generateEmailSubject, spamCheck } from '../services/geminiService';

interface EmailEditorProps {
  template: EmailTemplate;
  setTemplate: (template: EmailTemplate) => void;
}

const EmailEditor: React.FC<EmailEditorProps> = ({ template, setTemplate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [spamStatus, setSpamStatus] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Customization Options
  const [tone, setTone] = useState('Professional');
  const [emailType, setEmailType] = useState('Promotional');
  const [language, setLanguage] = useState('English');

  const handleGenerate = async () => {
    if (!topic || !audience) return;
    setIsGenerating(true);
    
    // Generate both subject and body in parallel with new parameters
    const [subject, body] = await Promise.all([
      generateEmailSubject(topic, audience, tone, language),
      generateEmailBody(topic, audience, tone, emailType, language)
    ]);

    setTemplate({ subject, body });
    setIsGenerating(false);
    setPreviewMode(false); // Switch to edit mode to see the result
  };

  const handleSpamCheck = async () => {
    const status = await spamCheck(template.subject + " " + template.body);
    setSpamStatus(status);
  };

  const insertTag = (startTag: string, endTag: string = '') => {
    const textArea = textAreaRef.current;
    if (textArea) {
        const start = textArea.selectionStart;
        const end = textArea.selectionEnd;
        const text = template.body;
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end);
        
        setTemplate({ ...template, body: newText });
        
        // Restore focus and selection
        setTimeout(() => {
            textArea.focus();
            textArea.setSelectionRange(start + startTag.length, end + startTag.length);
        }, 0);
    } else {
        setTemplate({ ...template, body: template.body + startTag + endTag });
    }
  };

  const insertVariable = (variable: string) => {
    insertTag(variable);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Editor Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Subject Line</label>
          <input
            type="text"
            value={template.subject}
            onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-lg font-medium placeholder-slate-400 transition"
            placeholder="e.g. Special Invitation: Join our Exclusive Webinar"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-slate-700">Email Body</label>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setPreviewMode(false)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${!previewMode ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Edit3 size={14}/> Edit
                </button>
                <button 
                    onClick={() => setPreviewMode(true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${previewMode ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Eye size={14}/> Preview
                </button>
            </div>
          </div>
          
          {/* Toolbar */}
          {!previewMode && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg transition-all">
              <button onClick={() => insertTag('<b>', '</b>')} className="p-2 hover:bg-slate-200 rounded text-slate-700 transition hover:text-purple-600" title="Bold">
                  <Bold size={16} />
              </button>
              <button onClick={() => insertTag('<i>', '</i>')} className="p-2 hover:bg-slate-200 rounded text-slate-700 transition hover:text-purple-600" title="Italic">
                  <Italic size={16} />
              </button>
              <button onClick={() => insertTag('<a href="#">', '</a>')} className="p-2 hover:bg-slate-200 rounded text-slate-700 transition hover:text-purple-600" title="Link">
                  <Link size={16} />
              </button>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              <button onClick={() => insertTag('<ul>\n  <li>', '</li>\n</ul>')} className="p-2 hover:bg-slate-200 rounded text-slate-700 transition hover:text-purple-600" title="Bulleted List">
                  <List size={16} />
              </button>
              <button onClick={() => insertTag('<ol>\n  <li>', '</li>\n</ol>')} className="p-2 hover:bg-slate-200 rounded text-slate-700 transition hover:text-purple-600" title="Ordered List">
                  <ListOrdered size={16} />
              </button>
               <div className="w-px h-6 bg-slate-300 mx-1"></div>
               <button 
                  onClick={() => insertVariable('{{Name}}')}
                  className="text-xs bg-white hover:bg-purple-50 hover:text-purple-700 px-2 py-1 rounded border border-slate-200 transition flex items-center gap-1 font-medium"
                >
                  <Plus size={12}/> {'{{Name}}'}
                </button>
                <button 
                  onClick={() => insertVariable('{{Company}}')}
                  className="text-xs bg-white hover:bg-purple-50 hover:text-purple-700 px-2 py-1 rounded border border-slate-200 transition flex items-center gap-1 font-medium"
                >
                  <Plus size={12}/> {'{{Company}}'}
                </button>
          </div>
          )}

          {previewMode ? (
              <div 
                className="w-full flex-1 p-6 border border-slate-300 rounded-lg overflow-y-auto bg-slate-50 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: template.body.replace(/\n/g, '<br/>') }}
              />
          ) : (
            <textarea
                ref={textAreaRef}
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                className="w-full flex-1 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono text-sm resize-none mb-4 transition"
                placeholder={`Hi {{Name}},\n\nWrite your content here...`}
            />
          )}
          
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
             <button 
              onClick={handleSpamCheck}
              className="text-sm flex items-center gap-2 text-slate-500 hover:text-purple-600 transition font-medium"
            >
              <Search size={16} /> Check for spam words
            </button>
          </div>

          {spamStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${spamStatus.includes('Clean') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <CheckCircle2 size={16} className="mt-0.5 shrink-0"/>
              <div>
                <strong>AI Analysis:</strong> {spamStatus}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Column */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl shadow-lg p-6 text-white sticky top-6">
          <div className="flex items-center gap-2 mb-6 border-b border-purple-700/50 pb-4">
            <Sparkles className="text-yellow-400" />
            <h3 className="text-xl font-bold">Gemini Assistant</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Campaign Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-yellow-400 transition"
                placeholder="e.g. Summer Sale"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-yellow-400 transition"
                placeholder="e.g. Small Business Owners"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Tone</label>
                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-sm transition"
                    >
                        <option value="Professional">Professional</option>
                        <option value="Friendly">Friendly</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Witty">Witty</option>
                        <option value="Luxury">Luxury</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Language</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-sm transition"
                    >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Portuguese">Portuguese</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-purple-200 mb-1 uppercase tracking-wider">Email Type</label>
                <select
                    value={emailType}
                    onChange={(e) => setEmailType(e.target.value)}
                    className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-sm transition"
                >
                    <option value="Promotional">Promotional / Sale</option>
                    <option value="Newsletter">Newsletter / Educational</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Product Launch">Product Launch</option>
                    <option value="Event Invitation">Event Invitation</option>
                </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic || !audience}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-4 ${
                isGenerating || !topic || !audience
                  ? 'bg-purple-800 text-purple-400 cursor-not-allowed'
                  : 'bg-yellow-400 text-purple-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-900 border-t-transparent rounded-full animate-spin"></div>
                  Thinking...
                </>
              ) : (
                <>
                  <Wand2 size={18} /> Generate Draft
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-purple-700/50">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400"/> Quick Tips
            </h4>
            <ul className="text-sm text-purple-200 space-y-2 list-disc pl-4 opacity-80">
              <li>Switch to <strong>Preview</strong> mode to verify your layout.</li>
              <li>You can use standard HTML tags like <code>&lt;b&gt;</code> for bold text.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailEditor;