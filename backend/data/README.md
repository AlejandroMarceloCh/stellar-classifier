# Dataset — Stellar Classification SDSS17

> Esta carpeta contiene el dataset crudo. **No se commitea** (configurado en `.gitignore`).

---

## Descargar el dataset

### Opción A — Manual (más simple)

1. Ir a https://www.kaggle.com/datasets/fedesoriano/stellar-classification-dataset-sdss17
2. Loguearse con cuenta de Kaggle (gratis).
3. Click en "Download" (esquina superior derecha).
4. Descomprimir `archive.zip` en esta carpeta.

Resultado esperado:
```
backend/data/
├── README.md          ← este archivo
├── .gitkeep
└── star_classification.csv   ← ~9 MB, 100,000 filas
```

### Opción B — Kaggle CLI (recomendado si vas a re-bajar)

1. Crear API token en https://www.kaggle.com/settings/account → "Create New Token". Eso descarga `kaggle.json`.
2. Mover el archivo a `~/.kaggle/kaggle.json` y darle permisos:
   ```bash
   mkdir -p ~/.kaggle
   mv ~/Downloads/kaggle.json ~/.kaggle/kaggle.json
   chmod 600 ~/.kaggle/kaggle.json
   ```
3. Activar venv del backend e instalar kaggle:
   ```bash
   cd /Users/alejandromarcelo/Desktop/PROYECTOS_2026/stellar-classifier/backend
   source venv/bin/activate
   pip install kaggle  # ya está en requirements.txt
   ```
4. Descargar:
   ```bash
   kaggle datasets download -d fedesoriano/stellar-classification-dataset-sdss17 -p data --unzip
   ```

---

## Verificar la descarga

```bash
cd /Users/alejandromarcelo/Desktop/PROYECTOS_2026/stellar-classifier/backend
ls -lh data/
# Deberías ver: star_classification.csv (~9 MB)

source venv/bin/activate
python -c "import pandas as pd; df = pd.read_csv('data/star_classification.csv'); print(df.shape); print(df['class'].value_counts())"
```

Output esperado:
```
(100000, 18)
GALAXY    59445
STAR      21594
QSO       18961
Name: class, dtype: int64
```

---

## Schema del dataset

| Columna | Tipo | Descripción | Uso |
|---|---|---|---|
| `obj_ID` | int | ID interno del SDSS | metadata, descartar |
| `alpha` | float | Ascensión Recta (0-360°) | **feature** |
| `delta` | float | Declinación (-90 a +90°) | **feature** |
| `u` | float | Magnitud filtro ultravioleta | **feature** |
| `g` | float | Magnitud filtro verde | **feature** |
| `r` | float | Magnitud filtro rojo | **feature** |
| `i` | float | Magnitud filtro infrarrojo cercano | **feature** |
| `z` | float | Magnitud filtro infrarrojo medio | **feature** |
| `run_ID` | int | ID de la corrida de observación | metadata, descartar |
| `rerun_ID` | int | Versión del procesamiento | metadata, descartar |
| `cam_col` | int | Columna de la cámara | metadata, descartar |
| `field_ID` | int | ID del campo observado | metadata, descartar |
| `spec_obj_ID` | int | ID del espectro asociado | metadata, descartar |
| `class` | str | GALAXY / STAR / QSO | **target** |
| `redshift` | float | Corrimiento al rojo | **feature** |
| `plate` | int | Plate ID del espectrógrafo | metadata, descartar |
| `MJD` | int | Modified Julian Date de observación | metadata, descartar |
| `fiber_ID` | int | Fiber ID del espectrógrafo | metadata, descartar |

**Total**: 18 columnas → 8 features + 1 target + 9 metadata descartadas.

---

## Licencia y citación

El dataset es **CC0 Public Domain** según Kaggle. Datos originales del Sloan Digital Sky Survey Data Release 17 — https://www.sdss.org/dr17/.

Para citación en el reporte final:
> Abdurro'uf et al. (2022). *The Seventeenth Data Release of the Sloan Digital Sky Surveys*. The Astrophysical Journal Supplement Series, 259, 35.
