import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [silentSegments, setSilentSegments] = useState<Array<[number, number]>>([]);
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const [editRegion, setEditRegion] = useState<{action: string, start?: number, end?: number, duration?: number} | null>(null);
  const [silenceThresh, setSilenceThresh] = useState(-40);
  const [minSilenceLen, setMinSilenceLen] = useState(700);
  const [padding, setPadding] = useState(200);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setProcessedUrl(null);
      setFilename(null);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', videoFile);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setFilename(data.filename);
    setLoading(false);
    // Detect silence after upload
    if (data.filename) {
      await fetchSilence(data.filename);
    }
  };

  const fetchSilence = async (fname: string) => {
    setLoading(true);
    const res = await fetch(`${API_URL}/detect_silence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: fname, silence_thresh: silenceThresh, min_silence_len: minSilenceLen, padding }),
    });
    const data = await res.json();
    setSilentSegments(data.silent_segments || []);
    setLoading(false);
  };

  const handleRemoveSilence = async () => {
    if (!filename) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/remove_silence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, silence_thresh: silenceThresh, min_silence_len: minSilenceLen, padding }),
    });
    const data = await res.json();
    if (data.output_filename) {
      setProcessedUrl(`${API_URL}/download/${data.output_filename}`);
    }
    setLoading(false);
  };

  const handlePromptEdit = async () => {
    if (!filename || !prompt) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, prompt }),
    });
    const data = await res.json();
    if (data.output_filename) {
      setEditedUrl(`${API_URL}/download/${data.output_filename}`);
    } else {
      alert(JSON.stringify(data, null, 2));
    }
    setLoading(false);
  };

  const handlePromptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    setEditRegion(null);
    if (e.target.value.trim()) {
      // Call backend to parse prompt
      const res = await fetch(`${API_URL}/parse_prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: e.target.value }),
      });
      const data = await res.json();
      setEditRegion(data.instructions);
    }
  };

  // Timeline rendering helper
  const renderTimeline = () => {
    if (!videoRef.current || !videoRef.current.duration) return null;
    const duration = videoRef.current.duration;
    // Helper to get color for action
    const actionColor = (action: string) => {
      switch (action) {
        case 'cut': return 'rgba(255,0,0,0.6)';
        case 'trim': return 'rgba(0,200,0,0.5)';
        case 'mute': return 'rgba(0,0,255,0.4)';
        case 'fade_in': return 'rgba(128,0,128,0.4)';
        default: return 'rgba(0,0,0,0.1)';
      }
    };
    return (
      <div style={{ position: 'relative', width: 400, height: 24, background: '#e0e0e0', borderRadius: 8, marginTop: 8 }}>
        {silentSegments.map(([start, end], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(start / duration) * 100}%`,
              width: `${((end - start) / duration) * 100}%`,
              height: '100%',
              background: 'rgba(255,0,0,0.2)',
              borderRadius: 8,
            }}
            title={`Silence: ${start.toFixed(2)}s - ${end.toFixed(2)}s`}
          />
        ))}
        {editRegion && editRegion.action !== 'noop' && (
          <div
            style={{
              position: 'absolute',
              left: `${((editRegion.start ?? 0) / duration) * 100}%`,
              width: `${(((editRegion.end ?? (editRegion.duration ?? 0)) - (editRegion.start ?? 0)) / duration) * 100}%`,
              height: '100%',
              background: actionColor(editRegion.action),
              borderRadius: 8,
              border: '2px solid #333',
              zIndex: 2,
            }}
            title={`Edit: ${editRegion.action}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Slice: Agentic Video Editor</h1>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!videoFile || loading}>
        Upload
      </button>
      {videoUrl && (
        <div>
          <h3>Preview</h3>
          <video ref={videoRef} src={videoUrl} controls width={400} />
          {silentSegments.length > 0 && renderTimeline()}
        </div>
      )}
      {filename && (
        <div style={{ marginTop: 20 }}>
          <button onClick={handleRemoveSilence} disabled={loading}>
            Remove Silence
          </button>
        </div>
      )}
      {processedUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>Processed Video</h3>
          <video src={processedUrl} controls width={400} />
          <div>
            <a href={processedUrl} download>
              <button>Download</button>
            </a>
          </div>
        </div>
      )}
      {editedUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>Edited Video</h3>
          <video src={editedUrl} controls width={400} />
          <div>
            <a href={editedUrl} download>
              <button>Download</button>
            </a>
          </div>
        </div>
      )}
      {filename && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Edit with natural language..."
            value={prompt}
            onChange={handlePromptChange}
            style={{ width: 300 }}
          />
          <button onClick={handlePromptEdit} disabled={loading || !prompt}>
            Apply Edit
          </button>
        </div>
      )}
      {loading && <p>Processing...</p>}
      <div style={{ margin: '16px 0' }}>
        <label>Silence Threshold (dB): <input type="number" value={silenceThresh} onChange={e => setSilenceThresh(Number(e.target.value))} style={{ width: 60 }} /></label>
        <label style={{ marginLeft: 16 }}>Min Silence (ms): <input type="number" value={minSilenceLen} onChange={e => setMinSilenceLen(Number(e.target.value))} style={{ width: 80 }} /></label>
        <label style={{ marginLeft: 16 }}>Padding (ms): <input type="number" value={padding} onChange={e => setPadding(Number(e.target.value))} style={{ width: 60 }} /></label>
      </div>
    </div>
  );
}

export default App;
