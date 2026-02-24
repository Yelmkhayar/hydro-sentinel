# Environnements du Projet Hydro-Météo Sebou

Ce document liste les dépendances et décrit la configuration des environnements pour le Backend (Python) et le Frontend (React/Vite).

## 1. Backend (FastAPI / Python)

L'environnement Backend utilise Python et est géré via **micromamba** (ou conda) et **pip**. 

### Dépendances principales
- **Framework web** : FastAPI, Uvicorn
- **Base de données** : SQLAlchemy (v2.0+), asyncpg (PostgreSQL), GeoAlchemy2
- **Analyse de données** : pandas, geopandas, numpy
- **Géospatial** : shapely, rasterio, pyproj
- **Divers** : pydantic, python-multipart, python-jose, passlib

### Fichier d'export (requirements.txt)
Un fichier complet contenant les versions exactes de l'environnement a été généré via `pip freeze` dans `backend/requirements.txt`.

### Instructions d'installation
Pour recréer l'environnement :
```bash
cd backend
# Si utilisation de conda/micromamba pour isoler l'environnement :
micromamba create -n geo_env python=3.10
micromamba activate geo_env

# Installation des dépendances
pip install -r requirements.txt
```

---

## 2. Frontend (React / Vite / TypeScript)

L'environnement Frontend est basé sur Node.js et utilise **npm** (ou pnpm/yarn) avec **package.json**.

### Dépendances principales
- **Framework** : React 18, Vite, TypeScript
- **UI & Composants** : Radix UI, TailwindCSS, shadcn/ui, Lucide React
- **Cartographie** : maplibre-gl, leaflet, react-leaflet
- **Graphiques** : recharts, echarts
- **Gestion d'état et requêtes** : zustand, @tanstack/react-query, axios
- **Utilitaires** : date-fns, react-hook-form, zod

### Fichier d'export (package.json)
Le fichier `hydro-sentinel/package.json` contient déjà toutes les dépendances requises pour le projet frontend. Les dépendances sont bloquées sur les versions stables via le fichier `package-lock.json`.

### Instructions d'installation
Pour installer l'environnement frontend :
```bash
cd hydro-sentinel

# Vérifier que vous avez une version de Node.js récente (v18+)
# Installer les modules
npm install

# Lancer le serveur de développement
npm run dev
```
