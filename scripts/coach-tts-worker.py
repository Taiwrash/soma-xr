#!/usr/bin/env python3
"""
Persistent Multilingual Neural TTS Worker for Soma XR.
- Uses native tonal VITS models for Yorùbá (facebook/mms-tts-yor), Hausa (facebook/mms-tts-hau),
  and Igbo (Shinzmann/soro-tts-ibo) with strict NFC Unicode preservation so subdots (ẹ, ọ, ṣ, ị, ụ)
  and tonal diacritics (á, à) are pronounced with authentic native intonation.
- Uses Microsoft Edge Neural voices for Kiswahili, isiZulu, Amharic, Af-Soomaali, Afrikaans,
  Naija Pidgin (en-NG), English, French, Arabic, Spanish, and Portuguese.
"""
import asyncio
import json
import os
import re
import ssl
import sys
import unicodedata

import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()

MMS_CACHE = {}
CLOCK_SYNCED = False

YO_FALLBACK_MAP = str.maketrans({
    "c": "k",
    "q": "k",
    "v": "f",
    "z": "s",
    "’": "'",
    "‘": "'",
    "–": "-",
})


def get_mms_model(repo_id: str):
    if repo_id not in MMS_CACHE:
        import torch
        from transformers import AutoTokenizer, VitsModel

        tok = AutoTokenizer.from_pretrained(repo_id, token=False)
        mod = VitsModel.from_pretrained(repo_id, token=False)
        mod.eval()
        vocab = tok.get_vocab()
        has_upper = any(k.isupper() for k in vocab.keys() if len(k) == 1)
        MMS_CACHE[repo_id] = (tok, mod, vocab, has_upper, torch)
    return MMS_CACHE[repo_id]


def normalize_for_vits(clause: str, lang: str, vocab: dict, has_upper: bool) -> str:
    s = clause if has_upper else clause.lower()
    if lang == "yo":
        s = s.replace("x", "ks").translate(YO_FALLBACK_MAP)
    else:
        s = s.replace("’", "'").replace("‘", "'").replace("–", "-")
    # CRITICAL: Always use NFC so precomposed subdotted characters (ẹ, ọ, ṣ, ị, ụ, ƙ, ɓ, ɗ)
    # stay intact instead of losing combining dot-below in NFD!
    norm = unicodedata.normalize("NFC", s)
    out = []
    for ch in norm:
        if ch in vocab:
            out.append(ch)
        else:
            # Check if decomposed tone mark after a base char is in vocab
            decomp = unicodedata.normalize("NFD", ch)
            for dch in decomp:
                if dch in vocab:
                    out.append(dch)
    return re.sub(r"\s{2,}", " ", "".join(out)).strip()


def synthesize_vits(repo_id: str, lang: str, text: str, out_path: str) -> str:
    import numpy as np
    import scipy.io.wavfile as wavfile

    tok, mod, vocab, has_upper, torch = get_mms_model(repo_id)
    sr = mod.config.sampling_rate
    mod.config.speaking_rate = 0.96
    mod.config.noise_scale = 0.42
    mod.config.noise_scale_duration = 0.58

    parts = [p.strip() for p in re.split(r"([.!?;:,])", text) if p.strip()]
    chunks = []
    i = 0
    while i < len(parts):
        seg = parts[i]
        if seg in ".!?;:,":
            i += 1
            continue
        punct = parts[i + 1] if (i + 1 < len(parts) and parts[i + 1] in ".!?;:,") else "."
        i += 2 if (i + 1 < len(parts) and parts[i + 1] in ".!?;:,") else 1

        clean = normalize_for_vits(seg, lang, vocab, has_upper)
        if not clean:
            continue
        inputs = tok(clean, return_tensors="pt")
        with torch.no_grad():
            wav = mod(**inputs).waveform[0].cpu().numpy()
        peak = float(np.max(np.abs(wav))) if len(wav) else 0.0
        if peak > 1e-4:
            wav = wav / peak * 0.86
        chunks.append(wav)
        pause_sec = 0.14 if punct in ",;:" else 0.26
        chunks.append(np.zeros(int(sr * pause_sec), dtype=np.float32))

    if not chunks:
        raise RuntimeError("Empty VITS synthesis")

    audio = np.concatenate(chunks)
    wavfile.write(out_path, sr, (audio * 32767).astype(np.int16))
    return "audio/wav"


async def synthesize_edge(voice: str, text: str, out_path: str) -> str:
    global CLOCK_SYNCED
    import aiohttp
    import edge_tts
    from edge_tts.drm import DRM

    if not CLOCK_SYNCED:
        ctx = ssl.create_default_context(cafile=certifi.where())
        try:
            async with aiohttp.ClientSession() as s:
                async with s.head("https://speech.platform.bing.com", ssl=ctx, timeout=aiohttp.ClientTimeout(total=2.5)) as r:
                    d = r.headers.get("Date")
                    if d:
                        srv = DRM.parse_rfc2616_date(d)
                        if srv:
                            DRM.adj_clock_skew_seconds(srv - DRM.get_unix_timestamp())
                            CLOCK_SYNCED = True
        except Exception:
            pass

    await edge_tts.Communicate(text, voice, rate="+2%").save(out_path)
    return "audio/mpeg"


def main():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    sys.stdout.write(json.dumps({"ready": True}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = ""
        try:
            req = json.loads(line)
            req_id = req.get("id", "")
            voice = req.get("voice", "en-US-ChristopherNeural")
            lang = req.get("lang", "en")
            text = req.get("text", "").strip()
            out_path = req.get("out", "")
            if not text or not out_path:
                raise ValueError("Missing text or out_path")

            if voice.startswith("mms:"):
                repo_id = voice.split("mms:", 1)[1]
                mime = synthesize_vits(repo_id, lang, text, out_path)
            else:
                mime = loop.run_until_complete(synthesize_edge(voice, text, out_path))

            sys.stdout.write(json.dumps({"id": req_id, "ok": True, "mime": mime}) + "\n")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({"id": req_id, "ok": False, "error": str(e)}) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
