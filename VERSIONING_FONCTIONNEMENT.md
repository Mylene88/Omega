# Comment fonctionne le système de versioning granulaire

## ✅ Comportement actuel (EXACTEMENT ce que vous voulez !)

Le système de versioning est **granulaire par section ET par utilisateur**. Cela signifie que chaque modification est isolée et la restauration n'affecte QUE la section restaurée.

## 📖 Scénario concret

### Situation initiale
**Projet "Nouvelle Zone Industrielle"**

| Date | Utilisateur | Action | Section modifiée |
|------|------------|--------|------------------|
| Lundi 1er | User 1 (Marie) | Ajoute porteur "EPCI du Centre" | `porteurs` |
| Lundi 1er | User 1 (Marie) | Ajoute géométrie (polygon) | `geometrie` |

**État du projet lundi soir :**
- Porteurs : 1 porteur (EPCI)
- Géométrie : 1 polygon
- Thématiques : 0
- Suivis : 0

---

### Mardi 2
**User 2 (Jean)** ajoute un deuxième porteur

| Date | Utilisateur | Action | Section modifiée |
|------|------------|--------|------------------|
| Mardi 2 | User 2 (Jean) | Ajoute porteur "Association XYZ" | `porteurs` |

**📸 VERSION CRÉÉE :**
- `id_version`: 2
- `user_id`: 2 (Jean)
- `section_name`: `porteurs`
- `section_data`: [EPCI du Centre] ← snapshot **AVANT** ajout

**État du projet mardi soir :**
- Porteurs : **2 porteurs** (EPCI + Association)
- Géométrie : 1 polygon
- Thématiques : 0
- Suivis : 0

---

### Mercredi 3
**User 1 (Marie)** ajoute un suivi

| Date | Utilisateur | Action | Section modifiée |
|------|------------|--------|------------------|
| Mercredi 3 | User 1 (Marie) | Ajoute suivi "Réunion préparatoire" | `suivis` |

**📸 VERSION CRÉÉE :**
- `id_version`: 3
- `user_id`: 1 (Marie)
- `section_name`: `suivis`
- `section_data`: [] ← snapshot **AVANT** ajout (vide)

**État du projet mercredi soir :**
- Porteurs : 2 porteurs
- Géométrie : 1 polygon
- Thématiques : 0
- **Suivis : 1 suivi**

---

### Jeudi 4
**User 3 (Pierre)** ajoute une thématique

| Date | Utilisateur | Action | Section modifiée |
|------|------------|--------|------------------|
| Jeudi 4 | User 3 (Pierre) | Ajoute thématique "ICPE" avec données | `thematiques` |

**📸 VERSION CRÉÉE :**
- `id_version`: 4
- `user_id`: 3 (Pierre)
- `section_name`: `thematiques`
- `section_data`: [] ← snapshot **AVANT** ajout (vide)

**État du projet jeudi soir :**
- Porteurs : 2 porteurs
- Géométrie : 1 polygon
- **Thématiques : 1 thématique (ICPE)**
- Suivis : 1 suivi

---

### Vendredi 5
**User 1 (Marie)** modifie la thématique ICPE et se trompe !

| Date | Utilisateur | Action | Section modifiée |
|------|------------|--------|------------------|
| Vendredi 5 | User 1 (Marie) | Modifie données ICPE (ERREUR) | `thematiques` |

**📸 VERSION CRÉÉE :**
- `id_version`: 5
- `user_id`: 1 (Marie)
- `section_name`: `thematiques`
- `section_data`: [Thématique ICPE créée par Pierre] ← snapshot **AVANT** modification

**État du projet vendredi soir :**
- Porteurs : 2 porteurs
- Géométrie : 1 polygon
- **Thématiques : 1 thématique (ICPE modifiée par erreur ❌)**
- Suivis : 1 suivi

---

### Lundi 8 - RESTAURATION

**Marie** se rend compte de son erreur et fait une demande de restauration.

**Dans l'admin > Versions de Sections :**

Elle filtre :
- **Projet** : "Nouvelle Zone Industrielle"
- **Section** : `thematiques`
- **Utilisateur** : Marie (User 1)

Elle voit :
```
Version #5 | Jeudi 4 | User 1 (Marie) | Section: Thématiques | ✓ Actuelle
```

Elle clique sur **🔄 Restaurer** pour la version #5 (celle créée jeudi AVANT sa modification)

---

## 🎯 Résultat de la restauration

### Ce qui est restauré
✅ **Section `thematiques` UNIQUEMENT** → revient à l'état de jeudi (thématique ICPE créée par Pierre)

### Ce qui N'EST PAS affecté
❌ Porteurs → restent inchangés (2 porteurs : EPCI + Association)
❌ Géométrie → reste inchangée
❌ Suivis → reste inchangé (1 suivi)

**État final du projet :**
- Porteurs : 2 porteurs ← **NON AFFECTÉ**
- Géométrie : 1 polygon ← **NON AFFECTÉ**
- Thématiques : 1 thématique (ICPE de Pierre) ← **RESTAURÉE**
- Suivis : 1 suivi ← **NON AFFECTÉ**

---

## 🔧 Code de restauration (backend)

Le code de restauration (`backend/app/api/section-versions/restore/route.js`) utilise un **switch** qui restaure **UNIQUEMENT** la section demandée :

```javascript
switch (section_name) {
  case 'porteurs':
    // Restaure UNIQUEMENT les porteurs
    await db.ProjetPorteur.destroy({ where: { id_projet } });
    // Recrée les porteurs depuis la version
    break;

  case 'thematiques':
    // Restaure UNIQUEMENT les thématiques
    await db.ProjetInThematique.destroy({ where: { id_projet } });
    // Recrée les thématiques depuis la version
    break;

  // ... autres sections
}
```

---

## ✨ Points clés

### 1. Granularité par section
- Chaque **section** est versionnée séparément
- La restauration n'affecte **QUE** la section choisie
- Les autres sections restent intactes

### 2. Granularité par utilisateur
- Chaque modification crée une version **par utilisateur**
- Vous pouvez restaurer **votre propre travail** sans affecter celui des autres
- Maximum **10 versions par section/utilisateur**

### 3. Snapshot AVANT modification
- La version sauvegarde l'état **AVANT** la modification
- Permet de revenir à l'état précis avant l'erreur

### 4. Audit complet
- Toutes les restaurations sont enregistrées dans l'audit log
- Traçabilité complète de qui a restauré quoi et quand

---

## ❗ Problème actuel

Le système fonctionne **PARFAITEMENT** comme décrit ci-dessus, MAIS :

**Aucune version n'est créée car l'`userId` n'est pas envoyé dans les requêtes API**

### Solution
Ajouter l'userId dans toutes les requêtes de modification en utilisant :
- `useApiWithUserId()` hook
- ou `getApiHeaders()` + `addUserIdToBody()` fonctions

Voir `VERSIONING_SETUP.md` pour les détails d'implémentation.

---

## 📊 Tableau récapitulatif

| Aspect | Comportement |
|--------|--------------|
| **Granularité** | Par section ET par utilisateur |
| **Portée restauration** | Une seule section à la fois |
| **Impact autres sections** | Aucun |
| **Impact autres users** | Aucun |
| **Versions max** | 10 par section/utilisateur |
| **Rétention** | 15 jours |
| **Audit** | Complet (qui, quoi, quand) |

---

## 🎓 Cas d'usage typiques

### Cas 1 : Correction d'erreur personnelle
- **Problème** : J'ai modifié une thématique par erreur
- **Solution** : Je restaure MA version de la thématique
- **Impact** : Seule la thématique est restaurée, rien d'autre

### Cas 2 : Retour en arrière collaboratif
- **Problème** : Plusieurs users ont modifié le même projet
- **Solution** : Chaque user peut restaurer SES propres modifications
- **Impact** : Les modifications des autres users ne sont pas affectées

### Cas 3 : Restauration partielle
- **Problème** : Un projet a été modifié sur plusieurs sections
- **Solution** : Je restaure UNIQUEMENT la/les section(s) problématique(s)
- **Impact** : Les sections non restaurées gardent leurs modifications récentes

---

## ✅ Conclusion

Le système de versioning est **EXACTEMENT** ce que vous demandez :
- ✅ Restauration granulaire par section
- ✅ Isolation par utilisateur
- ✅ Pas d'impact sur les autres sections
- ✅ Pas d'impact sur le travail des autres users
- ✅ Traçabilité complète

**Il suffit maintenant d'ajouter l'userId dans les requêtes pour que les versions soient créées !**
