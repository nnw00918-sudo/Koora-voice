/**
 * Custom hook for room chat functionality
 * Handles messages, mentions, image sending
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../../config/api';

export const useRoomChat = ({ roomId, token, user, participants, isRTL, sendMessageViaWebSocket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Check if user can send images
  const canSendImages = useCallback(() => {
    if (user?.role === 'owner' || user?.role === 'admin') return true;
    if (user?.is_vip) return true;
    const userRole = participants.find(p => p.id === user?.id);
    if (userRole?.role === 'admin' || userRole?.role === 'mod') return true;
    return false;
  }, [user, participants]);

  // Handle image selection
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الصورة كبير جداً (الحد 5MB)' : 'Image too large (max 5MB)');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'الملف ليس صورة' : 'File is not an image');
      return;
    }
    
    setSelectedImage(file);
  }, [isRTL]);

  // Upload image and send message
  const handleSendImageMessage = useCallback(async () => {
    if (!selectedImage) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('room_id', roomId);
      
      const response = await axios.post(`${API}/rooms/${roomId}/messages/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessages(prev => [...prev, response.data]);
      setSelectedImage(null);
      toast.success(isRTL ? 'تم إرسال الصورة' : 'Image sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل إرسال الصورة' : 'Failed to send image'));
    } finally {
      setUploadingImage(false);
    }
  }, [selectedImage, roomId, token, isRTL]);

  // Send message
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    
    if (selectedImage) {
      await handleSendImageMessage();
      if (!newMessage.trim()) return;
    }
    
    const messageContent = newMessage.trim();
    const replyData = replyingTo ? {
      reply_to_id: replyingTo.id,
      reply_to_username: replyingTo.username,
      reply_to_content: replyingTo.content?.substring(0, 100)
    } : null;
    
    const sent = sendMessageViaWebSocket?.(messageContent, replyData);
    if (sent) {
      setNewMessage('');
      setReplyingTo(null);
      setShowMentionList(false);
      return;
    }
    
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/messages`, { 
        content: messageContent,
        ...replyData
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setReplyingTo(null);
      setShowMentionList(false);
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  }, [newMessage, selectedImage, replyingTo, roomId, token, sendMessageViaWebSocket, handleSendImageMessage]);

  // Handle @ mention input
  const handleMessageChange = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewMessage(value);
    setMentionCursorPos(cursorPos);

    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionList(true);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  }, []);

  // Insert mention into message
  const insertMention = useCallback((username) => {
    const textBeforeCursor = newMessage.substring(0, mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newMessage.substring(mentionCursorPos);
    
    const newText = textBeforeCursor.substring(0, atIndex) + '@' + username + ' ' + textAfterCursor;
    setNewMessage(newText);
    setShowMentionList(false);
  }, [newMessage, mentionCursorPos]);

  // Get filtered participants for mention
  const filteredMentionUsers = participants.filter(p => 
    p.username?.toLowerCase().includes(mentionSearch) && p.user_id !== user?.id
  );

  // Render message content with mentions highlighted
  const renderMessageContent = useCallback((content) => {
    const mentionRegex = /@(\S+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const isMentioningMe = part.toLowerCase() === user?.username?.toLowerCase();
        return (
          <span 
            key={index} 
            className={`font-bold ${isMentioningMe ? 'text-lime-400 bg-lime-500/20 px-1 rounded' : 'text-sky-400'}`}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  }, [user?.username]);

  // Delete message
  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Are you sure you want to delete this message?')) {
      return;
    }
    try {
      await axios.delete(`${API}/rooms/${roomId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success(isRTL ? 'تم حذف الرسالة' : 'Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل حذف الرسالة' : 'Failed to delete message'));
    }
  }, [roomId, token, isRTL]);

  return {
    // State
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    replyingTo,
    setReplyingTo,
    selectedImage,
    setSelectedImage,
    uploadingImage,
    viewingImage,
    setViewingImage,
    imageZoom,
    setImageZoom,
    showMentionList,
    setShowMentionList,
    mentionSearch,
    filteredMentionUsers,
    // Functions
    canSendImages,
    handleImageSelect,
    handleSendImageMessage,
    handleSendMessage,
    handleMessageChange,
    insertMention,
    renderMessageContent,
    handleDeleteMessage
  };
};

export default useRoomChat;
