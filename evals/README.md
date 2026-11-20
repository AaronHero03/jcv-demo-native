# Cross-Review del Ground Truth

Se revisaron 80 pares de `evals/ground-truth/` contra `evals/corpus/corpus.json` y se unificaron en `evals/cases.csv` (70 casos únicos).

## Resumen

- Correctos: 42
- Corregidos: 28
- Descartados: 10

## Tipos de error más comunes

1. Cifras ponderadas o distintas a los valores sin ponderar del corpus.
2. Cifras incorrectas o conteos incompletos en la respuesta.
3. Referencias a datos de 2021 que no existen en el corpus (solo cubre Jul-Ago 2026).
4. Cruces de variables o edad promedio exacta no incluidos en el corpus.
5. Una respuesta fuera de alcance respecto a `DOC-ALCANCE` y una pregunta duplicada al unificar los archivos.
