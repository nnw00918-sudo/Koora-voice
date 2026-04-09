import React from 'react';
import { Crown } from 'lucide-react';

/**
 * VIP Badge Component
 * شارة VIP تظهر بجانب اسم المستخدم
 */
export const VIPBadge = ({ size = 'sm', className = '' }) => {
  const sizes = {
    xs: 'w-3 h-3 text-[8px]',
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  };

  return (
    <div 
      className={`inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-full ${sizes[size]} ${className}`}
      title="VIP Member"
    >
      <Crown className="w-2/3 h-2/3 text-white" />
    </div>
  );
};

/**
 * VIP Name Wrapper
 * يعرض الاسم مع شارة VIP إذا كان المستخدم VIP
 */
export const VIPName = ({ name, isVIP, size = 'sm', className = '', nameClassName = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`${isVIP ? 'text-amber-400 font-bold' : ''} ${nameClassName}`}>
        {name}
      </span>
      {isVIP && <VIPBadge size={size} />}
    </span>
  );
};

/**
 * VIP Avatar Frame
 * إطار ذهبي حول صورة المستخدم VIP
 */
export const VIPAvatarFrame = ({ children, isVIP, size = 'md' }) => {
  const sizes = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5'
  };

  if (!isVIP) return children;

  return (
    <div className={`rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 ${sizes[size]}`}>
      {children}
    </div>
  );
};

export default VIPBadge;
