import React, { useState, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
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
