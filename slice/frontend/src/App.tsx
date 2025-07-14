import React, { useState, useRef, useEffect } from 'react';
import { Button, TextField, Paper, Typography, Box, Stack, Tooltip, LinearProgress, Alert, AppBar, Toolbar, Container } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import HistoryIcon from '@mui/icons-material/History';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SilenceIcon from '@mui/icons-material/VolumeMute';
import FadeIcon from '@mui/icons-material/Gradient';
import './App.css';

const API_URL = 'http://localhost:8000';

const theme = createTheme({
  palette: {
    primary: { main: '#4f8cff' },
    secondary: { main: '#ff4081' },
    background: { default: '#f7f7fa' },
  },
  shape: { borderRadius: 12 },
});

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
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
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFilename(data.filename);
      setMessage('Upload successful!');
      // Detect silence after upload
      if (data.filename) {
        await fetchSilence(data.filename);
      }
    } catch (err: any) {
      setError(err.message || 'Upload error');
    }
    setLoading(false);
  };

  const fetchSilence = async (fname: string) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/detect_silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fname, silence_thresh: silenceThresh, min_silence_len: minSilenceLen, padding }),
      });
      if (!res.ok) throw new Error('Silence detection failed');
      const data = await res.json();
      setSilentSegments(data.silent_segments || []);
      setMessage('Silence detection complete!');
    } catch (err: any) {
      setError(err.message || 'Silence detection error');
    }
    setLoading(false);
  };

  const handleRemoveSilence = async () => {
    if (!filename) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/remove_silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, silence_thresh: silenceThresh, min_silence_len: minSilenceLen, padding }),
      });
      if (!res.ok) throw new Error('Silence removal failed');
      const data = await res.json();
      if (data.output_filename) {
        setProcessedUrl(`${API_URL}/download/${data.output_filename}`);
        setMessage('Silence removed!');
      } else {
        setError('Silence removal error');
      }
    } catch (err: any) {
      setError(err.message || 'Silence removal error');
    }
    setLoading(false);
  };

  const handlePromptEdit = async () => {
    if (!filename || !prompt) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, prompt }),
      });
      if (!res.ok) throw new Error('Edit failed');
      const data = await res.json();
      if (data.output_filename) {
        setEditedUrl(`${API_URL}/download/${data.output_filename}`);
        setMessage('Edit applied!');
      } else {
        setError(data.message || 'Edit error');
      }
    } catch (err: any) {
      setError(err.message || 'Edit error');
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

  // Update history after upload, silence removal, or edit
  useEffect(() => {
    if (processedUrl) {
      const newHistory = history.slice(0, historyIndex + 1).concat(processedUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [processedUrl]);
  useEffect(() => {
    if (editedUrl) {
      const newHistory = history.slice(0, historyIndex + 1).concat(editedUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [editedUrl]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };
  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const handleReset = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setProcessedUrl(null);
    setEditedUrl(null);
    setMessage('Reset to original video.');
    setError(null);
  };

  const currentVideoUrl =
    historyIndex >= 0 && history[historyIndex]
      ? history[historyIndex]
      : processedUrl || editedUrl || videoUrl;

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" sx={{ mb: 2 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Slice: Agentic Video Editor
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>1. Upload Video</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Tooltip title="Select a video file to edit" arrow>
                <input type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} disabled={!videoFile || loading}>
                  Upload Video
                </Button>
              </Tooltip>
              <Button variant="outlined" onClick={handleUpload} disabled={!videoFile || loading} sx={{ ml: 1 }}>
                {loading ? <LinearProgress size={24} /> : 'Upload'}
              </Button>
              {videoUrl && (
                <Button variant="outlined" onClick={handleReset} sx={{ ml: 1 }}>
                  Reset to Original
                </Button>
              )}
            </Box>
            {videoUrl && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Preview</Typography>
                <video ref={videoRef} src={videoUrl} controls width="100%" style={{ maxWidth: '100%' }} />
              </Box>
            )}
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>2. Silence Detection</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Tooltip title="Threshold below which audio is considered silence (dBFS)" arrow>
                <TextField
                  label="Silence Threshold (dB)"
                  type="number"
                  value={silenceThresh}
                  onChange={e => setSilenceThresh(Number(e.target.value))}
                  size="small"
                  sx={{ mr: 2 }}
                />
              </Tooltip>
              <Tooltip title="Minimum length of silence to detect (milliseconds)" arrow>
                <TextField
                  label="Min Silence (ms)"
                  type="number"
                  value={minSilenceLen}
                  onChange={e => setMinSilenceLen(Number(e.target.value))}
                  size="small"
                  sx={{ mr: 2 }}
                />
              </Tooltip>
              <Tooltip title="Padding to keep around non-silent segments (milliseconds)" arrow>
                <TextField
                  label="Padding (ms)"
                  type="number"
                  value={padding}
                  onChange={e => setPadding(Number(e.target.value))}
                  size="small"
                />
              </Tooltip>
            </Box>
            {filename && (
              <Button variant="contained" onClick={handleRemoveSilence} disabled={loading}>
                {loading ? <LinearProgress size={24} /> : 'Remove Silence'}
              </Button>
            )}
            {videoUrl && silentSegments.length > 0 && renderTimeline()}
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>3. Edit with Natural Language</Typography>
            {filename && (
              <Box sx={{ mt: 2 }}>
                <Tooltip title="Describe your edit, e.g. 'cut from 10 to 20 seconds', 'mute from 5 to 10 seconds', 'fade in for 2 seconds at start'" arrow>
                  <TextField
                    label="Edit with natural language..."
                    variant="outlined"
                    fullWidth
                    value={prompt}
                    onChange={handlePromptChange}
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                  />
                </Tooltip>
                <Button variant="contained" onClick={handlePromptEdit} disabled={loading || !prompt}>
                  {loading ? <LinearProgress size={24} /> : 'Apply Edit'}
                </Button>
              </Box>
            )}
          </Paper>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>4. Edit History</Typography>
            {history.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Tooltip title="Undo last edit" arrow>
                  <Button variant="outlined" onClick={handleUndo} disabled={historyIndex <= 0}>
                    <UndoIcon /> Undo
                  </Button>
                </Tooltip>
                <Tooltip title="Redo edit" arrow>
                  <Button variant="outlined" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                    <RedoIcon /> Redo
                  </Button>
                </Tooltip>
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Version {historyIndex + 1} / {history.length}
                </Typography>
              </Box>
            )}
            {currentVideoUrl && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Current Video</Typography>
                <video src={currentVideoUrl} controls width="100%" style={{ maxWidth: '100%' }} />
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" startIcon={<DownloadIcon />}>
                    <a href={currentVideoUrl} download style={{ textDecoration: 'none', color: 'inherit' }}>
                      Download
                    </a>
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255,255,255,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 60, height: 60, border: '8px solid #eee', borderTop: '8px solid #4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
    </ThemeProvider>
  );
}

export default function WrappedApp() {
  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}
