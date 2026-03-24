import React from 'react';
import { motion } from 'framer-motion';

export const BadgesList = ({ badges }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.key}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border ${
            badge.earned 
              ? `bg-gradient-to-r ${badge.color} border-transparent` 
              : 'bg-slate-800/30 border-slate-700/50'
          }`}
          title={badge.label}
        >
          <badge.icon className={`w-4 h-4 ${badge.earned ? 'text-white' : 'text-slate-500'}`} />
          <span className={`text-xs font-cairo ${badge.earned ? 'text-white' : 'text-slate-500'}`}>
            {badge.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};
