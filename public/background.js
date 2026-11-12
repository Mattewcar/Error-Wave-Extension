let isCreatingOffscreen = false;
let lastTrackEndTime = 0;
// ВАША НОВАЯ ССЫЛКА RENDER
const API_URL = "https://error-wave.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkTrack', { periodInMinutes: 0.05 }); 
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTrack') {
    checkCurrentTrackStatus();
  }
});

async function checkCurrentTrackStatus() {
  const data = await chrome.storage.local.get(['currentTime', 'duration', 'isPlaying', 'hasError']);
  if (data.hasError) return;
  if (data.isPlaying && data.duration > 0 && data.currentTime >= data.duration - 1.5) {
    handleNextTrack();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INIT_QUEUE') {
    chrome.storage.local.get(['queue', 'currentIndex', 'isPlaying', 'volume', 'streamUrl', 'currentTime']).then(async (data) => {
      if (data.queue && data.queue.length > 0 && data.streamUrl) {
        chrome.runtime.sendMessage({ 
          type: 'SYNC_STATE', 
          index: data.currentIndex,
          isPlaying: data.isPlaying !== false,
          volume: data.volume !== undefined ? data.volume : 75,
          currentTime: data.currentTime || 0
        }).catch(() => {});
      } else if (data.queue && data.queue.length > 0) {
        chrome.storage.local.set({ hasError: false });
        playCurrentTrack();
      } else {
        chrome.storage.local.set({ 
          queue: message.queue, 
          currentIndex: message.currentIndex,
          isPlaying: false,
          volume: 75,
          hasError: false
        }).then(() => playCurrentTrack());
      }
    });
  }
  else if (message.type === 'UPDATE_QUEUE') {
    chrome.storage.local.set({ queue: message.queue, hasError: false });
  }
  else if (message.type === 'SELECT_TRACK') {
    chrome.storage.local.set({ currentIndex: message.index, currentTime: 0, duration: 0, isPlaying: true, streamUrl: null, hasError: false }).then(() => {
      playCurrentTrack();
    });
  }
  else if (message.type === 'NEXT_TRACK_MANUAL') {
    chrome.storage.local.set({ hasError: false });
    handleNextTrack();
  }
  else if (message.type === 'TRACK_ENDED') {
    const now = Date.now();
    if (now - lastTrackEndTime > 3000) {
      lastTrackEndTime = now;
      handleNextTrack();
    }
  }
  else if (message.type === 'PLAY_PAUSE') {
    chrome.storage.local.set({ isPlaying: message.isPlaying });
    forwardToOffscreen({ type: message.isPlaying ? 'PLAY' : 'PAUSE' });
  }
  else if (message.type === 'SEEK') {
    forwardToOffscreen({ type: 'SEEK', seconds: message.seconds });
  }
  else if (message.type === 'VOLUME') {
    chrome.storage.local.set({ volume: message.volume });
    forwardToOffscreen({ type: 'VOLUME', volume: message.volume });
  }
  else if (message.type === 'TIME_UPDATE') {
    chrome.storage.local.set({ currentTime: message.currentTime, duration: message.duration });
  }
});

async function handleNextTrack() {
  const data = await chrome.storage.local.get(['queue', 'currentIndex', 'hasError']);
  if (data.hasError || !data.queue || data.queue.length === 0) return;
  
  const nextIndex = (data.currentIndex + 1) % data.queue.length;
  await chrome.storage.local.set({ currentIndex: nextIndex, currentTime: 0, duration: 0, isPlaying: true, streamUrl: null });
  
  playCurrentTrack();
  chrome.runtime.sendMessage({ type: 'TRACK_CHANGED', index: nextIndex }).catch(() => {});
}

async function playCurrentTrack() {
  const data = await chrome.storage.local.get(['queue', 'currentIndex', 'isPlaying', 'volume']);
  if (!data.queue || data.queue.length === 0) return;
  
  const track = data.queue[data.currentIndex];
  const isPlaying = data.isPlaying !== false;
  const volume = data.volume !== undefined ? data.volume : 75;
  
  try {
    const res = await fetch(`${API_URL}/api/stream?url=${encodeURIComponent(track.url)}`);
    if (!res.ok) throw new Error("Server error " + res.status);
    const dataJson = await res.json();
    
    if (dataJson.mp3Url) {
      await chrome.storage.local.set({ streamUrl: dataJson.mp3Url, hasError: false });
      await createOffscreenDocument();
      forwardToOffscreen({ type: 'SET_STREAM', streamUrl: dataJson.mp3Url, isPlaying, volume });
    } else {
      throw new Error("No MP3 URL");
    }
  } catch (e) {
    console.error("Stream error", e);
    await chrome.storage.local.set({ hasError: true, isPlaying: false });
    chrome.runtime.sendMessage({ type: 'PLAYBACK_ERROR' }).catch(() => {});
  }
}

function forwardToOffscreen(message) {
  createOffscreenDocument().then(() => {
    chrome.runtime.sendMessage(message).catch(() => {
      setTimeout(() => chrome.runtime.sendMessage(message).catch(() => {}), 500);
    });
  });
}

async function createOffscreenDocument() {
  if (isCreatingOffscreen) return;
  isCreatingOffscreen = true;

  const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existingContexts.length > 0) {
    isCreatingOffscreen = false;
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playing SoundCloud audio'
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  isCreatingOffscreen = false;
}