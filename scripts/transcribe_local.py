import sys
import os
import glob
import json
import subprocess

# Setup FFmpeg path dynamically from WinGet packages for Windows
user_profile = os.environ.get("USERPROFILE", "C:\\Users\\venka")
winget_packages_dir = os.path.join(user_profile, "AppData", "Local", "Microsoft", "WinGet", "Packages")
ffmpeg_bins = glob.glob(os.path.join(winget_packages_dir, "Gyan.FFmpeg*", "**", "bin"), recursive=True)
if ffmpeg_bins:
    ffmpeg_bin = ffmpeg_bins[0]
    if ffmpeg_bin not in os.environ["PATH"]:
        os.environ["PATH"] += os.pathsep + ffmpeg_bin

# Now import torch and transformers (they need ffmpeg in PATH to import/run ASR pipeline)
import torch
from transformers import pipeline

def transcribe(file_path):
    # Ensure file exists
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)
        
    temp_wav_path = None
    try:
        # If not already a WAV file, convert it to WAV to bypass ffmpeg stdin/MP4 seek limitations
        ext = os.path.splitext(file_path)[1].lower()
        if ext != ".wav":
            temp_wav_path = os.path.splitext(file_path)[0] + "_temp.wav"
            cmd = ["ffmpeg", "-y", "-i", file_path, temp_wav_path]
            # Run conversion silently
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            asr_input_path = temp_wav_path
        else:
            asr_input_path = file_path

        # Determine CPU/GPU device
        device = 0 if torch.cuda.is_available() else -1
        
        # Initialize whisper pipeline with chunking enabled
        pipe = pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-tiny",
            chunk_length_s=30,
            device=device
        )
        
        # Perform transcription and translate to English automatically
        # return_timestamps=True is required by Whisper tiny for chunked/long audio
        result = pipe(
            asr_input_path,
            generate_kwargs={"task": "translate"},
            return_timestamps=True
        )
        
        text = result.get("text", "").strip()
        
        if not text:
            raise ValueError("Whisper returned empty transcript")
            
        # Write transcription text to a companion .txt file (same name as audio file but with .txt extension)
        txt_path = os.path.splitext(file_path)[0] + ".txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
            
        # Output success JSON
        output = {
            "success": True,
            "text": text,
            "txt_path": txt_path,
            "language": "en"  # translated to English
        }
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)
    finally:
        # Clean up temp WAV file if created
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except Exception:
                pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcribe_local.py <audio_file_path>"}))
        sys.exit(1)
    transcribe(sys.argv[1])
