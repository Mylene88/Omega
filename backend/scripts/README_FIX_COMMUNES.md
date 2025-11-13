# Script de correction des communes_traversees

## Problème identifié

Certains projets ont des données spatiales complètes (codes INSEE, EPCI, maires, députés, arrondissements) mais le champ `communes_traversees` est vide. Cela cause l'affichage du message "Aucune géométrie renseignée" dans la Vue Liste alors que les données existent.

## Exemples d'incohérences

```
❌ Projet avec LineString :
   - Longueur : 298,697 m
   - Codes INSEE : 28109
   - EPCI : CC des Terres de Perche
   - Communes : VIDE ❌

❌ Projet avec Polygon :
   - Superficie : 1 353 749,056 m²
   - Codes INSEE : 28386
   - EPCI : CA du Pays de Dreux
   - Communes : VIDE ❌
```

## Solution

Le script `fixCommunesTraversees.js` :
1. ✅ Identifie les géométries avec codes_insee renseignés mais communes_traversees vide
2. ✅ Récupère les noms de communes depuis la table `geom_commune`
3. ✅ Met à jour le champ `communes_traversees`

## Utilisation

### Option 1 : Via Node.js (Recommandé)

```bash
cd backend
node scripts/fixCommunesTraversees.js
```

### Option 2 : Via SQL directement

Si vous préférez une approche SQL directe, utilisez le script `fix-communes-traversees.sql`

```bash
cd backend/scripts
psql -U <votre_user> -d <votre_database> -f fix-communes-traversees.sql
```

## Sortie attendue

```
╔════════════════════════════════════════════════════════════╗
║  Script de correction des communes_traversees             ║
╚════════════════════════════════════════════════════════════╝

🔍 Identification des géométries avec incohérences...

📊 Total géométries en base: 50

❌ Incohérence détectée:
   Géométrie ID: 123
   Projet ID: 45
   Type: LineString
   Codes INSEE: 28109
   Communes: VIDE ❌
   EPCI: 1 entrée(s)
   Arrondissements: 1 entrée(s)

📋 Résumé:
   ✅ Géométries OK: 48
   ❌ Incohérences: 2

🔧 Correction de 2 géométrie(s)...

📝 Traitement géométrie 123 (Projet 45)...
   ✅ Trouvé: Nogent-le-Rotrou (28109)
   ✅ Correction réussie: Nogent-le-Rotrou

📊 Résultat des corrections:
   ✅ Réussies: 2
   ❌ Échouées: 0

✅ Script terminé avec succès !
```

## Impact

Après exécution :
- ✅ Le champ `communes_traversees` sera rempli avec les noms de communes
- ✅ La Vue Liste affichera correctement les communes au lieu de "Aucune géométrie renseignée"
- ✅ Le label s'adaptera selon le type de géométrie (Point → "Commune", Polygon/Line → "Communes traversées")

## Sécurité

- ✅ Le script ne modifie QUE le champ `communes_traversees`
- ✅ Il ne touche pas aux autres données spatiales
- ✅ Il effectue une correspondance via `code_insee` depuis la table `geom_commune`
- ⚠️ Faites un backup avant si vous êtes prudent : `pg_dump votre_db > backup.sql`
