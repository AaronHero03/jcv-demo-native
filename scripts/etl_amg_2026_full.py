"""ETL completo para incluir todas las preguntas cerradas de la encuesta AMG 2026.

Lee:
  - DatosEncuestaBienestar de Jovenes - Jul-Ago 2026(1)/Base de Datos_Bienestar de Jovenes - Jul-Ago 2026.csv
  - DatosEncuestaBienestar de Jovenes - Jul-Ago 2026(1)/Bienestar_de_Jovenes_Jul-Ago_2026_diccionario.json

Genera:
  - src/data/raw/bienestar_jovenes_2026_resumen.json
  - src/data/raw/amg_2026_filtros_offline.json
  - supabase/migrations/20261123000400_full_amg_indicators.sql
"""

import csv
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(
    ROOT,
    "DatosEncuestaBienestar de Jovenes - Jul-Ago 2026(1)",
    "Base de Datos_Bienestar de Jovenes - Jul-Ago 2026.csv",
)
DICT_PATH = os.path.join(
    ROOT,
    "DatosEncuestaBienestar de Jovenes - Jul-Ago 2026(1)",
    "Bienestar_de_Jovenes_Jul-Ago_2026_diccionario.json",
)
RESUMEN_PATH = os.path.join(ROOT, "src", "data", "raw", "bienestar_jovenes_2026_resumen.json")
OFFLINE_PATH = os.path.join(ROOT, "src", "data", "raw", "amg_2026_filtros_offline.json")
SQL_PATH = os.path.join(ROOT, "supabase", "migrations", "20261123000400_full_amg_indicators.sql")

EXCLUDED_KEYS = {"SbjNum", "Date", "Duration", "Q_3", "Q_72recode", "ponderador", "F_ponderador"}

FILTERS = {
    "gender": ("Q_71", {1: "Hombre", 2: "Mujer"}),
    "age_group": ("Q_72recode", {1: "15-19", 2: "20-24", 3: "25-29"}),
    "estrato": ("Estrato", {1: "Alto", 2: "Medio", 3: "Bajo"}),
}

CATEGORY_TO_DIM = {
    "Bienestar": ("bienestar", "Bienestar", 1),
    "Educación": ("educacion", "Educación", 2),
    "Tiempo y Rutina": ("tiempo_rutina", "Tiempo y Rutina", 3),
    "Trabajo y Economía": ("trabajo_economia", "Trabajo y Economía", 4),
    "Salud y Seguridad": ("salud_seguridad", "Salud y Seguridad", 5),
    "Participación y Entorno": ("participacion_entorno", "Participación y Entorno", 6),
    "Perfil Demográfico": ("perfil_demografico", "Perfil Demográfico", 7),
}


def to_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def q_number(var_id: str) -> int:
    m = re.search(r"Q_(\d+)", var_id)
    return int(m.group(1)) if m else 999


def infer_category(var_id: str, existing_cat: str | None) -> str:
    if existing_cat:
        return existing_cat
    if var_id in {"Q_2", "Estrato"}:
        return "Perfil Demográfico"
    n = q_number(var_id)
    if n <= 13:
        return "Bienestar"
    if 14 <= n <= 14 or 20 <= n <= 24:
        return "Tiempo y Rutina"
    if 15 <= n <= 19:
        return "Educación"
    if 25 <= n <= 39:
        return "Trabajo y Economía"
    if 40 <= n <= 56:
        return "Salud y Seguridad"
    if 57 <= n <= 69:
        return "Participación y Entorno"
    return "Perfil Demográfico"


def is_likert_5(valores: dict[str, str]) -> bool:
    keys = {to_int(k) for k in valores.keys()}
    if not {1, 2, 3, 4, 5}.issubset(keys):
        return False
    # Excluir variables nominales como Municipio (1..6) o listas largas de categorías.
    if len(valores) > 7:
        return False
    sample_labels = " ".join(valores.get(str(i), "").lower() for i in range(1, 6))
    likert_hints = (
        "satisfech", "feliz", "nunca", "siempre", "acuerdo", "importan",
        "alta", "baja", "segur", "frecuencia", "confi", "mucho", "nada",
        "poco", "algo", "total", "buen", "mal", "posible",
    )
    return any(h in sample_labels for h in likert_hints)


def capitalize_first(s: str) -> str:
    s = s.strip()
    if not s:
        return s
    if s[0] == "¿" and len(s) > 1:
        return "¿" + s[1].upper() + s[2:]
    return s[0].upper() + s[1:]


def clean_question(etiqueta: str) -> str:
    text = re.sub(r"\s+", " ", etiqueta).strip()
    text = re.sub(r"\s*\[NO LEER\]\s*", " ", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"\s+([,?.:;])", r"\1", text)
    return capitalize_first(text)


def clean_option_label(label: str) -> str:
    text = re.sub(r"\s+", " ", label).strip()
    text = re.sub(r"\s*\[NO LEER\]\s*", "", text, flags=re.IGNORECASE).strip()
    return capitalize_first(text)


def clean_title(var_id: str, etiqueta: str, existing_title: str | None) -> str:
    if existing_title:
        return existing_title
    text = clean_question(etiqueta)

    # 1. Para matrices con ":" al final de la introducción (p. ej. "...siguientes situaciones: X")
    if var_id.startswith("T_") and ":" in text:
        parts = [p.strip() for p in text.split(":") if p.strip()]
        if len(parts) >= 2 and len(parts[-1]) >= 4:
            return capitalize_first(parts[-1].rstrip(" ."))

    # 2. Para reactivos con "..."
    if "..." in text:
        tail = text.split("...")[-1].strip(" :.-?¿")
        if len(tail) >= 4:
            return capitalize_first(tail.rstrip(" ."))

    # 3. Para reactivos con pregunta introductoria seguida del ítem
    if "?" in text:
        q_idx = text.rfind("?")
        after = text[q_idx + 1 :].strip(" :.-")
        if len(after) >= 6:
            return capitalize_first(after.rstrip(" ."))
        # Si la pregunta principal está al final, extraerla
        start_q = text.rfind("¿")
        if start_q > 0:
            q_part = text[start_q : q_idx + 1].strip()
            if len(q_part) >= 8:
                return capitalize_first(q_part)

    # 4. Quitar introducciones largas de entrevistador
    cleaned = re.sub(
        r"^(Ahora te voy a (leer|preguntar)[^.?]*[.?]\s*|Por favor dime,?\s*|En tu opinión,?\s*|Considerando [^,]+,\s*|En una escala del \d+ al \d+,?\s*donde[^,?]+(?:,|y)\s*)",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    if len(cleaned) >= 6:
        text = cleaned

    return capitalize_first(text.rstrip(" ."))


def sql_str(val: str | None) -> str:
    if val is None:
        return "NULL"
    return "'" + val.replace("'", "''") + "'"


def main():
    with open(RESUMEN_PATH, encoding="utf-8") as fh:
        prev_resumen = json.load(fh)
    prev_by_id = {
        ind["id"]: ind
        for ind in prev_resumen["indicators"]
        if ind["id"] in {"Q_6", "Q_7", "Q_8", "Q_9", "Q_10", "Q_14", "Q_15", "Q_16", "Q_17", "Q_20"}
    }
    municipalities = prev_resumen["municipalities"]
    muni_code_map = {str(i + 1): name for i, name in enumerate(municipalities)}

    with open(DICT_PATH, encoding="utf-8") as fh:
        dictionary = json.load(fh)

    raw = open(CSV_PATH, "rb").read()
    text = raw.decode("utf-8-sig") if raw[:3] == b"\xef\xbb\xbf" else raw.decode("latin-1")
    rows = list(csv.DictReader(io.StringIO(text)))
    cols = set(rows[0].keys()) if rows else set()

    # Mantener primero los 10 indicadores principales en su orden original, luego el resto.
    ordered_ids = [ind["id"] for ind in prev_resumen["indicators"] if ind["id"] in cols]
    for k, v in dictionary.items():
        if k in cols and k not in ordered_ids and k not in EXCLUDED_KEYS:
            vals = v.get("valores")
            if isinstance(vals, dict) and len(vals) > 0:
                ordered_ids.append(k)

    full_indicators = []
    offline_rows = []

    for ind_id in ordered_ids:
        entry = dictionary[ind_id]
        raw_valores: dict[str, str] = entry["valores"]
        valores: dict[str, str] = {k: clean_option_label(v) for k, v in raw_valores.items()}
        etiqueta: str = clean_question(entry.get("etiqueta", ind_id))
        prev = prev_by_id.get(ind_id)

        valid_codes = sorted([to_int(k) for k in valores.keys() if to_int(k) is not None])
        likert = is_likert_5(valores)
        scale_codes = [1, 2, 3, 4, 5] if likert else valid_codes

        def compute_counts(subset):
            counts = {c: 0 for c in valid_codes}
            for r in subset:
                c = to_int(r.get(ind_id))
                if c in counts:
                    counts[c] += 1
            return counts

        gen_counts = compute_counts(rows)
        n_total = sum(gen_counts.values())
        if n_total == 0:
            continue

        series = []
        for c in valid_codes:
            cnt = gen_counts[c]
            pct = round((cnt * 100.0) / n_total, 1)
            series.append({"code": c, "label": valores[str(c)], "count": cnt, "pct": pct})

        if likert:
            n_scale = sum(gen_counts.get(c, 0) for c in [1, 2, 3, 4, 5])
            avg = round(sum(c * gen_counts.get(c, 0) for c in [1, 2, 3, 4, 5]) / n_scale, 2) if n_scale > 0 else None
            pos = round((sum(gen_counts.get(c, 0) for c in [4, 5]) * 100.0) / n_scale, 1) if n_scale > 0 else None
        else:
            avg = None
            pos = None

        by_muni = []
        for m_code, m_name in muni_code_map.items():
            sub = [r for r in rows if str(r.get("Q_2", "")).strip() == m_code]
            mc = compute_counts(sub)
            mn = sum(mc.values())
            if likert and mn > 0:
                mn_scale = sum(mc.get(c, 0) for c in [1, 2, 3, 4, 5])
                m_avg = round(sum(c * mc.get(c, 0) for c in [1, 2, 3, 4, 5]) / mn_scale, 2) if mn_scale > 0 else None
                m_pos = round((sum(mc.get(c, 0) for c in [4, 5]) * 100.0) / mn_scale, 1) if mn_scale > 0 else None
            else:
                m_avg = None
                m_pos = None
            by_muni.append({"municipality": m_name, "n": mn, "average": m_avg, "positivePct": m_pos})

        category = infer_category(ind_id, prev["category"] if prev else None)
        title = clean_title(ind_id, etiqueta, prev["title"] if prev else None)
        summary_text = (
            prev["summary"]
            if prev
            else (
                "Distribución porcentual de respuestas (escala 1–5) en la encuesta AMG 2026."
                if likert
                else "Distribución porcentual por categoría de respuesta en la encuesta AMG 2026."
            )
        )

        full_indicators.append({
            "id": ind_id,
            "title": title,
            "category": category,
            "summary": summary_text,
            "question": etiqueta,
            "source": "Encuesta Bienestar de Jóvenes — Jalisco Cómo Vamos",
            "period": "Jul–Ago 2026",
            "sampleSize": n_total,
            "average": avg if avg is not None else 0,
            "positivePct": pos if pos is not None else 0,
            "unit": "%",
            "scaleType": "likert_5" if likert else ("binary" if len(valid_codes) == 2 else "categorical"),
            "series": series,
            "byMunicipality": by_muni,
        })

        # Cortes offline: general + gender + age_group + estrato
        for c in valid_codes:
            cnt = gen_counts[c]
            offline_rows.append({
                "dataset_source": "amg_2026",
                "indicator_id": ind_id,
                "filter_type": "general",
                "filter_value": "all",
                "code": c,
                "label": valores[str(c)],
                "count": cnt,
                "pct": round((cnt * 100.0) / n_total, 2),
            })

        for f_type, (col, mapping) in FILTERS.items():
            for f_code, f_val in mapping.items():
                sub = [r for r in rows if to_int(r.get(col)) == f_code]
                fc = compute_counts(sub)
                fn = sum(fc.values())
                for c in valid_codes:
                    cnt = fc[c]
                    offline_rows.append({
                        "dataset_source": "amg_2026",
                        "indicator_id": ind_id,
                        "filter_type": f_type,
                        "filter_value": f_val,
                        "code": c,
                        "label": valores[str(c)],
                        "count": cnt,
                        "pct": round((cnt * 100.0) / fn, 2) if fn > 0 else 0.0,
                    })

    resumen_out = {
        "dataset": prev_resumen["dataset"],
        "totalRespondents": len(rows),
        "municipalities": municipalities,
        "indicators": full_indicators,
    }
    with open(RESUMEN_PATH, "w", encoding="utf-8") as fh:
        json.dump(resumen_out, fh, ensure_ascii=False, indent=2)

    offline_out = {
        "dataset": "amg_2026",
        "generated_from": os.path.basename(CSV_PATH),
        "weighted": False,
        "rows": offline_rows,
    }
    with open(OFFLINE_PATH, "w", encoding="utf-8") as fh:
        json.dump(offline_out, fh, ensure_ascii=False, separators=(",", ":"))

    # Generar SQL idempotente para Supabase
    sql_lines = [
        "-- Carga completa de indicadores y resúmenes AMG 2026.",
        "INSERT INTO public.dimensions (id, name, description, sort_order) VALUES",
    ]
    dim_vals = [
        f"  ({sql_str(dim_id)}, {sql_str(dim_name)}, {sql_str('Dimensión ' + dim_name)}, {order})"
        for dim_id, dim_name, order in sorted(set(CATEGORY_TO_DIM.values()), key=lambda x: x[2])
    ]
    sql_lines.append(",\n".join(dim_vals))
    sql_lines.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;\n")

    sql_lines.append("INSERT INTO public.indicators (id, dimension_id, title, question_text, scale_type, sample_size, average, positive_pct, is_featured, is_published) VALUES")
    ind_vals = []
    for idx, ind in enumerate(full_indicators):
        dim_id = CATEGORY_TO_DIM[ind["category"]][0]
        avg_sql = f"{ind['average']:.2f}" if ind["scaleType"] == "likert_5" else "NULL"
        pos_sql = f"{ind['positivePct']:.2f}" if ind["scaleType"] == "likert_5" else "NULL"
        feat_sql = "true" if idx < 3 else "false"
        ind_vals.append(
            f"  ({sql_str(ind['id'])}, {sql_str(dim_id)}, {sql_str(ind['title'])}, {sql_str(ind['question'])}, "
            f"{sql_str(ind['scaleType'])}, {ind['sampleSize']}, {avg_sql}, {pos_sql}, {feat_sql}, true)"
        )
    sql_lines.append(",\n".join(ind_vals))
    sql_lines.append(
        "ON CONFLICT (id) DO UPDATE SET dimension_id = EXCLUDED.dimension_id, title = EXCLUDED.title, "
        "question_text = EXCLUDED.question_text, scale_type = EXCLUDED.scale_type, sample_size = EXCLUDED.sample_size, "
        "average = EXCLUDED.average, positive_pct = EXCLUDED.positive_pct;\n"
    )

    sql_lines.append("INSERT INTO public.indicator_options (indicator_id, code, label, is_positive) VALUES")
    opt_vals = []
    for ind in full_indicators:
        is_likert = ind["scaleType"] == "likert_5"
        for s in ind["series"]:
            is_pos = "true" if (is_likert and s["code"] >= 4) else "false"
            opt_vals.append(f"  ({sql_str(ind['id'])}, {s['code']}, {sql_str(s['label'])}, {is_pos})")
    sql_lines.append(",\n".join(opt_vals))
    sql_lines.append("ON CONFLICT (indicator_id, code) DO UPDATE SET label = EXCLUDED.label, is_positive = EXCLUDED.is_positive;\n")

    # Insertar resúmenes por lotes para mantener el SQL limpio
    batch_size = 500
    for start in range(0, len(offline_rows), batch_size):
        chunk = offline_rows[start : start + batch_size]
        sql_lines.append(
            "INSERT INTO public.indicator_summaries (dataset_source, indicator_id, option_id, filter_type, filter_value, count, pct)\n"
            "SELECT v.dataset_source, v.indicator_id, o.id, v.filter_type, v.filter_value, v.count, v.pct\n"
            "FROM (VALUES"
        )
        vals = [
            f"  ('amg_2026', {sql_str(r['indicator_id'])}, {r['code']}, {sql_str(r['filter_type'])}, {sql_str(r['filter_value'])}, {r['count']}, {r['pct']})"
            for r in chunk
        ]
        sql_lines.append(",\n".join(vals))
        sql_lines.append(
            ") AS v(dataset_source, indicator_id, code, filter_type, filter_value, count, pct)\n"
            "JOIN public.indicator_options o ON o.indicator_id = v.indicator_id AND o.code = v.code\n"
            "ON CONFLICT (dataset_source, indicator_id, option_id, filter_type, filter_value)\n"
            "DO UPDATE SET count = EXCLUDED.count, pct = EXCLUDED.pct;\n"
        )

    with open(SQL_PATH, "w", encoding="utf-8") as fh:
        fh.write("\n".join(sql_lines))

    print(f"Generados {len(full_indicators)} indicadores, {len(offline_rows)} filas offline, SQL en {SQL_PATH}")


if __name__ == "__main__":
    main()
