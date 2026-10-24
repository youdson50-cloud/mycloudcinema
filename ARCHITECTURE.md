# MyCloud Cinema — Architecture & Guide de Déploiement

## 1. Vue d'Ensemble du Système

**MyCloud Cinema** est une application web full-stack et PWA (Progressive Web App) conçue pour permettre à un utilisateur de sauvegarder ses vidéos volumineuses (films, séries, épisodes) dans un cloud personnel sécurisé, de libérer l'espace interne de son smartphone ou ordinateur portable, et de profiter d'un streaming fluide avec reprise de lecture multi-appareils et d'un mode hors ligne authentique.

```
       [ Client Web / Mobile / PWA ]
              │                ▲
  HTTP Range / Range:bytes     │  VTT / SRT Subtitles
  Chunked Upload (3MB slices)  │  IndexedDB Offline Store
              ▼                │
       [ Node.js / Express Core Service ]
       ┌───────────────────────────────┐
       │ - Streamer HTTP 206 Partial   │
       │ - Chunk Assembler & Chiffreur │
       │ - Exposition /metrics Prom    │
       └──────────────┬────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Stockage Objet Distant ]   [ Cloud Firestore ]
  - AES-256-GCM Chiffré        - Métadonnées Médias
  - Multi-Zone Replicas        - Progression de lecture
  - Organisation par UID       - Règles ABAC Zero-Trust
```

---

## 2. Piliers d'Architecture

### A. Stockage Vidéo Distant & Streaming HTTP 206
- **Zéro transit inutile :** La lecture vidéo n'exige jamais le téléchargement complet du fichier. Le lecteur exploite les requêtes HTTP `Range: bytes=start-end` et reçoit des réponses `206 Partial Content`. L'utilisateur peut sauter à n'importe quelle minute du film instantanément.
- **Upload résilient par morceaux (Chunking 3 Mo) :** Les fichiers de plusieurs gigaoctets sont découpés côté client et transférés séquentiellement avec contrôle de redondance et reprise automatique en cas de coupure 4G/Wi-Fi.
- **Libération garantie du stockage local :** L'interface affiche une confirmation explicite uniquement après intégrité validée dans le cloud, invitant l'utilisateur à supprimer le fichier d'origine de son téléphone pour récupérer ses gigaoctets.

### B. Chiffrement AES-256 & Sécurité
- **Chiffrement au repos :** Chiffrement matériel et logiciel AES-256-GCM pour chaque segment binaire vidéo.
- **Chiffrement en transit :** TLS 1.3 obligatoire sur toutes les routes de l'API.
- **Isolation Zero-Trust :** Les règles de sécurité Cloud Firestore (`firestore.rules`) imposent un contrôle d'accès basé sur les attributs (ABAC). Aucun utilisateur ne peut énumérer ou lire les fichiers d'un autre utilisateur (`resource.data.userId == request.auth.uid`).

### C. Redondance Multi-Zone & Haute Disponibilité
- Dans un déploiement cloud (Google Cloud Run ou Kubernetes / Docker Swarm), le stockage objet est configuré en mode **Multi-Region** ou **Multi-Zone** (minimum 3 zones de disponibilité distinctes) pour garantir un SLA de durabilité supérieur à 99,999999999% (11 9's).

### D. Mode Hors Ligne Réel (IndexedDB Blob Store)
- Une vidéo n'est accessible hors ligne que si elle est volontairement téléchargée dans l'espace `IndexedDB` du navigateur.
- L'utilisateur peut supprimer la copie locale à tout moment via l'interface : cette action libère la mémoire de son téléphone **sans jamais supprimer la copie originale conservée dans le Cloud**.

### E. Supervision Prometheus & Grafana
- Métriques exposées sur `/metrics` :
  - `mycloud_requests_total` : Volume et distribution des requêtes HTTP.
  - `mycloud_storage_bytes` : Nombre d'octets stockés au repos.
  - `mycloud_active_streams` : Nombre de flux vidéo simultanés en cours.
  - `mycloud_uploads_total` : Nombre total de transferts complétés.
  - `node_memory_rss_bytes` : Empreinte mémoire résidente du serveur.

---

## 3. Lancement Local & Conteneurs Docker

### Lancement avec Docker Compose (Complet avec Prometheus et Grafana) :
```bash
docker compose up --build -d
```
- Application MyCloud Cinema : `http://localhost:3000`
- Métriques Prometheus : `http://localhost:9090`
- Tableaux de bord Grafana : `http://localhost:3001` (login par défaut : `admin` / `admin`)

---

## 4. Guide des Coûts de Stockage Cloud

| Fournisseur | Coût Stockage / Go / Mois | Egress (Bande Passante) | Recommandation |
| :--- | :--- | :--- | :--- |
| **Google Cloud Storage (Standard)** | ~0,020 $ | ~0,12 $ / Go (100 Go offerts) | Haute intégration GCP & Cloud Run |
| **Wasabi Hot Cloud Storage** | 0,0059 $ | **0 $ (Inclus)** | Idéal pour streaming intensif sans surprise de facture |
| **Backblaze B2 + Cloudflare CDN** | 0,006 $ | **0 $ (Bandwidth Alliance)** | Rapport performance / prix optimal |
