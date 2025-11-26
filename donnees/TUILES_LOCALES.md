# 🗺️ Guide de Téléchargement des Tuiles IGN Locales

Ce guide explique comment télécharger et configurer les tuiles de carte IGN pour une utilisation hors-ligne (conformité DDT).

## 📋 Prérequis

```bash
pip install requests
```

## 🚀 Utilisation du Script

### 1. Lancer le téléchargement

**Option 1 : Télécharger une seule couche**
```bash
cd donnees
python3 download_tiles.py plan
```

**Option 2 : Télécharger toutes les couches**
```bash
python3 download_tiles.py all
```

### 2. Couches disponibles

- **plan** : Carte IGN classique (Plan IGN V2) - Format PNG
- **ortho** : Photos aériennes (Orthophotos) - Format JPEG

### 3. Configuration des niveaux de zoom

Par défaut, le script télécharge les zooms **8 à 14**.

Pour modifier, éditez `download_tiles.py` :
```python
MIN_ZOOM = 8   # Zoom minimum (vue large)
MAX_ZOOM = 14  # Zoom maximum (vue détaillée)
```

⚠️ **Attention à l'espace disque** :

| Zoom | Nombre de tuiles | Espace disque estimé |
|------|------------------|---------------------|
| 8-12 | ~500-2000 | 50-200 MB |
| 8-14 | ~8000-15000 | 500 MB - 1 GB |
| 8-16 | ~250000 | 10-25 GB |

### 4. Structure des fichiers

Les tuiles seront stockées dans :
```
frontend/public/tiles/
├── plan/
│   ├── 8/
│   │   ├── 128/
│   │   │   ├── 89.png
│   │   │   ├── 90.png
│   │   │   └── ...
│   ├── 9/
│   └── ...
└── ortho/
    ├── 8/
    └── ...
```

## 🔧 Configurer l'Application

Une fois les tuiles téléchargées, modifiez les fichiers suivants pour utiliser les tuiles locales :

### MapView.js
```javascript
const baseLayers = {
    plan: L.tileLayer(
        '/tiles/plan/{z}/{x}/{y}.png',  // Chemin local
        { minZoom: 8, maxZoom: 14, attribution: 'IGN-F/Geoportail (Local)' }
    ),
    ortho: L.tileLayer(
        '/tiles/ortho/{z}/{x}/{y}.jpg',  // Chemin local
        { minZoom: 8, maxZoom: 14, attribution: 'IGN-F/Geoportail (Local)' }
    ),
};
```

### Carte.js
Même modification dans `frontend/src/components/carte/carte-modele/Carte.js`

## 📊 Estimation pour Eure-et-Loir

Pour la zone configurée (47.95°N-48.95°N, 0.45°E-1.99°E) :

- **Zoom 8** : ~2 tuiles
- **Zoom 9** : ~6 tuiles
- **Zoom 10** : ~20 tuiles
- **Zoom 11** : ~56 tuiles
- **Zoom 12** : ~210 tuiles
- **Zoom 13** : ~800 tuiles
- **Zoom 14** : ~3200 tuiles

**Total zoom 8-14 : ~4300 tuiles par couche**

## 🎯 Recommandations

### Pour le développement (avec internet)
Gardez les URLs en ligne : `https://data.geopf.fr/wmts...`

### Pour la production DDT (sans internet)
1. Téléchargez les tuiles zoom 8-14 (compromis qualité/espace)
2. Utilisez les chemins locaux : `/tiles/...`
3. Testez en mode hors-ligne

### Pour économiser de l'espace
- Téléchargez uniquement la couche **plan** (carte classique)
- Limitez au zoom 8-13 au lieu de 8-14

## 🔄 Mode Hybride (Recommandé)

Créez une variable d'environnement pour basculer facilement :

**.env.local**
```
REACT_APP_USE_LOCAL_TILES=true
```

**MapView.js**
```javascript
const useLocalTiles = process.env.REACT_APP_USE_LOCAL_TILES === 'true';

const baseLayers = {
    plan: L.tileLayer(
        useLocalTiles
            ? '/tiles/plan/{z}/{x}/{y}.png'
            : 'https://data.geopf.fr/wmts?...',
        { /* config */ }
    ),
};
```

## ✅ Vérification

Après téléchargement, vérifiez :
```bash
# Compter les tuiles téléchargées
find frontend/public/tiles/plan -name "*.png" | wc -l

# Vérifier l'espace utilisé
du -sh frontend/public/tiles/
```

## 🐛 Dépannage

**Erreur HTTP 429 (Too Many Requests)**
- Réduisez `max_workers` de 4 à 2
- Ajoutez un délai : `sleep(0.1)` dans `download_tile()`

**Tuiles manquantes**
- Relancez le script, il sautera les tuiles déjà téléchargées

**Carte blanche dans l'application**
- Vérifiez que les chemins sont corrects
- Vérifiez la console navigateur (F12) pour les erreurs
- Vérifiez que les tuiles existent dans `public/tiles/`

## 📞 Support

En cas de problème, vérifiez :
1. Les chemins dans MapView.js et Carte.js
2. Les permissions sur le dossier `public/tiles/`
3. Que le serveur React sert bien les fichiers statiques
