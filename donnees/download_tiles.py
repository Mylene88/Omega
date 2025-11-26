#!/usr/bin/env python3
"""
Script pour télécharger les tuiles IGN (Géoportail) pour la zone Eure-et-Loir
Les tuiles seront stockées localement pour éviter les requêtes externes
"""

import os
import sys
import math
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import sleep

# Configuration de la zone géographique (Eure-et-Loir)
BOUNDS = {
    'min_lat': 47.95,
    'max_lat': 48.95,
    'min_lon': 0.45,
    'max_lon': 1.99
}

# Niveaux de zoom à télécharger (attention: plus le zoom est élevé, plus il y a de tuiles!)
# Zoom 8-12 : ~500-2000 tuiles (recommandé pour démarrer)
# Zoom 8-14 : ~8000-15000 tuiles
# Zoom 8-16 : ~250000 tuiles (très lourd!)
MIN_ZOOM = 8
MAX_ZOOM = 14  # Ajustez selon vos besoins

# Couches IGN à télécharger
LAYERS = {
    'plan': {
        'url': 'https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        'format': 'png',
        'dir': 'plan'
    },
    'ortho': {
        'url': 'https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        'format': 'jpg',
        'dir': 'ortho'
    }
}

# Répertoire de sortie
OUTPUT_DIR = Path(__file__).parent.parent / 'frontend' / 'public' / 'tiles'

def deg2num(lat_deg, lon_deg, zoom):
    """Convertit des coordonnées lat/lon en numéros de tuile"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def get_tile_range(zoom):
    """Calcule la plage de tuiles nécessaires pour la zone"""
    min_x, max_y = deg2num(BOUNDS['min_lat'], BOUNDS['min_lon'], zoom)
    max_x, min_y = deg2num(BOUNDS['max_lat'], BOUNDS['max_lon'], zoom)
    return (min_x, max_x, min_y, max_y)

def download_tile(layer_name, layer_config, z, x, y, session):
    """Télécharge une tuile individuelle"""
    tile_dir = OUTPUT_DIR / layer_config['dir'] / str(z) / str(x)
    tile_path = tile_dir / f"{y}.{layer_config['format']}"

    # Si la tuile existe déjà, on la saute
    if tile_path.exists():
        return f"Skip {layer_name}/{z}/{x}/{y}"

    # Créer le répertoire si nécessaire
    tile_dir.mkdir(parents=True, exist_ok=True)

    # Télécharger la tuile
    url = layer_config['url'].format(z=z, x=x, y=y)

    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            with open(tile_path, 'wb') as f:
                f.write(response.content)
            return f"✓ {layer_name}/{z}/{x}/{y}"
        else:
            return f"✗ {layer_name}/{z}/{x}/{y} - HTTP {response.status_code}"
    except Exception as e:
        return f"✗ {layer_name}/{z}/{x}/{y} - {str(e)}"

def estimate_tiles():
    """Estime le nombre total de tuiles à télécharger"""
    total = 0
    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        min_x, max_x, min_y, max_y = get_tile_range(z)
        count = (max_x - min_x + 1) * (max_y - min_y + 1)
        total += count
        print(f"  Zoom {z}: {count} tuiles ({max_x - min_x + 1} x {max_y - min_y + 1})")
    return total

def download_all_tiles(layer_name='plan', max_workers=4):
    """Télécharge toutes les tuiles pour une couche"""
    if layer_name not in LAYERS:
        print(f"Erreur: couche '{layer_name}' inconnue. Couches disponibles: {list(LAYERS.keys())}")
        return

    layer_config = LAYERS[layer_name]

    print(f"\n📥 Téléchargement des tuiles {layer_name}...")
    print(f"Zone: Eure-et-Loir ({BOUNDS['min_lat']}, {BOUNDS['min_lon']}) -> ({BOUNDS['max_lat']}, {BOUNDS['max_lon']})")
    print(f"Zoom: {MIN_ZOOM} à {MAX_ZOOM}")
    print(f"Format: {layer_config['format']}")
    print(f"Destination: {OUTPUT_DIR / layer_config['dir']}")

    # Estimation
    print("\n📊 Estimation des tuiles:")
    total_tiles = estimate_tiles()
    print(f"\nTotal estimé: {total_tiles} tuiles par couche")

    # Demander confirmation
    response = input(f"\nContinuer le téléchargement de {total_tiles} tuiles pour la couche '{layer_name}'? (o/n): ")
    if response.lower() != 'o':
        print("Téléchargement annulé.")
        return

    # Préparer la liste des tuiles
    tiles_to_download = []
    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        min_x, max_x, min_y, max_y = get_tile_range(z)
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                tiles_to_download.append((z, x, y))

    print(f"\n🚀 Téléchargement de {len(tiles_to_download)} tuiles avec {max_workers} workers...")

    # Téléchargement parallèle
    with requests.Session() as session:
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

        completed = 0
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(download_tile, layer_name, layer_config, z, x, y, session): (z, x, y)
                for z, x, y in tiles_to_download
            }

            for future in as_completed(futures):
                result = future.result()
                completed += 1
                if completed % 100 == 0:
                    progress = (completed / len(tiles_to_download)) * 100
                    print(f"Progression: {completed}/{len(tiles_to_download)} ({progress:.1f}%)")

    print(f"\n✅ Téléchargement terminé! {completed} tuiles traitées.")
    print(f"📁 Tuiles stockées dans: {OUTPUT_DIR / layer_config['dir']}")

def main():
    """Fonction principale"""
    print("=" * 60)
    print("Téléchargement des tuiles IGN pour Eure-et-Loir")
    print("=" * 60)

    # Vérifier les arguments
    if len(sys.argv) > 1:
        layer = sys.argv[1]
    else:
        print("\nCouches disponibles:")
        for name, config in LAYERS.items():
            print(f"  - {name}: {config['format'].upper()}")
        layer = input("\nQuelle couche télécharger? (plan/ortho/all): ").strip()

    # Créer le répertoire de sortie
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Télécharger
    if layer == 'all':
        for layer_name in LAYERS.keys():
            download_all_tiles(layer_name, max_workers=4)
            print("\n" + "=" * 60 + "\n")
    else:
        download_all_tiles(layer, max_workers=4)

    print("\n🎉 Processus terminé!")
    print("\nProchaines étapes:")
    print("1. Vérifiez les tuiles dans: frontend/public/tiles/")
    print("2. Modifiez MapView.js pour utiliser les tuiles locales")
    print("3. Testez l'application en mode hors-ligne")

if __name__ == '__main__':
    main()
