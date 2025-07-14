from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from video_utils import remove_silence_from_video, detect_silence_segments, cut_video_segment, trim_video, mute_video_segment, fade_in_video
from nlp_agent import parse_edit_prompt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename}

@app.post("/remove_silence")
async def remove_silence(
    filename: str = Body(...),
    silence_thresh: int = Body(-40),
    min_silence_len: int = Body(700),
    padding: int = Body(200)
):
    input_path = os.path.join(UPLOAD_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, f"nosilence_{filename}")
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        remove_silence_from_video(input_path, output_path, silence_thresh, min_silence_len, padding)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    return {"output_filename": f"nosilence_{filename}"}

@app.post("/detect_silence")
async def detect_silence(
    filename: str = Body(...),
    silence_thresh: int = Body(-40),
    min_silence_len: int = Body(700),
    padding: int = Body(200)
):
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        segments = detect_silence_segments(input_path, silence_thresh, min_silence_len, padding)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    return {"silent_segments": segments}

@app.post("/edit")
async def edit_video(filename: str, prompt: str):
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")
    instructions = parse_edit_prompt(prompt)
    output_filename = f"edited_{filename}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        if instructions["action"] == "cut":
            cut_video_segment(input_path, output_path, instructions["start"], instructions["end"])
        elif instructions["action"] == "trim":
            trim_video(input_path, output_path, instructions["start"], instructions["end"])
        elif instructions["action"] == "mute":
            mute_video_segment(input_path, output_path, instructions["start"], instructions["end"])
        elif instructions["action"] == "fade_in":
            fade_in_video(input_path, output_path, instructions["duration"])
        else:
            return {"instructions": instructions, "message": "Edit action not implemented or not recognized."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    return {"output_filename": output_filename}

@app.post("/parse_prompt")
async def parse_prompt(prompt: str):
    instructions = parse_edit_prompt(prompt)
    return {"instructions": instructions}

@app.get("/download/{filename}")
def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)