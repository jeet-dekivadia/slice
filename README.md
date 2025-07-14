# Slice: Agentic Video Editor

Slice is an agentic video editor that automatically removes silences and enables editors to modify videos using natural language prompts.

## Features
- **Silence Removal:** Automatically detects and removes silent segments from videos.
- **Natural Language Editing:** Edit videos with plain English commands (e.g., "remove the part where I say 'um'", "add a fade-in at the start").
- **Web UI:** Upload, preview, and edit videos in your browser.
- **Export:** Download the edited video.

## Project Structure
```
/slice
  /backend
    main.py
    requirements.txt
    video_utils.py
    nlp_agent.py
    /uploads
    /outputs
  /frontend
    (React app: src/, public/, package.json, etc.)
```
