import React from 'react';
import { motion } from 'framer-motion';

export const ProfileTabs = ({ 
  tabs, 
  activeTab, 
  onTabChange 
}) => {
  return (
    <div className="relative flex justify-around bg-slate-900/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-800/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-cairo text-sm transition-colors ${
            activeTab === tab.id 
              ? 'text-lime-400' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
          data-testid={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-lime-500/10 border border-lime-500/30 rounded-xl"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <tab.icon className="w-4 h-4 relative z-10" />
          <span className="relative z-10 hidden sm:inline">{tab.label}</span>
          {tab.count > 0 && (
            <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-lime-500/20' : 'bg-slate-700/50'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
