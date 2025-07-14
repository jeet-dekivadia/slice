THIS SHOULD BE A LINTER ERRORfrom pydub import AudioSegment, silence
from moviepy.editor import VideoFileClip, concatenate_videoclips
import os
import tempfile

def remove_silence_from_video(input_path, output_path, silence_thresh=-40, min_silence_len=700, padding=200):
    """
    Removes silent parts from a video file.
    Args:
        input_path: Path to the input video file.
        output_path: Path to save the output video file.
        silence_thresh: Silence threshold in dBFS.
        min_silence_len: Minimum length of silence to detect (ms).
        padding: Milliseconds of padding to keep around non-silent segments.
    """
    # Extract audio to a temporary file
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.wav")
        video = VideoFileClip(input_path)
        video.audio.write_audiofile(audio_path, logger=None)
        audio = AudioSegment.from_wav(audio_path)

        # Detect non-silent chunks
        nonsilent = silence.detect_nonsilent(audio, min_silence_len=min_silence_len, silence_thresh=silence_thresh)
        if not nonsilent:
            # If no non-silent parts, just copy the video
            video.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)
            return

        # Add padding and clamp to audio length
        segments = []
        for start, end in nonsilent:
            seg_start = max(0, start - padding)
            seg_end = min(len(audio), end + padding)
            segments.append((seg_start / 1000, seg_end / 1000))  # convert ms to seconds

        # Merge overlapping/adjacent segments
        merged = []
        for seg in segments:
            if not merged or seg[0] > merged[-1][1]:
                merged.append(list(seg))
            else:
                merged[-1][1] = max(merged[-1][1], seg[1])

        # Cut and concatenate video segments
        clips = [video.subclip(start, end) for start, end in merged]
        if clips:
            final = concatenate_videoclips(clips)
            final.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)
        else:
            video.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)