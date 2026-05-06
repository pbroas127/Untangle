"""
Untangle — Instagram Reel Generator
Pulls a free Pexels background video, overlays animated text line by line,
outputs a vertical 1080x1920 MP4 to the today's date folder.

Usage: python make-reel.py
Edit the REEL_LINES and PEXELS_QUERY below before running.
"""

import os, sys, requests, textwrap, math, pickle
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from moviepy import VideoFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips
from moviepy.video.fx import CrossFadeIn, CrossFadeOut

# ── CONFIG ─────────────────────────────────────────────────────────────────
PEXELS_API_KEY = "QAOIVsrWbKt1Q5r30bxwIqQ4I2ERGpJSh0aubDZd6r7g89jl579zRI7l"   # ← replace with your free Pexels key

REEL_LINES = [
    "did i say the wrong thing",
    "what if they're mad at me",
    "i should have just—",
    "but what if—",
    "okay. stop.",
    "...",
    "this is the loop.",
    "you can break it.",
    "7 days. 10 minutes a day.",
    "link in bio.",
]

PEXELS_QUERY   = "dark bedroom night insomnia awake"   # controls what background footage is pulled
SECONDS_PER_LINE = 2.2                 # how long each line shows
FADE_FRAMES    = 12                    # fade-in speed (frames)

W, H = 1080, 1920                      # vertical 9:16
# ───────────────────────────────────────────────────────────────────────────


def date_folder():
    now = datetime.now()
    return f"{now.month:02d}-{now.day:02d}-{str(now.year)[-2:]}"


def get_pexels_video(query, min_duration):
    """Download a free Pexels video matching the query."""
    headers = {"Authorization": PEXELS_API_KEY}
    url = f"https://api.pexels.com/videos/search?query={query}&per_page=5&orientation=portrait&size=medium"
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    videos = r.json().get("videos", [])
    if not videos:
        raise RuntimeError(f"No Pexels videos found for '{query}'")

    # Pick the first video long enough
    for v in videos:
        if v["duration"] >= min_duration:
            # Prefer HD file
            files = sorted(v["video_files"], key=lambda f: f.get("width", 0), reverse=True)
            for f in files:
                if f.get("width", 0) >= 720:
                    return f["link"]
    return videos[0]["video_files"][0]["link"]


def download_video(url, dest):
    print(f"  Downloading background video...")
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"  Saved to {dest}")


def get_font(size):
    for fp in ["C:/Windows/Fonts/Georgia.ttf", "C:/Windows/Fonts/Garamond.ttf", "C:/Windows/Fonts/Arial.ttf"]:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()

def make_text_frame(text, width=W, height=H, font_size=80):
    """Render a single transparent RGBA frame with centered text."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = get_font(font_size)

    # Word wrap to fit width (with 10% margin each side)
    max_w = int(width * 0.80)
    words = text.split()
    lines, current = [], []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_w and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))

    # Measure total text block height
    line_height = font_size * 1.3
    total_h = len(lines) * line_height
    y = (height - total_h) / 2

    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (width - line_w) / 2
        # Shadow
        draw.text((x + 3, y + 3), line, font=font, fill=(0, 0, 0, 180))
        # White text
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += line_height

    return np.array(img)


def build_reel(lines, bg_path, out_path):
    total_duration = len(lines) * SECONDS_PER_LINE + 2.0
    print(f"\n  Building reel ({total_duration:.0f}s, {len(lines)} lines)...")

    # Load & crop background to 9:16
    bg = VideoFileClip(bg_path)
    # Loop if too short
    if bg.duration < total_duration:
        loops = math.ceil(total_duration / bg.duration)
        bg = concatenate_videoclips([bg] * loops)
    bg = bg.subclipped(0, total_duration)

    # Crop to 1080x1920
    bg_w, bg_h = bg.size
    target_ratio = W / H
    bg_ratio = bg_w / bg_h
    if bg_ratio > target_ratio:
        new_w = int(bg_h * target_ratio)
        x1 = (bg_w - new_w) // 2
        bg = bg.cropped(x1=x1, y1=0, x2=x1 + new_w, y2=bg_h)
    else:
        new_h = int(bg_w / target_ratio)
        y1 = (bg_h - new_h) // 2
        bg = bg.cropped(x1=0, y1=y1, x2=bg_w, y2=y1 + new_h)
    bg = bg.resized((W, H))

    # Dark overlay (ImageClip)
    overlay_img = Image.new("RGBA", (W, H), (0, 0, 0, 140))
    overlay = ImageClip(np.array(overlay_img)).with_duration(total_duration)

    # Text clips — one per line, timed sequentially
    text_clips = []
    for i, line in enumerate(lines):
        start = i * SECONDS_PER_LINE
        frame = make_text_frame(line)
        clip = (
            ImageClip(frame)
            .with_start(start)
            .with_duration(SECONDS_PER_LINE)
            .with_effects([CrossFadeIn(0.4), CrossFadeOut(0.3)])
        )
        text_clips.append(clip)
        print(f"  Line {i+1}/{len(lines)}: \"{line}\"")

    # Untangle end card (last 2 seconds)
    brand_frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(brand_frame)
    brand_font  = get_font(72)
    tag_font    = get_font(30)
    brand_text  = "Untangle"
    tag_text    = "untanglepdfs.com"
    bb = bd.textbbox((0,0), brand_text, font=brand_font)
    bw = bb[2] - bb[0]
    bd.text(((W - bw) / 2, H//2 - 56), brand_text, font=brand_font, fill=(255,255,255,230))
    tb = bd.textbbox((0,0), tag_text, font=tag_font)
    tw = tb[2] - tb[0]
    bd.text(((W - tw) / 2, H//2 + 36), tag_text, font=tag_font, fill=(125,184,125,200))

    end_card = (
        ImageClip(np.array(brand_frame))
        .with_start(total_duration - 2.0)
        .with_duration(2.0)
        .with_effects([CrossFadeIn(0.5)])
    )
    text_clips.append(end_card)

    # Composite everything
    final = CompositeVideoClip([bg, overlay] + text_clips, size=(W, H))
    final = final.with_fps(30)

    print(f"\n  Rendering to {out_path}")
    final.write_videofile(
        out_path,
        codec="libx264",
        audio=False,
        preset="fast",
        ffmpeg_params=["-crf", "23"],
        logger=None,
    )
    print(f"  Done. reel.mp4 saved.")


def upload_to_drive(file_path: Path, filename: str):
    """
    Upload reel to Google Drive (fully automatic after first-time auth).

    ONE-TIME SETUP:
      1. Go to https://console.cloud.google.com/ > APIs & Services > Credentials
      2. Create OAuth 2.0 Client ID (Desktop app) > Download JSON
      3. Rename it to  carousel/drive_credentials.json
      4. Run this script once — a browser window opens to authorize.
         Token is saved to carousel/drive_token.pickle for all future runs.

    Install deps:  pip install google-api-python-client google-auth-oauthlib
    """
    CREDS_FILE = Path(__file__).parent / "drive_credentials.json"
    TOKEN_FILE = Path(__file__).parent / "drive_token.pickle"
    SCOPES     = ["https://www.googleapis.com/auth/drive.file"]

    if not CREDS_FILE.exists():
        print("  [Drive] Skipping upload — add drive_credentials.json to enable auto-upload.")
        return

    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        print("  [Drive] pip install google-api-python-client google-auth-oauthlib")
        return

    creds = None
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)

    service = build("drive", "v3", credentials=creds)
    media   = MediaFileUpload(str(file_path), mimetype="video/mp4", resumable=True)
    result  = service.files().create(
        body={"name": filename},
        media_body=media,
        fields="id,name,webViewLink"
    ).execute()
    link = result.get("webViewLink") or f"https://drive.google.com/file/d/{result['id']}/view"
    print(f"  Uploaded to Drive: {link}")


def write_reel_caption(lines, folder):
    """Auto-generate a reel-caption.txt from the reel lines."""
    hook  = f"{lines[0]} {lines[1]}" if len(lines) > 1 else lines[0]
    body  = "\n".join(lines[2:-1]) if len(lines) > 3 else ""
    parts = [hook, ""]
    if body:
        parts += [body, ""]
    parts += [
        "If your brain does this at 2am, you're not broken. You're stuck in a loop that can be unlearned.",
        "",
        "The Stop Overthinking guide gives you 7 days of CBT-backed exercises. 10 minutes a day. No therapist. No app.",
        "",
        "Link in bio to grab it for $14.",
        "",
        "—",
        "",
        "#overthinking #mentalhealth #anxietyrelief #quietmind #cbt #anxietymanagement #selfhelp #mindset #mentalhealthtips #stopoverthinking #mentalhealthawareness #innerpeace #digitaldownload #selfhelpbooks #untangle",
    ]
    caption_path = folder / "reel-caption.txt"
    caption_path.write_text("\n".join(parts), encoding="utf-8")
    print(f"  Caption saved: {caption_path.name}")


def main():
    if PEXELS_API_KEY == "PASTE_YOUR_KEY_HERE":
        print("ERROR: Add your Pexels API key at the top of make-reel.py")
        sys.exit(1)

    folder = Path(__file__).parent / date_folder()
    folder.mkdir(exist_ok=True)

    bg_path  = folder / "bg.mp4"
    out_path = folder / "reel.mp4"

    # Use local video if present, otherwise download from Pexels
    idea_path = folder / "idea.mp4"
    if idea_path.exists():
        bg_path = idea_path
        print("  Using local idea.mp4 as background.")
    else:
        video_url = get_pexels_video(PEXELS_QUERY, min_duration=len(REEL_LINES) * SECONDS_PER_LINE)
        download_video(video_url, str(bg_path))

    # Build reel
    build_reel(REEL_LINES, str(bg_path), str(out_path))

    # Auto-generate caption
    write_reel_caption(REEL_LINES, folder)

    # Auto-upload to Google Drive
    upload_to_drive(out_path, f"reel-{date_folder()}.mp4")

    print(f"\nReady to post: carousel/{date_folder()}/reel.mp4")
    print("Tip: Add music inside Instagram when posting — free and no copyright issues.")


if __name__ == "__main__":
    main()
