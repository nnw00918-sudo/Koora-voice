import React from 'react';

const ReplyInput = ({ 
  user, 
  thread, 
  txt, 
  isRTL, 
  replyContent, 
  setReplyContent, 
  onSubmit 
}) => {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Replying to indicator */}
      <div className={`flex items-center gap-1 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-slate-500 text-sm">{txt.replyingTo}</span>
        <span className="text-sky-400 text-sm" dir="ltr">@{thread.author?.username}</span>
      </div>
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={txt.writeReply}
            className={`w-full bg-transparent text-white font-almarai outline-none resize-none text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            rows={2}
            maxLength={280}
            data-testid="reply-input"
          />
          <div className={`flex items-center justify-between mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-slate-500 text-xs">{replyContent.length}/280</span>
            <button
              onClick={onSubmit}
              disabled={!replyContent.trim()}
              className="px-4 py-1.5 bg-sky-500 text-white text-sm font-cairo font-bold rounded-full disabled:opacity-50"
              data-testid="send-reply-btn"
            >
              {txt.sendReply}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyInput;
