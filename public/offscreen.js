let audioEl = null;
let currentStreamUrl = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SET_STREAM') {
    const { streamUrl, isPlaying, volume } = message;
    
    if (!audioEl) {
      audioEl = new Audio();
      document.body.appendChild(audioEl);
      audioEl.crossOrigin = "anonymous";
      
      audioEl.addEventListener('ended', () => {
        chrome.runtime.sendMessage({ type: 'TRACK_ENDED' });
      });
      
      audioEl.addEventListener('timeupdate', () => {
        chrome.runtime.sendMessage({ 
          type: 'TIME_UPDATE', 
          currentTime: audioEl.currentTime, 
          duration: audioEl.duration || 0 
        });
      });
    }

    if (currentStreamUrl !== streamUrl) {
      currentStreamUrl = streamUrl;
      audioEl.src = streamUrl;
      audioEl.load();
    }

    audioEl.volume = volume / 100;
    
    if (isPlaying) {
      audioEl.play().catch(e => console.log("Play blocked", e));
    } else {
      audioEl.pause();
    }
  }

  if (message.type === 'PLAY' && audioEl) audioEl.play();
  if (message.type === 'PAUSE' && audioEl) audioEl.pause();
  if (message.type === 'SEEK' && audioEl) audioEl.currentTime = message.seconds;
  if (message.type === 'VOLUME' && audioEl) audioEl.volume = message.volume / 100;
});