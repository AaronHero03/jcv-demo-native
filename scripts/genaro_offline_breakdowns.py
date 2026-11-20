"""Genera el respaldo offline de filtros (Genaro) para la encuesta AMG 2026.

Lee la base de datos original (CSV) y produce `src/data/raw/amg_2026_filtros_offline.json`
con conteos y porcentajes SIN PONDERAR por opción de respuesta, para los indicadores que
la app muestra, en los cortes `general`, `gender`, `age_group` y `estrato`.

El formato de cada fila sigue el contrato de la tabla `indicator_summaries` de Carlos
(dataset_source, indicator_id, filter_type, filter_value, code, label, count, pct), así que
cuando exista `src/data/raw/amg_2026_summaries.json` (ETL de Carlos) basta con cambiar el
import en `src/data/indicatorSummaries.ts`.

Uso (desde la raíz del repo):
    python -I scripts/genaro_offline_breakdowns.py
"""

import csv
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(
    ROOT,
    "DatosEncuestaBienestar de Jovenes - Jul-Ago 2026(1)",
    "Base de Datos_Bienestar de Jovenes - Jul-Ago 2026.csv",
)
SUMMARY_PATH = os.path.join(ROOT, "src", "data", "raw", "bienestar_jovenes_2026_resumen.json")
OUT_PATH = os.path.join(ROOT, "src", "data", "raw", "amg_2026_filtros_offline.json")

VALID_CODES = {1, 2, 3, 4, 5}

# Cortes demográficos permitidos (lista blanca compartida con src/data/filters.ts).
FILTERS = {
    "gender": ("Q_71", {1: "Hombre", 2: "Mujer"}),
    "age_group": ("Q_72recode", {1: "15-19", 2: "20-24", 3: "25-29"}),
    "estrato": ("Estrato", {1: "Alto", 2: "Medio", 3: "Bajo"}),
}


def to_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def main():
    with open(SUMMARY_PATH, encoding="utf-8") as fh:
        summary = json.load(fh)

    raw = open(CSV_PATH, "rb").read()
    text = raw.decode("utf-8-sig") if raw[:3] == b"\xef\xbb\xbf" else raw.decode("latin-1")
    rows = list(csv.DictReader(io.StringIO(text)))

    out_rows = []
    for indicator in summary["indicators"]:
        ind_id = indicator["id"]
        labels = {s["code"]: s["label"] for s in indicator["series"]}

        groups = [("general", "all", lambda r: True)]
        for filter_type, (column, values) in FILTERS.items():
            for code, label in values.items():
                groups.append(
                    (filter_type, label, lambda r, c=column, v=code: to_int(r.get(c)) == v)
                )

        for filter_type, filter_value, predicate in groups:
            counts = {code: 0 for code in sorted(VALID_CODES)}
            for row in rows:
                if not predicate(row):
                    continue
                answer = to_int(row.get(ind_id))
                if answer in VALID_CODES:
                    counts[answer] += 1
            total = sum(counts.values())
            for code, count in counts.items():
                out_rows.append(
                    {
                        "dataset_source": "amg_2026",
                        "indicator_id": ind_id,
                        "filter_type": filter_type,
                        "filter_value": filter_value,
                        "code": code,
                        "label": labels.get(code, str(code)),
                        "count": count,
                        "pct": round(count * 100 / total, 1) if total else 0,
                    }
                )

        # Verificación: el corte general debe coincidir con el resumen publicado.
        general = {r["code"]: r["count"] for r in out_rows if r["indicator_id"] == ind_id and r["filter_type"] == "general"}
        expected = {s["code"]: s["count"] for s in indicator["series"]}
        if general != expected:
            sys.exit(f"Conteo general de {ind_id} no coincide con el resumen: {general} vs {expected}")

    payload = {
        "dataset": summary["dataset"],
        "generatedBy": "scripts/genaro_offline_breakdowns.py",
        "weighted": False,
        "rows": out_rows,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    print(f"OK: {len(out_rows)} filas -> {os.path.relpath(OUT_PATH, ROOT)}")


if __name__ == "__main__":
    main()
