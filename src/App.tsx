import { FormEvent, ReactNode, useMemo, useState, useEffect } from "react";

type Track = {
  id: number;
  title: string;
  artist: string;
  addedBy: string;
  image: string;
  url: string;
};

const defaultImage = "https://images.unsplash.com/photo-1645523906730-894addb64d64?auto=format&fit=crop&w=1200&q=88";
const API_URL = "https://error-wave.onrender.com";

const initialTracks: Track[] = [
  { id: 1, title: "PIXEL DREAM", artist: "SoundHelix", addedBy: "@user", image: defaultImage, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
];

function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: "plus" | "arrow" | "play" | "pause" | "user" | "close" | "next" | "volume"; size?: number; strokeWidth?: number; }) {
  const paths: Record<typeof name, ReactNode> = {
    plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
    arrow: (<><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>),
    play: <path d="m9 6 9 6-9 6V6Z" />,
    pause: (<><path d="M9 7v10" /><path d="M15 7v10" /></>),
    next: (<><path d="m7 7 8 5-8 5V7Z" /><path d="M17 7v10" /></>),
    user: (<><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></>),
    close: (<><path d="m7 7 10 10" /><path d="m17 7-10 10" /></>),
    volume: (<><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="M15 9.5c1.3 1.2 1.3 3.8 0 5" /></>),
  };
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
      {paths[name]}
    </svg>
  );
}

function AddInput({ onAdd, placeholder = "PASTE SOUNDCLOUD LINK" }: { onAdd: (value: string) => void; placeholder?: string; }) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  }
  return (
    <form className="add-input" onSubmit={submit}>
      <input onChange={(event) => setValue(event.target.value)} placeholder={placeholder} type="text" value={value} />
      <button className="circle-action" type="submit"><Icon name="plus" size={22} /></button>
    </form>
  );
}

function TrackRow({ track, onSelect, isPlaying }: { track: Track; onSelect?: () => void; isPlaying?: boolean }) {
  const imgSrc = (track.image && track.image.startsWith('http')) ? track.image : defaultImage;
  return (
    <button className={`track-row track-row--popup ${isPlaying ? 'is-playing' : ''}`} onClick={onSelect} type="button">
      <span className="track-art-wrap">
        <img key={imgSrc} alt="" className="track-art" src={imgSrc} onError={(e) => { e.currentTarget.src = defaultImage; }} />
        {isPlaying && <span className="playing-bars"><i /><i /><i /></span>}
      </span>
      <span className="track-copy">
        <strong>{track.title || "UNKNOWN TRACK"}</strong>
        <span>{track.artist || "UNKNOWN ARTIST"}</span>
        <small>ADDED BY {track.addedBy || "@user"}</small>
      </span>
      <span className="row-index">{String(track.id || 0).padStart(2, "0")}</span>
    </button>
  );
}

function Brand() { return <div className="brand">ERROR <span>WAVE</span></div>; }

const formatTime = (secs: number) => {
  if (isNaN(secs)) return "00:00";
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/queue`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setTracks(data);
        else setTracks(initialTracks);
      })
      .catch(() => setTracks(initialTracks));

    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.storage.local.get(['currentIndex', 'isPlaying', 'volume'], (data: any) => {
        if (data.currentIndex !== undefined) setCurrentIndex(data.currentIndex);
        if (data.isPlaying !== undefined) setPlaying(data.isPlaying);
        if (data.volume !== undefined) setVolume(data.volume);
        setIsLoaded(true);
      });
      
      const interval = setInterval(() => {
        (window as any).chrome.storage.local.get(['currentTime', 'duration', 'isPlaying', 'currentIndex'], (data: any) => {
          if (data.currentTime !== undefined) setCurrentTime(data.currentTime);
          if (data.duration !== undefined) setDuration(data.duration);
          if (data.isPlaying !== undefined) setPlaying(data.isPlaying);
          if (data.currentIndex !== undefined) setCurrentIndex(data.currentIndex);
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setIsLoaded(true);
    }
  }, []);

  const current = tracks[currentIndex] || (tracks.length > 0 ? tracks[0] : initialTracks[0]);

  function selectTrack(index: number) {
    setCurrentIndex(index);
    setPlaying(true);
    setCurrentTime(0);
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage({ type: 'SELECT_TRACK', index });
    }
  }

  function nextTrack() {
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage({ type: 'NEXT_TRACK_MANUAL' });
    }
  }

  function togglePlay() {
    const newPlaying = !playing;
    setPlaying(newPlaying);
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage({ type: 'PLAY_PAUSE', isPlaying: newPlaying });
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage({ type: 'SEEK', seconds: seekTime });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage({ type: 'VOLUME', volume: newVol });
    }
  };

  async function addTrack(value: string) {
    if (!value.includes("soundcloud.com")) {
      alert("Пожалуйста, вставьте ссылку из SoundCloud.");
      return;
    }
    setIsLoading(true);
    const id = Date.now(); 
    try {
      const res = await fetch(`${API_URL}/api/stream?url=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      
      if (data.mp3Url) {
        const newTrack = { 
          id, 
          title: data.title || "UNKNOWN", 
          artist: data.artist || "UNKNOWN", 
          addedBy: "@user", 
          image: (data.artwork && data.artwork.startsWith('http')) ? data.artwork : defaultImage, 
          url: value 
        };
        
        await fetch(`${API_URL}/api/queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTrack)
        });

        const newTracks = [...tracks, newTrack];
        setTracks(newTracks);
        
        if ((window as any).chrome && (window as any).chrome.runtime) {
          (window as any).chrome.runtime.sendMessage({ type: 'UPDATE_QUEUE', queue: newTracks });
        }
      } else {
        throw new Error("No MP3 URL");
      }
    } catch (error) {
      console.error(error);
      alert("Ошибка сервера.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isLoaded) return <div style={{ color: 'white', padding: '20px' }}>Загрузка...</div>;

  return (
    <div className="app" style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{`
        input[type=range].volume-slider {
          -webkit-appearance: none; appearance: none; width: 100px; height: 4px; background: #E0E0E0; border-radius: 2px; outline: none; cursor: pointer;
          background-image: linear-gradient(#E53935, #E53935); background-size: ${volume}% 100%; background-repeat: no-repeat;
        }
        input[type=range].volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #E53935; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>

      {isLoading && (
        <div style={{ position: 'fixed', top: 10, right: 10, background: '#E53935', color: 'white', padding: '10px', borderRadius: '8px', zIndex: 999 }}>
          Загрузка из SoundCloud...
        </div>
      )}

      <main className="popup-stage" style={{ height: '100%', overflow: 'auto' }}>
        <section className="popup-shell">
          
          {/* ШАПКА БЕЗ ПРОФИЛЯ */}
          <div className="popup-header floating-card">
            <div className="popup-topline">
              <Brand />
            </div>
            <AddInput onAdd={addTrack} placeholder="PASTE SOUNDCLOUD LINK" />
          </div>

          <article className="mini-player floating-card">
            <img key={current?.image} alt="" src={current?.image || defaultImage} onError={(e) => { e.currentTarget.src = defaultImage; }} />
            <div className="mini-player__body">
              <p className="eyebrow"><span className="live-dot" /> NOW PLAYING</p>
              <h2>{current?.title || "UNKNOWN"}</h2>
              <p className="artist">{current?.artist || "UNKNOWN"}</p>
              
              <div className="mini-progress" onClick={handleSeek} style={{ cursor: 'pointer' }}>
                <span style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>

              <div className="mini-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{formatTime(currentTime)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={togglePlay} type="button"><Icon name={playing ? "pause" : "play"} size={19} /></button>
                  <button onClick={nextTrack} type="button"><Icon name="next" size={19} /></button>
                </div>
                <span>{formatTime(duration)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px', gap: '10px' }}>
                <Icon name="volume" size={16} />
                <input type="range" min="0" max="100" value={volume} onChange={handleVolumeChange} className="volume-slider" />
              </div>
            </div>
          </article>
          <div className="popup-queue-head"><h3>UP NEXT</h3><span>{tracks.length} TRACKS</span></div>
          <div className="popup-queue">
            {tracks.map((track: Track, index: number) => (
              <TrackRow 
                key={track.id} 
                track={track} 
                isPlaying={index === currentIndex} 
                onSelect={() => selectTrack(index)} 
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}