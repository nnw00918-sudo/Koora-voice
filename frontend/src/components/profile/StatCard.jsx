import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ 
  icon: Icon, 
  value, 
  label, 
  color = "lime",
  delay = 0 
}) => {
  const colorClasses = {
    lime: "from-lime-500/20 to-emerald-500/10 border-lime-500/30 text-lime-400",
    amber: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
    cyan: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    purple: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
  };

  const config = colorClasses[color] || colorClasses.lime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative p-4 rounded-2xl bg-gradient-to-br ${config} border backdrop-blur-sm overflow-hidden group hover:scale-[1.02] transition-transform`}
    >
      {/* Background decoration */}
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/5 rounded-full blur-2xl" />
      
      <div className="relative flex flex-col items-center gap-1">
        {Icon && (
          <Icon className={`w-5 h-5 ${config.split(' ').pop()} opacity-70`} />
        )}
        <span className="text-2xl font-black font-cairo text-white">
          {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
        </span>
        <span className="text-xs font-almarai text-slate-400">{label}</span>
      </div>
    </motion.div>
  );
};
