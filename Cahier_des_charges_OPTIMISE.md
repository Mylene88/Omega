**Cahier des charges – Application OMEGA**

# **Présentation Générale**

## **Contexte**
Le présent cahier des charges constitue le document de référence technique et fonctionnel de l'application OMEGA, développée pour répondre aux besoins spécifiques de la Direction Départementale des Territoires d'Eure-et-Loir en matière de gestion et de suivi des projets territoriaux. Ce document s'adresse aux équipes techniques en charge du déploiement, de l'exploitation et de la maintenance de l'application, ainsi qu'aux décideurs et responsables métier devant valider les choix architecturaux et fonctionnels.

L'application OMEGA a été conçue pour fonctionner dans un environnement entièrement cloisonné, conformément aux exigences de sécurité des systèmes d'information de l'administration française. Aucune communication avec des serveurs externes n'est autorisée, garantissant ainsi la confidentialité et l'intégrité des données traitées.

## **Objectifs**
L'application OMEGA répond à plusieurs objectifs stratégiques essentiels pour la DDT d'Eure-et-Loir :

- **Centralisation des données** : Elle vise à centraliser l'ensemble des informations relatives aux projets territoriaux dans une base de données unique et cohérente, mettant fin à la dispersion actuelle des données entre tableurs Excel, documents Word et communications par email.

- **Traçabilité complète** : L'application assure une traçabilité complète de toutes les modifications apportées aux projets grâce à un système de versioning multi-niveaux sophistiqué. Chaque action effectuée par un utilisateur est enregistrée dans un journal d'audit immuable.

- **Visualisation cartographique** : OMEGA offre des capacités avancées de visualisation cartographique grâce à l'intégration de la bibliothèque Leaflet. Les agents peuvent consulter les projets sur une carte interactive, dessiner des géométries précises (polygones, points, polylignes) et calculer automatiquement les communes traversées.

- **Génération de rapports PDF** : L'application permet de générer des rapports PDF complets et professionnels pour chaque projet, servant de support de communication avec les porteurs de projets, les élus locaux et les autres services de l'État.

- **Interface d'administration** : L'application dispose d'une interface d'administration riche permettant aux responsables de la DDT de superviser l'utilisation du système, de consulter les statistiques d'activité, de gérer les demandes de suppression de projets et d'accéder aux journaux d'audit.

## **Périmètre fonctionnel**
Le périmètre fonctionnel de l'application OMEGA couvre l'ensemble du cycle de vie d'un projet territorial, depuis son identification initiale jusqu'à sa conclusion. Le système gère six grandes catégories d'informations pour chaque projet :

1. **Identité du projet** : Identifiant unique (format "PR-YYYY-XXXXX"), nom, description détaillée, statut actuel (phase amont, en cours, en contentieux, finalisé, en exploitation, abandonné), service DDT responsable, contact référent.

2. **Porteurs du projet** : Un projet peut impliquer plusieurs porteurs (collectivités territoriales, entreprises privées, associations, particuliers). Pour chaque porteur : dénomination de la structure, type de porteur, coordonnées complètes du référent.

3. **Historique des suivis DDT** : Chaque interaction significative fait l'objet d'une entrée avec date, commentaire détaillé, et indicateurs booléens (enjeu prioritaire, charte d'accueil économique).

4. **Thématiques associées** : L'application gère cinq grandes familles thématiques (urbanisme, énergies renouvelables, environnement, risques, autres) avec des formulaires spécialisés pour saisir des informations techniques détaillées.

5. **Documents associés** : Liens vers des documents stockés localement sur le réseau de la DDT ou vers des ressources web, avec descriptions explicatives.

6. **Géométrie spatiale** : Les agents peuvent dessiner directement sur la carte les emprises géographiques du projet (polygones, points, polylignes). Le système calcule automatiquement la liste des communes traversées, l'aire en hectares pour les polygones, et la longueur en kilomètres pour les linéaires.

Au-delà de la gestion des projets, l'application intègre un **système complet de versioning** permettant de créer des points de sauvegarde (snapshots) et de restaurer des versions antérieures, ainsi qu'un **workflow de demande de suppression** garantissant qu'aucun projet ne peut être supprimé sans validation préalable d'un administrateur.

## **Utilisateurs cibles et volumétrie**
L'application OMEGA s'adresse à deux profils d'utilisateurs :

- **Administrateurs** (2 à 5 personnes) : Accès complet au système, gestion des comptes utilisateurs, approbation/rejet des demandes de suppression, consultation des journaux d'audit et statistiques, accès à l'interface d'administration avancée.

- **Utilisateurs standard** (agents de la DDT) : Contributeurs quotidiens créant et modifiant les projets, générant des exports PDF, et pouvant demander la suppression d'un projet.

En termes de volumétrie, les projections prévoient la gestion de 200 à 500 projets la première année, avec une croissance conduisant à 1 000 à 2 000 projets au bout de cinq ans.

# **Contexte et Justification du besoin**

## **Problématique initiale**
Avant le développement de l'application OMEGA, la gestion des projets territoriaux au sein de la DDT d'Eure-et-Loir s'effectuait selon des modalités disparates et peu satisfaisantes. Les informations étaient dispersées entre de multiples fichiers Excel, documents Word et échanges par email.

Cette situation générait plusieurs difficultés majeures :
- **Risque de perte d'information élevé** : Fichiers supprimés accidentellement, écrasés par une version antérieure, ou devenus inaccessibles
- **Confusion sur les versions** : Multiplicité des versions créant une confusion permanente sur la version faisant foi
- **Absence de traçabilité** : Impossible de savoir qui avait effectué une modification, quand, et quelle était la valeur précédente
- **Dimension spatiale mal gérée** : Aucun système cohérent pour visualiser l'ensemble des projets sur une carte unique
- **Production de documents fastidieuse** : Travail manuel chronophage source d'erreurs et de retards

## **Expression des besoins**
Face à ces constats, les services de la DDT ont exprimé un ensemble de besoins précis :

1. **Centralisation de l'information** : Base de données unique garantissant l'unicité de la source d'information avec contrôle d'accès robuste.

2. **Traçabilité complète des modifications** : Journal d'audit immuable enregistrant l'identité de l'utilisateur, la date et l'heure, la nature de la modification, et les anciennes et nouvelles valeurs.

3. **Versioning des données** : Points de sauvegarde à des moments clés avec possibilité de restauration ultérieure.

4. **Visualisation cartographique** : Carte interactive permettant de localiser chaque projet et de visualiser son emprise géographique avec calcul automatique des communes concernées.

5. **Collaboration entre agents** : Plusieurs personnes peuvent travailler sur un même projet tout en conservant la trace de l'apport de chacun.

6. **Génération automatisée de rapports** : Production sur simple clic d'un document PDF complet et professionnel respectant la charte graphique de la DDT.

7. **Sécurité et audit** : Interface d'administration pour superviser l'utilisation du système, consulter les statistiques d'activité et accéder aux journaux d'audit.

Sur le plan technique, plusieurs contraintes ont été formulées :
- Fonctionnement dans un environnement entièrement cloisonné sans connexion vers des serveurs externes
- Performances satisfaisantes même avec plusieurs milliers de projets
- Disponibilité d'au moins 99% hors périodes de maintenance programmée
- Compatibilité avec les navigateurs web modernes (Chrome, Firefox, Edge) sans installation de logiciels supplémentaires

## **Contraintes réglementaires et organisationnelles**

### Contraintes réglementaires

**Conformité au RGPD**
L'application traite des données à caractère personnel (noms, prénoms, adresses email et numéros de téléphone des agents de la DDT et des référents des porteurs de projets). La conformité au RGPD impose :
- Minimisation des données collectées
- Information des personnes concernées
- Sécurisation des données par des mesures techniques et organisationnelles appropriées
- Garantie des droits des personnes (droit d'accès, de rectification, d'effacement)
- Un registre des activités de traitement a été établi et le Délégué à la Protection des Données a été consulté

**Conformité au Référentiel Général de Sécurité (RGS)**
Le **niveau de sécurité RGS requis** est **Standard**, compte tenu de la sensibilité modérée des données traitées. Cela se traduit par :
- Authentification forte des utilisateurs (mot de passe robuste avec changement obligatoire à la première connexion)
- Traçabilité de toutes les actions effectuées
- Protection des communications (utilisation du protocole HTTPS recommandée)
- Procédures de sauvegarde et de continuité d'activité

**Application des 40 règles d'hygiène informatique de l'ANSSI**
Le système OMEGA respecte les 40 règles d'hygiène informatique de l'ANSSI, notamment :
- **Règle 1** : Utilisation de mots de passe robustes avec politique de renouvellement
- **Règle 5** : Mise à jour régulière des logiciels et dépendances (npm audit trimestriel)
- **Règle 8** : Cloisonnement réseau strict (aucune connexion externe autorisée)
- **Règle 12** : Traçabilité complète via journal d'audit immuable
- **Règle 15** : Sauvegardes automatiques quotidiennes avec tests de restauration
- **Règle 20** : Authentification forte et contrôle d'accès basé sur les rôles
- **Règle 25** : Sensibilisation et formation des utilisateurs à la sécurité

**Obligations d'archivage légal**
Les données relatives aux projets territoriaux doivent être conservées pendant des durées minimales définies par la réglementation applicable aux archives publiques. L'application implémente un mécanisme de "soft delete" (suppression logique) : lorsqu'un projet est supprimé, il est marqué comme supprimé dans la base de données mais ses données restent présentes et consultables par les administrateurs.

### Contraintes techniques

**Cloisonnement réseau**
L'application doit fonctionner dans un environnement totalement isolé de l'Internet public. Cette exigence impose que toutes les ressources nécessaires (bibliothèques JavaScript, polices de caractères, tuiles cartographiques) soient stockées localement sur les serveurs de la DDT.

Pour les tuiles cartographiques, un script Python a été développé pour télécharger préalablement les tuiles (environ 2 Go de données pour couvrir le département d'Eure-et-Loir aux niveaux de zoom nécessaires) et les stocker localement.

### Contraintes organisationnelles

- **Formation des utilisateurs** : Doit pouvoir s'effectuer en 5 jours maximum, nécessitant une interface intuitive et une documentation claire
- **Support technique** : Assuré en interne par l'équipe informatique de la DDT, nécessitant une documentation technique détaillée
- **Ressources informatiques** : Application hébergée sur deux serveurs virtuels (8 Go de mémoire vive, 4 cœurs de processeur chacun)
- **Disponibilité des agents** : Cycles de développement courts avec des livraisons incrémentales pour recueillir régulièrement les retours d'expérience

# **Architecture technique**

## **Organisation des données et modèle relationnel**
La structure de la base de données PostgreSQL repose sur cinq schémas distincts qui regroupent logiquement les tables selon leur domaine fonctionnel.

### Schéma "principale"

**Table "user"** : Comptes utilisateurs avec informations d'identification (nom d'utilisateur, mot de passe haché, nom complet, adresse email), rôle (administrateur ou utilisateur standard), et indicateurs de statut.

**Table "projet"** : Cœur du système enregistrant pour chaque projet son identifiant unique, nom, description, statut actuel, service DDT responsable, contact référent. Utilise le mécanisme de "soft delete" de Sequelize.

**Table "projet_porteur"** : Enregistre les porteurs de chaque projet avec leurs caractéristiques. Relation "un projet vers plusieurs porteurs" avec clause "ON DELETE CASCADE".

**Table "projet_suivi"** : Conserve l'historique chronologique des interactions avec date, commentaire détaillé, et indicateurs booléens.

**Table "projet_geometry"** : Stocke les informations spatiales (géométrie au format PostGIS ou GeoJSON, aire en hectares, longueur en kilomètres, liste des communes traversées).

**Tables "projet_snapshot" et "projet_snapshot_section"** : Implémentent le système de versioning. Chaque snapshot représente une sauvegarde complète d'un projet à un instant donné, organisée en six sections stockées au format JSONB.

**Table "section_version"** : Implémente le second niveau de versioning, plus granulaire, permettant de suivre l'évolution spécifique de chaque section indépendamment des autres.

**Table "audit_log"** : Journal d'audit immuable enregistrant chaque création, modification ou suppression de données avec le type d'action (CREATE, UPDATE, DELETE, RESTORE), les anciennes et nouvelles valeurs au format JSONB, l'identifiant de l'utilisateur, son adresse IP, son user-agent, et le timestamp précis. Cette table est strictement en ajout seul (append-only).

**Table "admin_access_log"** : Enregistre spécifiquement les actions effectuées par les administrateurs dans l'interface d'administration.

**Table "projet_deletion_request"** : Gère le workflow de demande de suppression avec statut "pending", "approuvé" ou "rejeté".

**Tables d'énumération** : Définissent les listes de valeurs possibles pour certains champs (rôles utilisateurs, statuts de projet, services DDT, types de porteurs, etc.).

### Schémas thématiques
Les schémas "urbanisme", "enr" (énergies renouvelables), "environnement" et "risques" contiennent les tables spécifiques à chaque thématique, permettant de stocker des informations techniques détaillées.

### Système de migrations
L'ensemble de cette structure a été mise en place progressivement via un système de migrations (23 fichiers de migration appliqués séquentiellement), garantissant la reproductibilité du schéma de base de données et facilitant son évolution.

# **Sécurité et protection des données**

## **Authenticité et contrôle d'accès**
La sécurité de l'application OMEGA repose sur un système d'authentification robuste basé sur les tokens JWT (JSON Web Tokens).

### Mécanisme d'authentification

**Hachage des mots de passe** : Lors de l'inscription initiale, le mot de passe est immédiatement haché avec l'algorithme bcrypt (facteur de coût de 10). Bcrypt incorpore un sel aléatoire unique pour chaque mot de passe et rend le calcul suffisamment lent pour décourager les attaques par force brute.

**Génération du token JWT** : Lorsqu'un utilisateur se connecte, le backend génère un token JWT contenant trois parties : un en-tête spécifiant l'algorithme utilisé, un corps (payload) contenant les informations de l'utilisateur (identifiant, nom d'utilisateur, rôle), et une signature cryptographique. Le token a une durée de validité de 24 heures.

**Vérification du token** : Pour chaque requête vers l'API, le frontend inclut le token dans l'en-tête HTTP "Authorization" sous la forme "Bearer [token]". Le backend vérifie sa signature, sa validité, puis décode le payload pour identifier l'utilisateur.

### Distinction des rôles

Le système distingue deux rôles principaux :

**Administrateurs** : Accès complet au système incluant :
- Création, consultation, modification et demande de suppression de n'importe quel projet
- Accès à l'interface d'administration complète
- Approbation/rejet des demandes de suppression
- Création et gestion des comptes utilisateurs
- Restauration de n'importe quel snapshot
- Export des journaux d'audit au format CSV

**Utilisateurs standard** : Droits adaptés à la gestion quotidienne :
- Création et modification de projets
- Consultation de tous les projets existants
- Génération d'exports PDF
- Demande de suppression (nécessitant validation administrative)
- Pas d'accès à l'interface d'administration

### Première connexion
À la première connexion, le système détecte que l'utilisateur n'a jamais changé son mot de passe (via un champ booléen "first_login") et l'oblige à définir un nouveau mot de passe avant de pouvoir accéder aux fonctionnalités de l'application.

## **Traçabilité et journaux d'audit**
La traçabilité complète de toutes les actions effectuées dans le système répond à plusieurs objectifs : reconstituer l'historique complet d'un projet, faciliter la détection et l'investigation des incidents de sécurité, assurer la responsabilité, et répondre aux obligations légales.

### Journal d'audit principal (table "audit_log")

**Création** : Enregistrement du type d'action "CREATE", du nom de la table, de l'identifiant du nouveau projet, et des valeurs initiales au format JSON.

**Modification** : Enregistrement des anciennes et nouvelles valeurs des champs modifiés, avec stockage de la liste des champs ayant changé dans la colonne "changed_fields".

**Suppression** : Enregistrement de l'action "DELETE" avec l'état complet du projet juste avant sa suppression.

**Restauration** : Enregistrement de l'action "RESTORE" lors de la restauration d'un snapshot.

Le journal d'audit est strictement en ajout seul (append-only) et les entrées sont conservées pendant au moins trois ans.

### Journal des accès administrateurs (table "admin_access_log")
Conserve une trace de toutes les opérations administratives avec l'endpoint API exact appelé, la méthode HTTP utilisée, le code de statut HTTP retourné, et la durée d'exécution en millisecondes.

### Consultation des journaux
Les administrateurs peuvent filtrer les entrées par table, type d'action, utilisateur, plage de dates, et effectuer des recherches textuelles. Ils peuvent également exporter les journaux au format CSV pour des analyses externes.

## **Conformité au RGPD**
L'application OMEGA traite des données à caractère personnel et doit se conformer aux exigences du RGPD.

**Minimisation des données** : Seules les données strictement nécessaires à la gestion des projets sont collectées.

**Finalité du traitement** : Gestion et suivi des projets territoriaux dans le cadre des missions de la DDT, constituant une mission d'intérêt public au sens du RGPD.

**Droits des personnes** : Le droit de rectification est assuré par les fonctionnalités de modification des projets. Le droit d'effacement est géré via le système de soft delete.

**Sécurité des données** : Assurée par le hachage des mots de passe avec bcrypt, les tokens JWT, les journaux d'audit, et l'environnement cloisonné.

**Registre des activités de traitement** : Documentant les catégories de données traitées, les finalités, les catégories de personnes concernées, les destinataires, les durées de conservation, et les mesures de sécurité.

## **Isolation réseau et conformité aux exigences de cloisonnement**
L'application ne doit émettre aucune requête HTTP ou HTTPS vers des serveurs extérieurs au réseau interne de la DDT.

**Audit de conformité** : Toutes les requêtes API émises par le frontend pointent vers des URLs relatives ou vers l'adresse interne du serveur.

**Tuiles cartographiques** : Solution consistant à télécharger préalablement les tuiles via un script Python et à les stocker localement. En mode "local", Leaflet charge les tuiles depuis "/tiles/plan/{z}/{x}/{y}.png" et "/tiles/ortho/{z}/{x}/{y}.png".

**Polices de caractères** : Seules les polices système sont utilisées (Arial, Helvetica). Material-UI configuré pour ne pas charger la police Roboto depuis Google Fonts.

**Aucun outil d'analytics** : Aucun outil d'analytics (Google Analytics, Matomo, etc.) ni pixel de tracking n'est présent.

**Dépendances JavaScript** : Toutes les dépendances sont installées via npm et stockées localement dans "node_modules". Aucune bibliothèque n'est chargée depuis un CDN externe.

**Génération des PDF** : Le HTML généré pour le PDF est transmis directement via la méthode "setContent" de Puppeteer, lancé avec l'option "--no-sandbox" et sans activation du réseau.

# **Gestion des risques**

## **Identification et analyse des risques**

**Perte de données** (Risque élevé)
- Mitigation : Système de sauvegarde automatisé quotidien avec stockage sur un serveur distinct, tests réguliers de restauration

**Accès non autorisé** (Risque faible, impact grave)
- Mitigation : Authentification forte par JWT, hachage des mots de passe, contrôle d'accès basé sur les rôles, journalisation complète, environnement réseau cloisonné

**Corruption de données** (Risque moyen, impact grave)
- Mitigation : Système de versioning multi-niveaux, journal d'audit, contraintes d'intégrité référentielle, validation des données côté backend

**Indisponibilité du service** (Risque moyen, impact moyen)
- Mitigation : Supervision avec alertes, redémarrage automatique des services via systemd, procédures documentées, endpoint de healthcheck

**Erreur utilisateur** (Risque moyen, impact moyen)
- Mitigation : Soft delete, workflow de demande de suppression, snapshots, modales de confirmation

**Vulnérabilités de sécurité** (Risque faible, impact grave)
- Mitigation : ORM Sequelize avec requêtes paramétrées, React échappant automatiquement les valeurs, validation des entrées côté backend, veille sécurité

**Dégradation des performances** (Risque élevé long terme, impact faible à moyen)
- Mitigation : Indexation appropriée des tables, pagination des listes longues, nettoyage automatique des snapshots de plus de 15 jours

**Insuffisance de formation** (Risque élevé, impact moyen)
- Mitigation : Documentation complète, sessions de formation de 2 jours, vidéos de démonstration, désignation de référents

**Dépendance à une personne clé** (Risque moyen, impact grave)
- Mitigation : Documentation technique exhaustive, formation d'au moins deux administrateurs techniques, code source dans un dépôt GitLab, procédures opérationnelles détaillées

**Non-conformité au RGPD** (Risque faible, impact critique)
- Mitigation : Registre des activités de traitement à jour, consultation régulière du DPO, minimisation des données collectées, sécurisation des données

# **Fonctionnalités détaillées de l'application**

## **Système de versioning multi-niveaux**
L'une des fonctionnalités majeures d'OMEGA est son système de versioning à trois niveaux.

### Premier niveau : Snapshots complets

**Fonctionnement** : Un snapshot représente une photographie complète de l'état d'un projet à un instant donné, capturant les six sections du projet (informations générales, porteurs, suivis, thématiques, documents, géométrie). Les informations sont sérialisées au format JSON dans la table "projet_snapshot_section".

**Limitation** : Le système limite le nombre de snapshots à 10 par utilisateur et par projet. Lorsqu'un utilisateur crée un 11ème snapshot, le système supprime automatiquement le plus ancien et réutilise son numéro de version.

**Nettoyage automatique** : Chaque nuit à 3h du matin, un script supprime tous les snapshots créés il y a plus de 15 jours.

**Restauration** : L'utilisateur peut restaurer l'intégralité du snapshot ou uniquement certaines sections spécifiques, permettant des corrections chirurgicales.

### Deuxième niveau : Versions par section

**Fonctionnement** : Les versions par section enregistrent automatiquement l'évolution de chaque section individuellement. Chaque fois qu'une section est modifiée, une nouvelle version peut être créée dans la table "section_version".

**Comparaison** : L'interface d'administration permet de sélectionner deux versions d'une même section et d'afficher un "diff" visuel mettant en évidence les différences (éléments ajoutés en vert, supprimés en rouge, modifiés en orange).

### Troisième niveau : Journal d'audit immuable

Le journal d'audit enregistre uniquement les métadonnées des modifications : qui a modifié quoi, quand, et quels champs précis ont été touchés. Pour chaque modification, le système enregistre les anciennes et nouvelles valeurs au format JSON. Ce journal n'autorise aucune suppression ni modification (strictement append-only).

Ces trois niveaux sont complémentaires : les snapshots pour les restaurations massives, les versions par section pour l'analyse détaillée, le journal d'audit pour la traçabilité réglementaire.

## **Interface d'administration et supervision du système**
L'interface d'administration constitue le centre de contrôle du système pour les responsables de la DDT. Accessible uniquement aux utilisateurs disposant du rôle administrateur.

### Tableau de bord synthétique

Affiche les métriques clés du système :
- Nombre d'utilisateurs actifs (comptes non désactivés ayant au moins une connexion dans les 30 derniers jours)
- Nombre de snapshots stockés dans la base de données
- Nombre de demandes de suppression en attente de traitement

### Onglet "Historique d'Audit"

Donne accès au journal complet de toutes les modifications effectuées dans le système avec filtrage par :
- Table concernée (projets, porteurs, suivis, etc.)
- Type d'action (création, modification, suppression, restauration)
- Utilisateur ayant effectué l'action
- Plage de dates

### Onglet "Demandes de Suppression"

Constitue le cœur du workflow de validation des suppressions. L'administrateur peut :
- **Approuver** : Le projet est marqué comme supprimé (soft delete), la demande passe au statut "Approuvée", une entrée est créée dans les journaux
- **Rejeter** : L'administrateur doit obligatoirement fournir un commentaire expliquant les raisons du refus, la demande passe au statut "Rejetée"

### Onglet "Versions par Section"

Offre une vue détaillée du versioning granulaire avec :
- Filtrage par projet et par section
- Comparaison de deux versions (affichage d'un diff visuel)
- Restauration d'une version spécifique

## **Workflow de demande et validation de suppression**
La suppression d'un projet dans OMEGA ne peut jamais s'effectuer directement et immédiatement.

### Processus côté utilisateur

1. L'utilisateur clique sur "Demander la suppression"
2. Une modale s'ouvre demandant de justifier la demande (champ texte libre d'au moins 10 caractères obligatoire)
3. Le système crée une entrée dans la table "projet_deletion_request" avec le statut "en attente"
4. Le projet reste parfaitement accessible et modifiable

### Processus côté administrateur

1. La demande apparaît dans l'onglet "Demandes de Suppression" de l'interface d'administration
2. L'administrateur consulte le projet complet pour comprendre le contexte
3. **Si approbation** : Une modale de confirmation s'affiche, le projet est marqué comme supprimé (soft delete), la demande passe au statut "Approuvée"
4. **Si rejet** : Une modale demande obligatoirement un commentaire, la demande passe au statut "Rejetée", le projet reste inchangé

## **Génération automatisée de rapports PDF**
La génération de rapports PDF constitue une fonctionnalité majeure d'OMEGA.

### Processus de génération

1. L'utilisateur clique sur le bouton "Télécharger PDF"
2. Le backend génère une chaîne de caractères contenant du code HTML structuré et stylisé
3. Le HTML est organisé en sections clairement identifiées :
   - En-tête : Titre "Fiche Projet", identifiant, nom du projet
   - Informations Générales : Statut, service DDT responsable, contact référent, dates
   - Porteurs de Projet : Tableau avec une ligne par porteur
   - Historique des Suivis DDT : Tableau avec une ligne par suivi
   - Thématiques associées
   - Documents liés
   - Informations spatiales (communes traversées, aire ou longueur)

L'utilisateur obtient en quelques secondes un document PDF complet, professionnel, et prêt à être imprimé ou envoyé par email. Le PDF constitue une photographie de l'état du projet au moment de la génération.

## **Visualisation cartographique et analyses spatiales**
La dimension spatiale des projets territoriaux est fondamentale, et OMEGA accorde une place centrale à la visualisation cartographique grâce à l'intégration de la bibliothèque Leaflet.

### Initialisation de la carte

Lorsqu'un utilisateur accède à la page de visualisation cartographique :
- La carte est centrée sur le département d'Eure-et-Loir (latitude 48°45', longitude 1°48') avec un niveau de zoom 9
- Deux fonds de carte sont disponibles : "Plan IGN" (carte topographique classique) et "Ortho" (photographies aériennes récentes)
- Les tuiles sont chargées depuis le serveur local de la DDT (arborescence "/tiles/plan/" et "/tiles/ortho/")

### Stylisation des géométries

Code couleur défini en fonction du statut du projet :
- "Phase amont" : cyan foncé
- "En cours" : jaune
- "Finalisé" : vert
- "En exploitation" : bleu foncé
- "Abandonné" : rouge
- "En contentieux" : violet foncé

Épaisseur du trait : 2 pixels, opacité du remplissage : 30%.

### Interactions

**Clic sur une géométrie** : Ouverture d'un panneau latéral affichant les détails du projet (nom, statut, porteurs, boutons d'action).

**Calcul automatique des communes traversées** : Dès qu'une géométrie est dessinée ou modifiée, le système récupère le code INSEE, l'EPCI, Arrondissement(s), Député(s), Maire(s) et les commune(s).

**Calculs quantitatifs** :
- Pour les polygones : Aire en hectares (calcul de surface sur sphère)
- Pour les polylignes : Longueur en kilomètres (distances géodésiques entre les sommets successifs)

### Fonctionnalités de filtrage

L'utilisateur peut filtrer les projets affichés selon :
- Leur statut
- Le service DDT responsable
- La thématique
- Rectangle de sélection spatial

## **Gestion du cycle de vie des comptes utilisateurs**

### Création d'un compte (réservée aux administrateurs)

1. L'administrateur accède à la section "Gestion des Utilisateurs"
2. Il clique sur "Créer un utilisateur" et remplit un formulaire (nom d'utilisateur, nom complet, adresse email professionnelle, rôle)
3. Un mot de passe temporaire est généré automatiquement et affiché une seule fois
4. L'administrateur communique ce mot de passe par un canal sécurisé
5. Le mot de passe temporaire est immédiatement haché avec bcrypt avant d'être stocké
6. Le champ "first_login" est positionné à "true"

### Première connexion

1. L'utilisateur saisit le nom d'utilisateur et le mot de passe temporaire
2. Le système génère un token JWT et détecte que "first_login" est à "true"
3. Un formulaire de changement de mot de passe obligatoire s'affiche
4. L'utilisateur doit saisir son mot de passe temporaire actuel puis deux fois un nouveau mot de passe
5. Le nouveau mot de passe doit respecter des règles de complexité (longueur minimale 8 caractères, 12 recommandés)
6. Une fois validé, le mot de passe est haché avec bcrypt, le champ "first_login" passe à "false"
7. L'utilisateur est redirigé vers la page d'accueil

### Réinitialisation d'un mot de passe

Un administrateur peut réinitialiser le mot de passe d'un utilisateur. Cette opération génère un nouveau mot de passe temporaire, repositionne "first_login" à "true", et l'utilisateur devra changer son mot de passe lors de sa prochaine connexion.

### Désactivation d'un compte

La suppression complète d'un compte n'est généralement pas effectuée pour des raisons de traçabilité. La désactivation constitue l'alternative recommandée (activation d'un flag "is_active" à "false").

# **Procédures d'exploitation et de maintenance**

## **Démarrage et arrêt de l'application**

[Section à compléter selon les besoins spécifiques de déploiement]
