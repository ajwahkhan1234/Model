import React from 'react';
import { LayoutDashboard, Users, Mail, Send, Settings, LogOut, Globe } from 'lucide-react';
import { AppState } from '../types';

interface SidebarProps {
  currentState: AppState;
  onNavigate: (state: AppState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentState, onNavigate }) => {
  const menuItems = [
    { id: AppState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppState.CONTACTS, label: 'Audience', icon: Users },
    { id: AppState.COMPOSE, label: 'Template Editor', icon: Mail },
    { id: AppState.SENDING, label: 'Campaign Runner', icon: Send },
    { id: AppState.SETTINGS, label: 'SMTP Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-50">
      <div className="p-8 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="text-purple-500" size={24} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MailBlast AI
          </h1>
        </div>
        <p className="text-xs text-purple-400 font-medium tracking-wide uppercase pl-8">Hostinger Edition</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              currentState === item.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 translate-x-1'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
            }`}
          >
            <item.icon size={20} className={currentState === item.id ? 'text-purple-200' : ''} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800">
          <LogOut size={18} />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;