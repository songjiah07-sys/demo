import React, { useState, useEffect } from 'react';
import { getStoredApiKey, storeApiKey, clearApiKey } from '../services/geminiService';
import { Key, Eye, EyeOff, Save, Trash2, Sun, Moon, ShieldAlert, CheckCircle } from 'lucide-react';

interface SettingsPanelProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onApiKeyChange: (newKey: string) => void;
}

export default function SettingsPanel({ theme, setTheme, onApiKeyChange }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  const handleSave = () => {
    storeApiKey(apiKey.trim());
    onApiKeyChange(apiKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClear = () => {
    clearApiKey();
    setApiKey('');
    onApiKeyChange('');
    setIsSaved(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1">Configuration & Settings</h3>
        <p className="text-xs text-muted-foreground">Manage your credentials, layout options, and themes</p>
      </div>

      <hr className="border-border" />

      {/* API KEY CONFIGURATION */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-primary" />
          Google Gemini API Key
        </label>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="AI-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>

          {apiKey && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
              title="Delete Key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSaved && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold animate-fade-in">
            <CheckCircle className="w-3 h-3" />
            API Key saved successfully to browser storage.
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-accent/15 border border-border flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground block mb-0.5">Privacy Notice</span>
            Your API key is saved solely inside your local browser storage (<code className="bg-accent/40 px-1 rounded">localStorage</code>) and is never transmitted to any third-party or backend server. All AI queries are initiated directly from your browser to Google Gemini API.
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* THEME TOGGLE */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground block">Appearance Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                : 'border-border bg-accent/25 hover:bg-accent text-muted-foreground'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark Mode
          </button>
          
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                : 'border-border bg-accent/25 hover:bg-accent text-muted-foreground'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light Mode
          </button>
        </div>
      </div>
    </div>
  );
}
