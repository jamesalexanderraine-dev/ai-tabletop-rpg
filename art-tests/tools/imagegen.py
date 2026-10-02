"""Generate style-test images with Gemini, time them, and clean up borders.

Usage:
  GEMINI_API_KEY=... python3 art-tests/tools/imagegen.py <out_dir> <model> [<model> ...]
  GEMINI_API_KEY=... python3 art-tests/tools/imagegen.py <out_dir> --spec <spec.json>

Writes <out_dir>/<model>/<subject>.webp (cleaned) plus <out_dir>/results.json with per-image
seconds, token counts and the cleanup outcome. Needs Pillow (pip install pillow).
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error
import concurrent.futures as cf
from PIL import Image
from cleanup import clean_frame, classify

# The locked barbarian-comic prompts (round 8 of the style tests).
STYLE = ("Sword-and-sorcery comic art in the spirit of 1970s-80s Conan the Barbarian and Masters of the Universe: "
         "bold confident ink outlines, dramatic lighting, saturated flat colours with hard cel shading and "
         "halftone-dot shading, pulpy and dramatic. No text, no logos, no speech bubbles.")
FRAME = ("Composition: a tight crop from the middle of a larger illustration, so the artwork runs off all four edges "
         "of the image. Nothing surrounds the art: no border, no white or cream margin, no paper, no frame, "
         "no panel outline.")
SCENE_RULE = ("Show only what is described. If no people or creatures are mentioned, the scene is empty of them: "
              "no figures, silhouettes or onlookers.")
PORTRAIT = ("Tight portrait of {who}: face and neck only, cropped just at the tips of the shoulders, the face filling "
            "most of the frame, looking toward the viewer. Plain dark background, one simple strong light, bold "
            "readable features.")

CHARACTERS = {
    "sorcerer": "a young human sorcerer with messy dark hair and soot on their cheeks",
    "elf": "a dark elf prisoner with grey skin, white hair and pale eyes, a wry look",
    "jailer": "a heavy-set human jailer with a scarred face and an iron helmet",
    "innkeeper": "a cheerful halfling innkeeper with red curly hair and a flour-dusted apron strap",
}
LOCATIONS = {
    "cell": "A prison cell at night: iron bars and one burning torch. Beyond the bars, a pair of eyes in the dark.",
    "tavern": "An empty tavern at night, lit only by a big stone hearth with a roaring fire.",
    "road": "A lone lantern hanging from a post beside a forest road at night, low mist between the trees.",
    "ruins": "A vast underground hall of ancient brass machines around one great glowing core.",
}


def prompt_for(kind, text):
    if kind == "portrait":
        return f"{PORTRAIT.format(who=text)}\n\nStyle: {STYLE}\n\n{FRAME}"
    return f"{text} {SCENE_RULE}\n\nStyle: {STYLE}\n\n{FRAME}"


def generate(model, prompt, ratio):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ratio, "imageSize": "1K"}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
    t = time.time()
    d = json.load(urllib.request.urlopen(req, timeout=300))
    secs = time.time() - t
    img = next(p["inlineData"] for p in d["candidates"][0]["content"]["parts"] if "inlineData" in p)
    return Image.open(io.BytesIO(base64.b64decode(img["data"]))).convert("RGB"), secs, d.get("usageMetadata", {})


def job(out, model, kind, sid, text):
    ratio = "1:1" if kind == "portrait" else "16:9"
    try:
        im, secs, usage = generate(model, prompt_for(kind, text), ratio)
    except urllib.error.HTTPError as e:
        return {"model": model, "subject": sid, "error": f"HTTP {e.code}: {e.read()[:300].decode(errors='replace')}"}
    raw_class = classify(im)[0]
    cleaned, status = clean_frame(im, kind if kind == "portrait" else "scene")
    os.makedirs(f"{out}/{model}", exist_ok=True)
    cleaned.save(f"{out}/{model}/{sid}.webp", "WEBP", quality=88)
    return {"model": model, "subject": sid, "kind": kind, "seconds": round(secs, 1),
            "image_tokens": next((x["tokenCount"] for x in usage.get("candidatesTokensDetails", []) if x.get("modality") == "IMAGE"), None),
            "output_tokens": usage.get("candidatesTokenCount"), "thought_tokens": usage.get("thoughtsTokenCount"),
            "prompt_tokens": usage.get("promptTokenCount"), "raw_frame": raw_class, "cleanup": status}


def run_spec(out, spec_path):
    """Run a JSON spec: {"subjects": [{"id", "kind": "scene"|"portrait", "text"}], "runs": {model: takes}}."""
    spec = json.load(open(spec_path))
    jobs = [(out, m, s["kind"], f'{s["id"]}-{k + 1}', s["text"])
            for s in spec["subjects"] for m, takes in spec["runs"].items() for k in range(takes)]
    with cf.ThreadPoolExecutor(8) as ex:
        results = list(ex.map(lambda j: job(*j), jobs))
    for r in results:
        print(r, flush=True)
    json.dump({"prompts": {"style": STYLE, "frame": FRAME, "scene_rule": SCENE_RULE, "portrait": PORTRAIT},
               "spec": spec, "results": results}, open(f"{out}/results.json", "w"), indent=1)


if __name__ == "__main__":
    if sys.argv[2] == "--spec":
        run_spec(sys.argv[1], sys.argv[3])
        sys.exit()
    out, models = sys.argv[1], sys.argv[2:]
    jobs = [(out, m, "portrait", f"face-{k}", v) for m in models for k, v in CHARACTERS.items()]
    jobs += [(out, m, "scene", f"loc-{k}", v) for m in models for k, v in LOCATIONS.items()]
    with cf.ThreadPoolExecutor(8) as ex:
        results = list(ex.map(lambda j: job(*j), jobs))
    for r in results:
        print(r, flush=True)
    json.dump({"prompts": {"style": STYLE, "frame": FRAME, "scene_rule": SCENE_RULE, "portrait": PORTRAIT,
                           "characters": CHARACTERS, "locations": LOCATIONS},
               "results": results}, open(f"{out}/results.json", "w"), indent=1)
