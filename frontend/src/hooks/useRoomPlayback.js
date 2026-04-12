/**
 * Custom hook for room playback features
 * Handles reactions, polls, watch party
 */
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../config/api';

export const useRoomPlayback = ({ roomId, token, user }) => {
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [watchParty, setWatchParty] = useState(null);
  const [showWatchPartyModal, setShowWatchPartyModal] = useState(false);
  const reactionIdRef = useRef(0);

  // Send Reaction
  const handleSendReaction = useCallback(async (emoji) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/reactions`, 
        { reaction: emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Immediately show own reaction locally
      const localReaction = {
        id: `local-${reactionIdRef.current++}`,
        reaction: emoji,
        user_id: user.id,
        username: user.username
      };
      setFloatingReactions(prev => [...prev, localReaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== localReaction.id));
      }, 3500);
    } catch (error) {
      toast.error('فشل إرسال التفاعل');
    }
  }, [roomId, token, user]);

  // Create Poll
  const handleCreatePoll = useCallback(async (pollData) => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/polls`, pollData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePoll(response.data.poll);
      toast.success('تم إنشاء الاستطلاع');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنشاء الاستطلاع');
    }
  }, [roomId, token]);

  // Vote in Poll
  const handleVotePoll = useCallback(async (optionId) => {
    if (!activePoll) return;
    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/polls/${activePoll.id}/vote`,
        { option_id: optionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivePoll(response.data.poll);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل التصويت');
    }
  }, [activePoll, roomId, token]);

  // Close Poll
  const handleClosePoll = useCallback(async () => {
    if (!activePoll) return;
    try {
      await axios.delete(`${API}/rooms/${roomId}/polls/${activePoll.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePoll(null);
      toast.success('تم إغلاق الاستطلاع');
    } catch (error) {
      toast.error('فشل إغلاق الاستطلاع');
    }
  }, [activePoll, roomId, token]);

  // Start Watch Party
  const handleStartWatchParty = useCallback(async (data) => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/watch-party`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchParty(response.data.watch_party);
      setShowWatchPartyModal(false);
      toast.success('تم بدء Watch Party! 🎉');
    } catch (error) {
      console.error('Watch Party error:', error);
      toast.error(error.response?.data?.detail || 'فشل بدء Watch Party');
    }
  }, [roomId, token]);

  // Sync Watch Party
  const handleSyncWatchParty = useCallback(async (currentTime, isPlaying) => {
    if (!watchParty) return;
    try {
      await axios.put(`${API}/rooms/${roomId}/watch-party/sync`, 
        { current_time: currentTime, is_playing: isPlaying },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to sync watch party:', error);
    }
  }, [watchParty, roomId, token]);

  // End Watch Party
  const handleEndWatchParty = useCallback(async () => {
    try {
      await axios.delete(`${API}/rooms/${roomId}/watch-party`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchParty(null);
      toast.success('تم إنهاء Watch Party');
    } catch (error) {
      toast.error('فشل إنهاء Watch Party');
    }
  }, [roomId, token]);

  // Change Watch Party Channel
  const handleChangeChannel = useCallback(async (channelId) => {
    try {
      await axios.put(`${API}/rooms/${roomId}/watch-party/channel/${channelId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to change channel:', error);
    }
  }, [roomId, token]);

  return {
    // State
    floatingReactions,
    setFloatingReactions,
    activePoll,
    setActivePoll,
    showCreatePollModal,
    setShowCreatePollModal,
    watchParty,
    setWatchParty,
    showWatchPartyModal,
    setShowWatchPartyModal,
    // Functions
    handleSendReaction,
    handleCreatePoll,
    handleVotePoll,
    handleClosePoll,
    handleStartWatchParty,
    handleSyncWatchParty,
    handleEndWatchParty,
    handleChangeChannel
  };
};

export default useRoomPlayback;
