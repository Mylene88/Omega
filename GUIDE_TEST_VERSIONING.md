# Guide de test du système de versioning

## ✅ Modifications effectuées

J'ai modifié les fichiers suivants pour ajouter l'`userId` automatiquement :

### 1. **FormulairePage.js** ✅
- **Ligne 13** : Ajout de l'import `getCurrentUserId` et `getApiHeaders`
- **Lignes 457-464** : Ajout de l'userId au payload avant envoi
- **Ligne 472** : Utilisation de `getApiHeaders()` avec x-user-id

**Impact** : Toutes les modifications de projet (infos, porteurs, suivis, thématiques, documents) créent maintenant des versions !

### 2. **MapPage.js** ✅
- **Ligne 8** : Ajout de l'import `getCurrentUserId` et `getApiHeaders`
- **Lignes 116-120** : Récupération de l'userId
- **Lignes 133, 142** : Ajout de l'userId au requestData (POST et PATCH)
- **Ligne 153** : Utilisation de `getApiHeaders()`

**Impact** : Toutes les modifications de géométrie créent maintenant des versions !

### 3. **VueListe.js** ✅
- Déjà OK (envoie l'userId pour les demandes de suppression)

---

## 🧪 Comment tester le système

### Prérequis
1. Backend démarré : `cd backend && npm run dev`
2. Frontend démarré : `cd frontend && npm start`
3. **Connecté avec un utilisateur** (important !)

---

### Test 1 : Création de versions sur modification d'un projet

#### Étape 1 : Créer un nouveau projet
1. Connectez-vous avec **User 1** (ex: marie@example.com)
2. Créez un nouveau projet "Test Versioning"
3. Ajoutez :
   - Nom du projet : "Test Versioning"
   - Description : "Test du système de versioning"
   - 1 porteur : "EPCI Test"
   - 1 thématique
4. **Sauvegardez** le projet

**Attendu** : Une version est créée pour chaque section modifiée

#### Étape 2 : Vérifier dans la console
Dans la console du navigateur, vous devriez voir :
```
🔐 userId ajouté au payload: 1
10. 🚀 PAYLOAD FINAL À ENVOYER: {..., "userId": 1}
```

#### Étape 3 : Modifier le projet avec un autre utilisateur
1. **Déconnectez-vous**
2. Connectez-vous avec **User 2** (ex: jean@example.com)
3. Ouvrez le même projet "Test Versioning"
4. Ajoutez un **deuxième porteur** : "Association XYZ"
5. **Sauvegardez**

**Attendu** : Une nouvelle version de la section "porteurs" est créée par User 2

#### Étape 4 : Modifier une autre section avec User 1
1. **Déconnectez-vous**
2. Reconnectez-vous avec **User 1**
3. Ouvrez le projet "Test Versioning"
4. Ajoutez un **suivi DDT**
5. **Sauvegardez**

**Attendu** : Une nouvelle version de la section "suivis" est créée par User 1

---

### Test 2 : Visualiser les versions dans l'admin

1. Connectez-vous en tant qu'**admin**
2. Allez dans **Admin** > **Versions de Sections**
3. Sélectionnez :
   - **Projet** : "Test Versioning"
   - **Section** : "porteurs"
   - **Utilisateur** : User 2

**Attendu** : Vous devriez voir au moins 1 version créée par User 2 pour la section "porteurs"

4. Cliquez sur **👁️ Preview** pour voir le contenu de la version

**Attendu** : Vous devriez voir les données JSON de la section "porteurs" au moment de la sauvegarde

---

### Test 3 : Tester la géométrie

#### Étape 1 : Ajouter une géométrie
1. Connectez-vous avec **User 1**
2. Ouvrez le projet "Test Versioning"
3. Allez dans l'onglet **Carte**
4. Dessinez un **polygon** sur la carte
5. Cliquez sur **Analyser**

**Attendu** : Une version de la section "geometrie" est créée

#### Étape 2 : Vérifier dans la console
```
🔐 userId ajouté: 1
📤 Requête API: {...}
```

#### Étape 3 : Vérifier dans l'admin
1. Admin > Versions de Sections
2. Projet : "Test Versioning"
3. Section : "geometrie"
4. Utilisateur : User 1

**Attendu** : Au moins 1 version de géométrie

---

### Test 4 : Scénario de restauration granulaire

#### Contexte
- User 1 crée un projet avec 1 porteur et 1 thématique (mardi)
- User 2 ajoute un 2ème porteur (mercredi)
- User 3 modifie la thématique (jeudi)
- User 1 veut restaurer SA thématique de mardi

#### Étapes

1. **User 1** - Mardi
   - Créer projet "Nouvelle Zone"
   - Ajouter porteur "EPCI"
   - Ajouter thématique "ICPE" avec données X
   - **Sauvegarder**

2. **User 2** - Mercredi
   - Ouvrir "Nouvelle Zone"
   - Ajouter porteur "Association ABC"
   - **Sauvegarder**

3. **User 3** - Jeudi
   - Ouvrir "Nouvelle Zone"
   - Modifier la thématique ICPE (changer données X → Y)
   - **Sauvegarder**

4. **Admin** - Restauration
   - Admin > Versions de Sections
   - Projet : "Nouvelle Zone"
   - Section : "thematiques"
   - Utilisateur : User 1
   - Cliquer sur la version de mardi
   - **🔄 Restaurer**

**Attendu** :
- ✅ Thématique ICPE revient aux données X (état de mardi)
- ✅ Les 2 porteurs restent présents (EPCI + Association ABC)
- ✅ Toutes les autres sections restent intactes

---

## 🔍 Vérifications dans le backend

### 1. Vérifier que les versions sont créées

Ouvrez la console du backend, vous devriez voir :
```
📸 Création d'une nouvelle version de section
   Projet: TEST-2024-001
   Section: porteurs
   User: 1
   Version: 1
✅ Version de section créée: 1
```

### 2. Vérifier dans la base de données

```sql
SELECT
  id_version,
  id_projet,
  section_name,
  user_id,
  version_number,
  snapshot_date
FROM section_versions
ORDER BY snapshot_date DESC
LIMIT 10;
```

**Attendu** : Vous devriez voir les versions créées avec les userId corrects

---

## ❌ Dépannage

### Problème : Aucune version n'est créée

**Causes possibles** :
1. **Utilisateur non connecté**
   - Vérifier : `localStorage.getItem('user')` dans la console
   - Solution : Se connecter

2. **userId non envoyé**
   - Vérifier dans la console réseau (Network tab) :
     - Headers : `x-user-id: 1`
     - Body : `"userId": 1`
   - Solution : Vérifier que les imports sont corrects

3. **Backend ne reçoit pas l'userId**
   - Vérifier les logs backend
   - Solution : Vérifier `extractUserId()` dans le backend

### Problème : Erreur lors de la restauration

**Causes possibles** :
1. **Section_data vide**
   - Le snapshot peut être vide si la section était vide lors de la sauvegarde
   - Normal, pas d'erreur

2. **Droits insuffisants**
   - Seuls les admins peuvent restaurer
   - Solution : Se connecter en tant qu'admin

---

## 📊 Statistiques attendues

Après avoir effectué les tests ci-dessus, dans **Admin > Versions de Sections**, vous devriez voir :

### Statistiques globales
```
Total de versions : 5-10+
```

### Par section
```
porteurs     : 2-3 versions
thematiques  : 1-2 versions
suivis       : 1 version
geometrie    : 1-2 versions
```

### Par utilisateur (Top 3)
```
User 1 : 3-5 versions
User 2 : 1-2 versions
User 3 : 1 version
```

---

## ✅ Validation finale

Le système fonctionne correctement si :

1. ✅ Chaque modification de projet crée une version dans `section_versions`
2. ✅ L'userId est présent dans chaque version
3. ✅ Les versions s'affichent dans Admin > Versions de Sections
4. ✅ Le preview (👁️) affiche les données JSON correctement
5. ✅ La restauration ne restaure QUE la section choisie
6. ✅ Les modifications des autres users ne sont pas affectées
7. ✅ Maximum 10 versions par section/user (les anciennes sont supprimées)

---

## 🎓 Prochaines étapes

Si tous les tests passent :

1. **Documenter pour l'équipe** : Expliquer le système aux utilisateurs finaux
2. **Former les admins** : Comment utiliser la restauration
3. **Monitoring** : Surveiller la taille de la table `section_versions`
4. **Backup** : S'assurer que les versions sont sauvegardées

---

## 📝 Notes importantes

- Les versions sont créées **AVANT** chaque modification (snapshot de l'état actuel)
- Une section vide ne crée pas de version (normal)
- La rétention est de 15 jours (configurable)
- Maximum 10 versions par section/utilisateur (configurable)
- La restauration nécessite les droits admin
- Toutes les restaurations sont enregistrées dans l'audit log
