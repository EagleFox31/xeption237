import os
import glob
from pathlib import Path
from rembg import remove
from PIL import Image, ImageOps
import shutil

# Configuration
INPUT_DIR = Path("data/laptop")
OUTPUT_DIR = Path("data/pc-images-july-2026")
CANVAS_SIZE = (1600, 2000)
BG_COLOR = "#f5f5f7"
MARGIN_PERCENT = 0.12

# Fichiers finaux attendus
TARGETS = {
    "lenovo-300e": "lenovo-300e-128-4.webp",
    "dell-5310": "dell-latitude-5310-2in1-i5-16-512.webp",
    "dell-3190": "dell-latitude-3190-4-128.webp",
    "hp-445-g8": "hp-probook-445-g8-ryzen3-8-256.webp",
    "dell-5510": "dell-latitude-5510-i5-16-512.webp",
    "surface-pro3": "microsoft-surface-pro-3-i5-8-256.webp",
    "dell-5530": "dell-latitude-5530-i7-16-512.webp",
    "lenovo-thinkpad-13": "lenovo-thinkpad-13-i5-8-256.webp",
    "lenovo-thinkpad-e495": "lenovo-thinkpad-e495-ryzen3-16-256.webp",
    "dell-5580": "dell-latitude-5580-i5-8-256.webp",
    "lenovo-thinkpad-a485": "lenovo-thinkpad-a485-ryzen5pro-8-256.webp",
    "hp-840-g5": "hp-elitebook-840-g5-i5-8-256.webp",
    "hp-830-g6": "hp-elitebook-x360-830-g6-i5-16-256.webp",
    "hp-mt43": "hp-mt43-8-256.webp",
    "hp-820-g3": "hp-elitebook-820-g3-i5-8-500.webp",
    "hp-850-g6-i5": "hp-elitebook-850-g6-i5-16-256.webp",
    "hp-850-g6-i7": "hp-elitebook-850-g6-i7-touch-16-512.webp",
    "hp-745-g6": "hp-elitebook-745-g6-ryzen3pro-16-256.webp",
    "hp-840-g2": "hp-elitebook-840-g2-i5-8-256.webp",
    "hp-745-g2": "hp-elitebook-745-g2-amd-8-256.webp",
    "hp-elite-x2": "hp-elite-x2-1012-g1-m5-8-256.webp",
    "hp-probook-x360": "hp-probook-x360-11-g2-ee-4-256.webp",
    "hp-probook-430": "hp-probook-430-g3-i3-8-500.webp",
    "hp-probook-445-g6": "hp-probook-445-g6-ryzen5-8-256.webp",
    "hp-probook-440-g8": "hp-probook-440-g8-i5-16-256.webp",
    "hp-laptop-14s": "hp-laptop-14s-i7-8-256.webp"
}

def create_padded_image(img, target_size, bg_color, margin_pct):
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img_ratio = img.width / img.height
    target_width = int(target_size[0] * (1 - margin_pct * 2))
    target_height = int(target_size[1] * (1 - margin_pct * 2))
    target_ratio = target_width / target_height
    
    if img_ratio > target_ratio:
        new_width = target_width
        new_height = int(new_width / img_ratio)
    else:
        new_height = target_height
        new_width = int(new_height * img_ratio)
        
    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", target_size, bg_color)
    paste_x = (target_size[0] - new_width) // 2
    paste_y = (target_size[1] - new_height) // 2
    
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        canvas.paste(img, (paste_x, paste_y), mask=img)
    else:
        canvas.paste(img, (paste_x, paste_y))
        
    return canvas

def main():
    # Nettoyage du dossier de sortie
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    all_files = list(INPUT_DIR.glob("*.*"))
    suffixes = ["", "-front", "-ports", "-detail"]
    
    for key, target_filename in TARGETS.items():
        matches = [f for f in all_files if key.lower() in f.name.lower()]
        if not matches:
            print(f"[-] No raw image found for '{key}'")
            continue
            
        # Tri : les noms les plus courts d'abord (souvent l'image principale sans suffixe)
        matches.sort(key=lambda f: (len(f.name), f.name))
        
        # On prend jusqu'à 4 images
        selected_matches = matches[:4]
        print(f"[*] Processing {len(selected_matches)} images for {target_filename}...")
        
        processed_paths = []
        
        for idx, match_file in enumerate(selected_matches):
            suffix = suffixes[idx]
            final_name = target_filename.replace(".webp", f"{suffix}.webp")
            final_path = OUTPUT_DIR / final_name
            
            try:
                with open(match_file, "rb") as i:
                    input_bytes = i.read()
                    
                output_bytes = remove(input_bytes)
                temp_path = OUTPUT_DIR / f"temp_{idx}.png"
                
                with open(temp_path, "wb") as o:
                    o.write(output_bytes)
                    
                with Image.open(temp_path) as img:
                    final_img = create_padded_image(img, CANVAS_SIZE, BG_COLOR, MARGIN_PERCENT)
                    final_img.save(final_path, "WEBP", quality=90)
                    
                temp_path.unlink()
                processed_paths.append(final_path)
                print(f"   [+] Saved {match_file.name} -> {final_name}")
            except Exception as e:
                print(f"   [!] Error processing {match_file.name}: {e}")
                
        # Combler les trous si moins de 4 images
        if processed_paths and len(processed_paths) < 4:
            main_image_path = processed_paths[0]
            for i in range(len(processed_paths), 4):
                missing_suffix = suffixes[i]
                missing_name = target_filename.replace(".webp", f"{missing_suffix}.webp")
                missing_path = OUTPUT_DIR / missing_name
                shutil.copy(main_image_path, missing_path)
                print(f"   [~] Duplicated main image for -> {missing_name}")

if __name__ == "__main__":
    main()
