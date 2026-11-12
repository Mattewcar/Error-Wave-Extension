import React, { useEffect, useRef } from 'react';

export interface AudioPlayerRef {
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

interface Props {
  trackUrl: string;
  isPlaying: boolean;
  onProgress: (currentTime: number, duration: number) => void;
  onEnded: () => void;
}

export const AudioPlayer = React.forwardRef<AudioPlayerRef, Props>(({ 
  trackUrl, isPlaying, onProgress, onEnded 
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  React.useImperativeHandle(ref, () => ({
    seekTo: (seconds) => { if (audioRef.current) audioRef.current.currentTime = seconds; },
    setVolume: (volume) => { if (audioRef.current) audioRef.current.volume = volume / 100; }
  }));

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(e => console.log("Play blocked", e));
    else audioRef.current.pause();
  }, [isPlaying, trackUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => onProgress(audio.currentTime, audio.duration || 0);
    const handleEnded = () => onEnded();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onProgress, onEnded]);

  return <audio ref={audioRef} src={trackUrl} crossOrigin="anonymous" />;
});