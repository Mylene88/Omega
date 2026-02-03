# Configuration du système de versioning par section

## Problème identifié

Le système de versioning par section est déjà en place dans le backend, mais **aucune version n'est créée** car l'`userId` n'est jamais envoyé dans les requêtes API depuis le frontend.

## Solution

J'ai créé deux fichiers utilitaires pour résoudre ce problème :

### 1. `frontend/src/utils/userHelper.js`

Contient des fonctions pour récupérer l'userId et créer les headers appropriés :
- `getCurrentUserId()` : Récupère l'ID de l'utilisateur connecté
- `getCurrentUser()` : Récupère l'objet utilisateur complet
- `getApiHeaders()` : Crée les headers avec `x-user-id`
- `addUserIdToBody()` : Ajoute `userId` au body d'une requête

### 2. `frontend/src/hooks/useApiWithUserId.js`

Hook React personnalisé qui simplifie les appels API avec userId :
- `post(url, data)` : POST avec userId automatique
- `put(url, data)` : PUT avec userId automatique
- `patch(url, data)` : PATCH avec userId automatique
- `delete(url, data)` : DELETE avec userId automatique
- `fetchWithUserId(url, options)` : Fetch générique avec userId

## Comment l'utiliser

### Exemple 1 : Dans un composant React

```javascript
import { useApiWithUserId } from '../hooks/useApiWithUserId';

function MonComposant() {
  const api = useApiWithUserId();

  const handleAddPorteur = async (porteurData) => {
    try {
      const response = await api.post('http://localhost:3000/api/porteurs', porteurData);
      const result = await response.json();
      // ...
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    // ...
  );
}
```

### Exemple 2 : Avec fetch directement

```javascript
import { getApiHeaders, addUserIdToBody } from '../utils/userHelper';

async function saveData(data) {
  const response = await fetch('http://localhost:3000/api/porteurs', {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(addUserIdToBody(data))
  });

  return await response.json();
}
```

## Fichiers à modifier

Pour que le système de versioning fonctionne, vous devez modifier **toutes** les requêtes POST/PUT/PATCH/DELETE dans les fichiers suivants :

### 1. Porteurs
- `frontend/src/components/porteur/**/*.js`
- Ajouter userId lors de l'ajout/modification/suppression de porteurs

### 2. Suivis DDT
- `frontend/src/components/suivi_ddt/**/*.js`
- Ajouter userId lors de l'ajout de suivis

### 3. Thématiques
- `frontend/src/pages/Thematique/**/*.js`
- `frontend/src/components/thematique/**/*.js`
- Ajouter userId lors de l'ajout/modification de thématiques

### 4. Documents
- `frontend/src/pages/Document/**/*.js`
- Ajouter userId lors de l'ajout/suppression de documents

### 5. Géométrie
- `frontend/src/components/carte/**/*.js`
- Ajouter userId lors de la modification de la géométrie

### 6. Informations du projet
- `frontend/src/pages/FormulairePage.js`
- Ajouter userId lors de la modification des infos du projet

## Comment vérifier que ça fonctionne

1. Connectez-vous avec un utilisateur
2. Modifiez une section d'un projet (ex: ajoutez un porteur)
3. Allez dans l'admin > Versions de Sections
4. Sélectionnez le projet, la section et l'utilisateur
5. Vous devriez voir les versions créées !

## Backend - Comment fonctionne le versioning

Le backend utilise `saveCurrentSectionVersion()` qui :
1. Récupère l'userId depuis :
   - Le header `x-user-id` (prioritaire)
   - Le body de la requête (`userId`)
   - Les query params (`userId`)
2. Sauvegarde un snapshot des données **avant** modification
3. Limite à 10 versions par section/utilisateur
4. Supprime automatiquement les versions de +15 jours

## Sections supportées

- `projet_info` : Informations générales du projet
- `porteurs` : Porteurs et contacts
- `suivis` : Suivis DDT
- `thematiques` : Thématiques et données associées
- `documents` : Documents attachés
- `geometrie` : Géométrie du projet

## Prochaines étapes

1. **Intégrer le hook dans tous les composants** qui font des modifications
2. **Tester** chaque section pour vérifier que les versions sont créées
3. **Vérifier** dans l'admin que les versions s'affichent correctement
4. **Documenter** pour les futurs développeurs

## Notes importantes

- Le système crée une version **AVANT** chaque modification
- Si l'userId n'est pas fourni, aucune version n'est créée (mode dégradé)
- Les versions vides (section sans données) ne sont pas sauvegardées
- Maximum 10 versions par section/utilisateur (les plus anciennes sont supprimées)
- Rétention de 15 jours (au-delà, nettoyage automatique)
