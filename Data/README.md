# Hydro Sentinel Data Pipeline

## 1) Structure cible

```text
Data/
  README.md
  run_workflow.bat
  scripts/
    prepare_precip_model.py
    prepare_precip_observed.py
    prepare_flow_observed.py
    prepare_volume_observed.py
  templates/
    precip/template_precip_multi_station_mm.xlsx
    flow/template_flow_multi_station_m3s.xlsx
    inflow/template_inflow_multi_station_m3s.xlsx
    volume/template_volume_multi_station_hm3.xlsx
  data_raw/
    model/
      precip/
        stations/model_precip_stations_*.csv
        subbasins/model_precip_subbasins_*.csv
    observed/
      precip/observed_precip_datatable*.{xlsx,csv}
      flow/observed_flow_*.xls
      volume/observed_volume_*.xls
    reference/
      availability/*.json
      geospatial/*
  outputs/
    runs/
    legacy_results/
```

## 2) Nomenclature

- `snake_case` pour les noms de fichiers.
- Préfixes normalisés:
  - `model_precip_*` pour les données modèle.
  - `observed_precip_*`, `observed_flow_*`, `observed_volume_*` pour les observations.
- Sorties horodatées UTC (`YYYYMMDDTHHMMSSZ`).

## 3) Scripts et rôle

### `scripts/prepare_precip_model.py`
- But: transformer un fichier modèle précipitation (AROME/ECMWF) vers template précipitation.
- Entrée: CSV stations (`time, station_id, rr, ...`).
- Sortie: template `.xlsx` + rapports `.json/.txt/.log`.
- Points clés:
  - traitement mono-fichier;
  - ajout automatique des stations manquantes dans la feuille `Données`;
  - contrôles qualité complets.

### `scripts/prepare_precip_observed.py`
- But: transformer un DataTable observé (`.xlsx` ou `.csv`) vers template précipitation.
- Mapping station via feuille `Stations` du template.
- Accepte un sous-ensemble de stations et complète le reste (selon `--fill-missing`).

### `scripts/prepare_flow_observed.py`
- But: transformer des fichiers débit observé (`.xls` HTML exporté, `.xlsx`, `.csv`) vers template débit.
- Gère le mapping station (exact + fuzzy fallback).
- Agrégation temporelle configurable (`--resample-rule`, `--agg`).

### `scripts/prepare_volume_observed.py`
- But: transformer des fichiers volume observé vers template volume.
- Ne traite que les colonnes `Volume`.
- Ignore pour l’instant les colonnes taux/remplissage (warning + rapport).
- Agrégation temporelle configurable.

## 4) Paramètres principaux

- `--input`: fichier source.
- `--template`: template cible.
- `--outdir`: dossier de sortie (par défaut `outputs/runs`).
- `--fill-missing`: valeur de complétion (`nan`, `0`, etc.) pour stations/cellules manquantes.
- `--resample-rule`: règle de rééchantillonnage (ex: `1h`).
- `--agg`: agrégation (`mean`, `last`, etc. selon script).
- `--strict`: retourne erreur si warnings.

## 5) Exemples d’exécution directe

```bat
python scripts/prepare_precip_model.py --input data_raw/model/precip/stations/model_precip_stations_arome_2002.csv --template templates/precip/template_precip_multi_station_mm.xlsx --model AROME --outdir outputs/runs
```

```bat
python scripts/prepare_precip_observed.py --input data_raw/observed/precip/observed_precip_datatable_sebou.xlsx --template templates/precip/template_precip_multi_station_mm.xlsx --outdir outputs/runs
```

```bat
python scripts/prepare_flow_observed.py --input data_raw/observed/flow/observed_flow_taghzout_tissa_zerarda.xls --template templates/flow/template_flow_multi_station_m3s.xlsx --outdir outputs/runs --resample-rule 1h --agg mean
```

```bat
python scripts/prepare_volume_observed.py --input data_raw/observed/volume/observed_volume_brg_elwahda.xls --template templates/volume/template_volume_multi_station_hm3.xlsx --outdir outputs/runs --resample-rule 1h --agg mean
```

## 6) Sorties générées

Chaque run génère:
- 1 fichier template rempli (`.xlsx`)
- 1 rapport détaillé machine (`*_report.json`)
- 1 rapport lisible (`*_report.txt`)
- 1 log d’exécution (`.log`)

## 7) Lanceur batch

- Fichier: `run_workflow.bat`
- Fonctionnalités:
  - choix du workflow (précip modèle, précip observé, débit observé, volume observé)
  - choix mode traitement (fichier unique ou dossier)
  - choix dossier input/output
  - batch multi-fichiers basé sur l’extension attendue

## 8) Notes opérationnelles

- Certains fichiers peuvent rester temporairement verrouillés si ouverts dans Excel/ArcGIS/IDE.
- Les fichiers `*.sr.lock` (shapefiles) peuvent empêcher des moves/suppressions tant que l’application source est ouverte.
- Pour un nettoyage final complet: fermer les applications qui tiennent les verrous puis relancer les moves si nécessaire.
## 9) Interface UI

Une interface desktop est disponible pour piloter tous les traitements sans ligne de commande.

Fichiers:
- `hydro_sentinel_ui.py`
- `run_ui.bat`

Fonctionnalites principales:
- 4 onglets: precipitation modele, precipitation observee, debit observe, volume observe.
- Mode `single` et `batch`.
- Selection input/template/output via boutons de navigation.
- Analyse input avant execution (nombre de fichiers detectes + liste).
- Options exposees selon workflow (`model`, `resample`, `agg`, `fill-missing`, `strict`).
- Validation par confirmation avant lancement.
- Logs en direct dans la fenetre.

Lancer l'UI:
```bat
run_ui.bat
```
ou
```bat
python hydro_sentinel_ui.py
```
