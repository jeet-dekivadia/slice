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
      body: JSON.stringify({ filename: fname }),
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
      body: JSON.stringify({ filename }),
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
    // For now, just alert the response
    alert(JSON.stringify(data, null, 2));
    setLoading(false);
  };

  // Timeline rendering helper
  const renderTimeline = () => {
    if (!videoRef.current || !videoRef.current.duration) return null;
    const duration = videoRef.current.duration;
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
              background: 'rgba(255,0,0,0.4)',
              borderRadius: 8,
            }}
            title={`Silence: ${start.toFixed(2)}s - ${end.toFixed(2)}s`}
          />
        ))}
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
      {filename && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Edit with natural language..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            style={{ width: 300 }}
          />
          <button onClick={handlePromptEdit} disabled={loading || !prompt}>
            Apply Edit
          </button>
        </div>
      )}
      {loading && <p>Processing...</p>}
    </div>
  );
}

export default App;
