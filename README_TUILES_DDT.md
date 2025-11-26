# 🗺️ Guide Rapide : Configuration Hors-Ligne pour la DDT

Ce guide explique comment rendre l'application totalement autonome (sans requêtes externes) pour la conformité DDT.

## 📝 Résumé

L'application utilise des tuiles cartographiques IGN qui nécessitent normalement une connexion internet. Pour fonctionner hors-ligne, il faut :
1. Télécharger les tuiles localement
2. Configurer l'application pour utiliser les tuiles locales

## 🚀 Mise en Place (3 étapes)

### Étape 1 : Installer les dépendances Python

```bash
pip install requests
```

### Étape 2 : Télécharger les tuiles

```bash
cd donnees
python3 download_tiles.py all
```

**Choix recommandé :**
- Télécharger les **deux couches** (plan + ortho)
- Garder les **zooms 8-14** par défaut
- Temps estimé : 15-30 minutes
- Espace disque : ~1-2 GB

### Étape 3 : Activer le mode hors-ligne

```bash
cd ../frontend
cp .env.example .env.local
```

Éditer `.env.local` et changer :
```
REACT_APP_TILE_MODE=local
```

Puis rebuild :
```bash
npm run build
```

## ✅ C'est terminé !

L'application fonctionne maintenant entièrement hors-ligne. La carte charge les tuiles depuis `/frontend/public/tiles/` au lieu de `https://data.geopf.fr`.

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. Démarrer l'application :
   ```bash
   npm start
   ```

2. Ouvrir la console du navigateur (F12)

3. Chercher le message :
   ```
   🗺️ Mode tuiles cartographiques: LOCAL
   📍 Utilisation des tuiles: LOCALES (hors-ligne)
   ```

4. Vérifier qu'il n'y a **aucune requête** vers `https://data.geopf.fr`

## 📁 Structure des Fichiers

```
Omega/
├── donnees/
│   ├── download_tiles.py      # Script de téléchargement
│   └── TUILES_LOCALES.md      # Documentation détaillée
├── frontend/
│   ├── .env.example           # Template de configuration
│   ├── .env.local             # Configuration locale (à créer)
│   ├── public/
│   │   └── tiles/            # Tuiles téléchargées
│   │       ├── plan/         # Carte IGN classique
│   │       └── ortho/        # Photos aériennes
│   └── src/
│       ├── config/
│       │   └── mapConfig.js  # Configuration centralisée
│       ├── components/carte/carte-modele/
│       │   └── Carte.js      # ✅ Modifié pour tuiles locales
│       └── vizualisation/components/
│           └── MapView.js    # ✅ Modifié pour tuiles locales
└── README_TUILES_DDT.md       # Ce fichier
```

## ⚙️ Configuration Avancée

### Modifier les niveaux de zoom

Éditer `donnees/download_tiles.py` :
```python
MIN_ZOOM = 8   # Zoom minimum (vue large)
MAX_ZOOM = 14  # Zoom maximum (détails)
```

### Télécharger uniquement une couche

```bash
# Uniquement le plan IGN
python3 download_tiles.py plan

# Uniquement les orthophotos
python3 download_tiles.py ortho
```

### Basculer entre modes

**Mode développement (avec internet) :**
```env
REACT_APP_TILE_MODE=online
```

**Mode production DDT (hors-ligne) :**
```env
REACT_APP_TILE_MODE=local
```

## 🐛 Dépannage

### La carte est blanche
- Vérifiez que les tuiles sont dans `frontend/public/tiles/`
- Vérifiez `.env.local` avec `REACT_APP_TILE_MODE=local`
- Relancez `npm run build`

### Erreur "Too Many Requests"
- Réduisez `max_workers` dans `download_tiles.py`
- Relancez le script (il reprendra où il s'est arrêté)

### Manque de tuiles
- Vérifiez les niveaux de zoom configurés
- Relancez le téléchargement (les tuiles existantes seront ignorées)

## 📊 Estimations

| Zone | Zooms | Tuiles | Espace disque |
|------|-------|--------|---------------|
| Eure-et-Loir | 8-12 | ~4000 | ~400 MB |
| Eure-et-Loir | 8-14 | ~15000 | ~1.5 GB |
| Eure-et-Loir | 8-16 | ~250000 | ~25 GB |

**Recommandation DDT : Zooms 8-14** (compromis qualité/espace)

## 📞 Support

- Documentation détaillée : `donnees/TUILES_LOCALES.md`
- Configuration : `frontend/.env.example`
- Script : `donnees/download_tiles.py`

## ✨ Avantages du Mode Hors-Ligne

✅ Aucune requête externe
✅ Conforme aux exigences DDT
✅ Fonctionne sans internet
✅ Performance optimale
✅ Coûts de bande passante réduits
✅ Données maîtrisées localement

## 🎯 Checklist DDT

- [ ] Tuiles téléchargées (`frontend/public/tiles/`)
- [ ] Fichier `.env.local` créé avec `REACT_APP_TILE_MODE=local`
- [ ] Application rebuild (`npm run build`)
- [ ] Vérification console : mode LOCAL activé
- [ ] Test hors-ligne : aucune requête vers data.geopf.fr
- [ ] Validation fonctionnelle : carte s'affiche correctement
