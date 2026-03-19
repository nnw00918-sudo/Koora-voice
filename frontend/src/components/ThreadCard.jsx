import React from 'react';
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react';

const ThreadCard = ({ 
  thread, 
  user, 
  txt, 
  isRTL, 
  formatTime, 
  onReply, 
  onLike, 
  onRepost, 
  onDelete, 
  onShowReplies,
  replyingTo,
  threadReplies,
  showDeleteMenu,
  setShowDeleteMenu
}) => {
  const isOwnThread = user?.id === thread.author?.id;

  return (
    <div className="p-4 border-b border-slate-800 hover:bg-slate-900/30 transition-colors">
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img 
          src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`} 
          alt="" 
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="font-cairo font-bold text-white">{thread.author?.name || thread.author?.username}</span>
              <span className="text-slate-500 text-sm" dir="ltr">@{thread.author?.username}</span>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-slate-500 text-sm">{formatTime(thread.created_at)}</span>
            </div>
            {isOwnThread && (
              <div className="relative">
                <button 
                  onClick={() => setShowDeleteMenu(showDeleteMenu === thread.id ? null : thread.id)}
                  className="text-slate-500 hover:text-white p-1"
                  data-testid={`thread-menu-${thread.id}`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showDeleteMenu === thread.id && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-8 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1 z-10 min-w-[120px]`}>
                    <button
                      onClick={() => onDelete(thread.id)}
                      className={`w-full px-4 py-2 text-red-400 hover:bg-slate-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      data-testid={`delete-thread-${thread.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-almarai">{txt.delete}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <p className={`text-white font-almarai mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>{thread.content}</p>
          
          {/* Media */}
          {thread.media_url && (
            <div className="mb-3 rounded-2xl overflow-hidden">
              {thread.media_type === 'video' ? (
                <video src={thread.media_url} controls className="max-h-80 w-full object-cover" />
              ) : (
                <img src={thread.media_url} alt="" className="max-h-80 w-full object-cover" />
              )}
            </div>
          )}
          
          {/* Twitter Embed */}
          {thread.twitter_url && (
            <a 
              href={thread.twitter_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`mb-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center gap-2 hover:bg-slate-700/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-sky-400 font-almarai">{txt.fromTwitter}</span>
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 text-sm truncate flex-1" dir="ltr">{thread.twitter_url}</span>
            </a>
          )}
          
          {/* Actions */}
          <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={() => onReply(thread.id)}
              className={`flex items-center gap-1 transition-colors ${replyingTo === thread.id ? 'text-sky-400' : 'text-slate-500 hover:text-sky-400'}`}
              data-testid={`reply-btn-${thread.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{thread.replies_count || 0}</span>
            </button>
            <button 
              onClick={() => onRepost(thread.id)}
              className={`flex items-center gap-1 transition-colors ${thread.reposted ? 'text-green-500' : 'text-slate-500 hover:text-green-400'}`}
              data-testid={`repost-btn-${thread.id}`}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs">{thread.reposts_count || 0}</span>
            </button>
            <button 
              onClick={() => onLike(thread.id)}
              className={`flex items-center gap-1 transition-colors ${thread.liked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
              data-testid={`like-btn-${thread.id}`}
            >
              <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
              <span className="text-xs">{thread.likes_count || 0}</span>
            </button>
            <button className="flex items-center gap-1 text-slate-500 hover:text-sky-400 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="text-slate-500 hover:text-sky-400 transition-colors">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
          
          {/* Replies */}
          {thread.replies_count > 0 && (
            <button 
              onClick={() => onShowReplies(thread.id)}
              className={`mt-3 text-sky-400 text-sm font-cairo hover:underline ${isRTL ? 'text-right w-full' : ''}`}
              data-testid={`show-replies-${thread.id}`}
            >
              {txt.viewReplies} ({thread.replies_count})
            </button>
          )}
          
          {/* Replies List */}
          {threadReplies && threadReplies.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
              {threadReplies.map((reply) => (
                <div key={reply.id} className={`flex gap-3 p-3 bg-slate-900/50 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img 
                    src={reply.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author?.username}`} 
                    alt="" 
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-cairo font-bold text-white text-sm">{reply.author?.name || reply.author?.username}</span>
                      <span className="text-slate-500 text-xs" dir="ltr">@{reply.author?.username}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-500 text-xs">{formatTime(reply.created_at)}</span>
                    </div>
                    {reply.replying_to && reply.replying_to.username && (
                      <div className={`flex items-center gap-1 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-slate-500 text-xs">{txt.replyingTo}</span>
                        <span className="text-sky-400 text-xs" dir="ltr">@{reply.replying_to.username}</span>
                      </div>
                    )}
                    <p className={`text-white font-almarai text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreadCard;
