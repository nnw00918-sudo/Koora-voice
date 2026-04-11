/**
 * Custom hook for room recording functionality
 * Handles audio/video recording
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useRoomRecording = ({ localAudioTrack, localVideoTrack, isRTL }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      let stream;
      
      // If video is on, record both
      if (localVideoTrack) {
        const videoStream = localVideoTrack.getMediaStreamTrack();
        const audioStream = localAudioTrack.getMediaStreamTrack();
        stream = new MediaStream([videoStream, audioStream]);
      } else if (localAudioTrack) {
        // Audio only
        const audioStream = localAudioTrack.getMediaStreamTrack();
        stream = new MediaStream([audioStream]);
      } else {
        toast.error(isRTL ? 'يجب أن تكون على المنصة للتسجيل' : 'You must be on stage to record');
        return;
      }

      // Clear old interval if exists
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: localVideoTrack ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus'
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: localVideoTrack ? 'video/webm' : 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `room-recording-${date}.${localVideoTrack ? 'webm' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(isRTL ? 'تم حفظ التسجيل' : 'Recording saved');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success(isRTL ? 'بدأ التسجيل' : 'Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error(isRTL ? 'فشل بدء التسجيل' : 'Failed to start recording');
    }
  }, [localAudioTrack, localVideoTrack, isRTL]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  // Format recording time
  const formatRecordingTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    formatRecordingTime
  };
};

export default useRoomRecording;
