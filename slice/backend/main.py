from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from video_utils import remove_silence_from_video
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
async def remove_silence(filename: str):
    input_path = os.path.join(UPLOAD_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, f"nosilence_{filename}")
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        remove_silence_from_video(input_path, output_path)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    return {"output_filename": f"nosilence_{filename}"}

@app.post("/edit")
async def edit_video(filename: str, prompt: str):
    # Placeholder: parse prompt and return dummy response
    instructions = parse_edit_prompt(prompt)
    # TODO: Apply instructions to video
    return {"instructions": instructions, "message": "Edit endpoint not yet implemented"}

@app.get("/download/{filename}")
def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)