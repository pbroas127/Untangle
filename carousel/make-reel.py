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

# Each line: text, style (body/italic/impact/sage/small), duration in seconds
# body   = Arial Bold, white  — punchy statements
# italic = Georgia Italic, white — intrusive/anxious thoughts feel
# impact = Georgia Bold, white, large — pattern-break moments
# sage   = Georgia Bold Italic, sage green — the resolution/hope lines
# small  = Arial, dimmer — CTA
REEL_LINES = [
    {"text": "Did I say the wrong thing?",      "style": "italic", "duration": 2.2},
    {"text": "What if they're mad at me?",      "style": "italic", "duration": 2.2},
    {"text": "I should have just",              "style": "italic", "duration": 1.8},
    {"text": "But what if",                     "style": "italic", "duration": 1.6},
    {"text": "STOP.",                           "style": "impact", "duration": 2.0},
    {"text": "This is a thought loop.",         "style": "body",   "duration": 2.2},
    {"text": "It can be broken.",               "style": "sage",   "duration": 2.4},
    {"text": "7 Days.\n10 Minutes a Day.",      "style": "impact", "duration": 2.8},
    {"text": "Link in bio.",                    "style": "small",  "duration": 2.0},
]

PEXELS_QUERY = "dark bedroom night insomnia awake"
FADE_FRAMES  = 12

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


STYLE_CONFIG = {
    # style: (font_paths, size, RGBA color, line_height_mult)
    "italic": (
        ["C:/Windows/Fonts/georgiai.ttf", "C:/Windows/Fonts/georgia.ttf"],
        72, (255, 255, 255, 195), 1.35
    ),
    "body": (
        ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"],
        78, (255, 255, 255, 255), 1.3
    ),
    "impact": (
        ["C:/Windows/Fonts/georgiab.ttf", "C:/Windows/Fonts/georgia.ttf"],
        108, (255, 255, 255, 255), 1.2
    ),
    "sage": (
        ["C:/Windows/Fonts/georgiaz.ttf", "C:/Windows/Fonts/georgiai.ttf"],
        92, (125, 184, 125, 255), 1.3
    ),
    "small": (
        ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"],
        52, (180, 200, 180, 200), 1.3
    ),
}

def get_font(size, style="body"):
    font_paths, _, _, _ = STYLE_CONFIG.get(style, STYLE_CONFIG["body"])
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()

def make_text_frame(text, style="body", width=W, height=H):
    """Render a transparent RGBA frame with styled, centered text."""
    _, font_size, color, lh_mult = STYLE_CONFIG.get(style, STYLE_CONFIG["body"])
    font = get_font(font_size, style)

    img  = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Split on explicit newlines first, then word-wrap each segment
    max_w = int(width * 0.82)
    all_lines = []
    for segment in text.split("\n"):
        words, current = segment.split(), []
        for word in words:
            test = " ".join(current + [word])
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] > max_w and current:
                all_lines.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            all_lines.append(" ".join(current))

    line_height = font_size * lh_mult
    total_h     = len(all_lines) * line_height
    y           = (height - total_h) / 2

    for line in all_lines:
        bbox   = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x      = (width - line_w) / 2

        # Drop shadow
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 140))
        # Main text
        draw.text((x, y), line, font=font, fill=color)
        y += line_height

    return np.array(img)


def build_reel(lines, bg_path, out_path):
    # Support both old list-of-strings and new list-of-dicts format
    def normalise(l):
        if isinstance(l, str):
            return {"text": l, "style": "body", "duration": 2.2}
        return l

    lines = [normalise(l) for l in lines]
    total_duration = sum(l["duration"] for l in lines) + 2.0
    print(f"\n  Building reel ({total_duration:.0f}s, {len(lines)} lines)...")

    # Load & crop background to 9:16
    bg = VideoFileClip(bg_path)
    if bg.duration < total_duration:
        loops = math.ceil(total_duration / bg.duration)
        bg = concatenate_videoclips([bg] * loops)
    bg = bg.subclipped(0, total_duration)

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

    # Dark overlay
    overlay_img = Image.new("RGBA", (W, H), (0, 0, 0, 150))
    overlay = ImageClip(np.array(overlay_img)).with_duration(total_duration)

    # Text clips — per-line style and duration
    text_clips = []
    t = 0.0
    for i, line in enumerate(lines):
        frame = make_text_frame(line["text"], style=line["style"])
        dur   = line["duration"]
        clip  = (
            ImageClip(frame)
            .with_start(t)
            .with_duration(dur)
            .with_effects([CrossFadeIn(0.35), CrossFadeOut(0.25)])
        )
        text_clips.append(clip)
        print(f"  [{line['style']:7s}] {line['text']!r}")
        t += dur

    # Untangle end card (last 2 seconds)
    brand_frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd          = ImageDraw.Draw(brand_frame)
    brand_font  = get_font(82, "impact")
    tag_font    = get_font(34, "small")
    brand_text  = "Untangle"
    tag_text    = "untanglepdfs.com"

    bb = bd.textbbox((0, 0), brand_text, font=brand_font)
    bw = bb[2] - bb[0]
    bd.text(((W - bw) / 2, H // 2 - 60), brand_text, font=brand_font, fill=(255, 255, 255, 235))

    tb = bd.textbbox((0, 0), tag_text, font=tag_font)
    tw = tb[2] - tb[0]
    bd.text(((W - tw) / 2, H // 2 + 44), tag_text, font=tag_font, fill=(125, 184, 125, 210))

    end_card = (
        ImageClip(np.array(brand_frame))
        .with_start(total_duration - 2.0)
        .with_duration(2.0)
        .with_effects([CrossFadeIn(0.5)])
    )
    text_clips.append(end_card)

    final = CompositeVideoClip([bg, overlay] + text_clips, size=(W, H))
    final = final.with_fps(30)

    print(f"\n  Rendering to {out_path}")
    final.write_videofile(
        out_path,
        codec="libx264",
        audio=False,
        preset="ultrafast",
        ffmpeg_params=["-crf", "20"],
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
    total_dur = sum(l["duration"] if isinstance(l, dict) else 2.2 for l in REEL_LINES)
    if idea_path.exists():
        bg_path = idea_path
        print("  Using local idea.mp4 as background.")
    elif bg_path.exists():
        print("  Using existing bg.mp4 — skipping download.")
    else:
        video_url = get_pexels_video(PEXELS_QUERY, min_duration=total_dur)
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
