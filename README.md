# Cronos Supervisores

Aplicacion web en React (Vite) que genera un cronograma para 3 supervisores de
perforacion cumpliendo las reglas del enunciado: siempre 2 perforando, nunca 3,
S1 fijo y S2/S3 ajustables.

## Reglas y estados
- S: Subida (1 dia)
- I: Induccion (1 a 5 dias)
- P: Perforacion
- B: Bajada (1 dia)
- D: Descanso

## Algoritmo (resumen)
- S1 se genera con el regimen fijo N x M.
- S3 se programa para iniciar su subida antes de la primera bajada de S1.
- S2 y S3 se ajustan con busqueda DFS + memoizacion para que, desde que S3
  entra, siempre existan exactamente 2 supervisores perforando.
- Validaciones adicionales: no S-S, no S-B y no P de 1 dia.

El codigo principal esta en `src/scheduler.js`.

## Requisitos
- Node.js 18+ (recomendado)

## Instalacion
```bash
npm install
```

## Uso local
```bash
npm run dev
```

1. Ingresa N x M, dias de induccion y total de dias.
2. Presiona "Calcular cronograma".
3. Revisa la grilla y las alertas.

## Modo QA (probar alertas)
La app genera cronogramas correctos por defecto, por eso las alertas pueden
mostrar cero problemas. Para probarlas:

1. Activa "Modo QA" en el panel de configuracion.
2. Opcional:
   - "Usar cronograma base (sin ajustes)" muestra un caso con 1 perforando.
   - "Forzar 3 perforando (1 dia)" inyecta un dia con 3 perforando.
   - "Forzar 1 perforando (post S3)" inyecta un dia con 1 perforando.
3. Vuelve a presionar "Calcular cronograma".

## Casos de prueba obligatorios
- 14x7, induccion 5, total 90 dias
- 21x7, induccion 3, total 90 dias
- 10x5, induccion 2, total 90 dias
- 14x6, induccion 4, total 950 dias

## Scripts utiles
- `npm run dev`: servidor local
- `npm run build`: build de produccion
- `npm run preview`: preview del build

## Deploy
GitHub Pages (GitHub Actions):
1. El `base` esta configurado en `vite.config.js` como `/cronograma-supervisores/`.
2. Sube los cambios a GitHub (`main` o `master`).
3. En GitHub: Settings -> Pages -> Build and deployment -> Source: GitHub Actions.
4. El workflow `.github/workflows/deploy.yml` publicara automaticamente.
5. URL esperada: `https://daniel349167.github.io/cronograma-supervisores/`.
