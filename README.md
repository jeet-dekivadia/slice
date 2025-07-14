# Slice: Agentic Video Editor

Slice is an agentic video editor that automatically removes silences and enables editors to modify videos using natural language prompts.

## Features
- **Silence Removal:** Automatically detects and removes silent segments from videos.
- **Natural Language Editing:** Edit videos with plain English commands (e.g., "remove the part where I say 'um'", "add a fade-in at the start").
- **Web UI:** Upload, preview, and edit videos in your browser.
- **Export:** Download the edited video.
- **Edit History:** Undo/redo edits and reset to the original video.
- **Beautiful, modern, responsive UI.**

## Requirements
- Python 3.8+
- Node.js 18+
- ffmpeg (must be installed and available in PATH)

## Backend Setup
1. **Install Python dependencies:**
   ```bash
   cd slice/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Run the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend Setup
1. **Install Node dependencies:**
   ```bash
   cd slice/frontend
   npm install
   ```
2. **Run the frontend dev server:**
   ```bash
   npm start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000)

## Usage Guide
1. **Upload a video** (mp4, mov, etc.).
2. **Adjust silence detection parameters** (threshold, min silence, padding) as needed.
3. **Remove silence** to automatically cut silent parts.
4. **Edit with natural language** using prompts like:
   - `cut from 10 to 20 seconds`
   - `trim to first 30 seconds`
   - `mute from 5 to 10 seconds`
   - `fade in for 2 seconds at start`
5. **Undo/redo** edits or **reset to original** at any time.
6. **Download** the current video version.

## Example Prompts
- `cut from 10 to 20 seconds`
- `trim to first 30 seconds`
- `mute from 5 to 10 seconds`
- `fade in for 2 seconds at start`

## Troubleshooting
- **ffmpeg not found:** Make sure ffmpeg is installed and in your PATH.
- **Large videos:** Processing may take time; progress is shown in the UI.
- **Backend not reachable:** Ensure the backend is running on port 8000.
- **Frontend CORS errors:** The backend allows all origins by default; check your browser/network settings if issues persist.

## License
MIT
