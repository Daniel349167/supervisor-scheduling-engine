import { useState } from 'react'
import './App.css'
import { generateSchedule } from './scheduler'

function App() {
  const [inputs, setInputs] = useState({
    workDays: 14,
    restDays: 7,
    inductionDays: 5,
    totalDays: 30,
  })
  const [inputIssues, setInputIssues] = useState([])
  const [qa, setQa] = useState({
    enabled: false,
    baseline: false,
    forceThree: false,
    forceOne: false,
  })
  const [result, setResult] = useState(() => generateSchedule(inputs))

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setInputs((prev) => ({
      ...prev,
      [field]: value === '' ? '' : Number(value),
    }))
  }

  const validateInputs = (values) => {
    const issues = []
    const workDays = Number(values.workDays)
    const restDays = Number(values.restDays)
    const inductionDays = Number(values.inductionDays)
    const totalDays = Number(values.totalDays)

    if (!Number.isFinite(workDays) || workDays < 3) {
      issues.push('Los dias de trabajo (N) deben ser al menos 3.')
    }

    if (!Number.isFinite(restDays) || restDays < 3) {
      issues.push('Los dias de descanso (M) deben ser al menos 3.')
    }

    if (!Number.isFinite(inductionDays) || inductionDays < 1 || inductionDays > 5) {
      issues.push('La induccion debe estar entre 1 y 5 dias.')
    }

    if (!Number.isFinite(totalDays) || totalDays < 1) {
      issues.push('El total de dias debe ser al menos 1.')
    }

    if (Number.isFinite(workDays) && Number.isFinite(inductionDays) && workDays <= inductionDays) {
      issues.push('Los dias de trabajo (N) deben ser mayores que la induccion.')
    }

    return issues
  }

  const handleQaChange = (field) => (event) => {
    const checked = event.target.checked
    setQa((prev) => {
      if (field === 'enabled' && !checked) {
        return {
          enabled: false,
          baseline: false,
          forceThree: false,
          forceOne: false,
        }
      }
      return {
        ...prev,
        [field]: checked,
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalized = {
      workDays: Number(inputs.workDays),
      restDays: Number(inputs.restDays),
      inductionDays: Number(inputs.inductionDays),
      totalDays: Number(inputs.totalDays),
    }
    const issues = validateInputs(normalized)
    setInputIssues(issues)
    if (issues.length > 0) {
      setResult(null)
      return
    }
    const mode = qa.enabled && qa.baseline ? 'baseline' : 'strict'
    const qaConfig = qa.enabled
      ? {
          forceThree: qa.forceThree,
          forceOne: qa.forceOne,
        }
      : null
    setResult(generateSchedule({ ...normalized, mode, qa: qaConfig }))
  }

  const dayLabel = (day) => day + 1

  const dayList = (days) => {
    if (!days || days.length === 0) {
      return '0'
    }
    const labeledDays = days.map(dayLabel)
    if (labeledDays.length <= 12) {
      return labeledDays.join(', ')
    }
    const head = labeledDays.slice(0, 12).join(', ')
    return `${head} ... (+${labeledDays.length - 12})`
  }

  const statusClass = (status) => {
    switch (status) {
      case 'S':
        return 'status status-s'
      case 'I':
        return 'status status-i'
      case 'P':
        return 'status status-p'
      case 'B':
        return 'status status-b'
      case 'D':
        return 'status status-d'
      default:
        return 'status status-empty'
    }
  }

  const dayErrors = new Set(result?.issues?.errorDays ?? [])
  const totalDays = result?.pCount?.length ?? 0

  return (
    <div className="app">
      <header className="hero">
        <span className="hero-kicker">Cronograma operativo</span>
        <h1>Turnos de supervisores de perforacion</h1>
        <p>
          Ajusta el regimen y genera un cronograma con 2 supervisores perforando por dia,
          manteniendo la secuencia valida de S, I, P, B y D.
        </p>
      </header>

      <main className="panels">
        <section className="panel panel-inputs">
          <div className="panel-title">
            <h2>Configuracion</h2>
            <p>Define el regimen y el horizonte de dias.</p>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="workDays">Regimen (N x M)</label>
              <div className="regimen">
                <input
                  id="workDays"
                  type="number"
                  min="3"
                  value={inputs.workDays}
                  onChange={handleChange('workDays')}
                />
                <span className="regimen-x">x</span>
                <input
                  id="restDays"
                  type="number"
                  min="3"
                  value={inputs.restDays}
                  onChange={handleChange('restDays')}
                />
              </div>
              <span className="field-hint">N = dias de trabajo, M = dias libres.</span>
            </div>

            <div className="field">
              <label htmlFor="inductionDays">Dias de induccion (1 a 5)</label>
              <input
                id="inductionDays"
                type="number"
                min="1"
                max="5"
                value={inputs.inductionDays}
                onChange={handleChange('inductionDays')}
              />
            </div>

            <div className="field">
              <label htmlFor="totalDays">Total de dias de perforacion</label>
              <input
                id="totalDays"
                type="number"
                min="1"
                value={inputs.totalDays}
                onChange={handleChange('totalDays')}
              />
            </div>

            <button className="cta" type="submit">
              Calcular cronograma
            </button>

            <div className="qa">
              <div className="qa-header">
                <span className="qa-title">Modo QA</span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={qa.enabled}
                    onChange={handleQaChange('enabled')}
                  />
                  <span>Activar</span>
                </label>
              </div>
              {qa.enabled && (
                <div className="qa-options">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={qa.baseline}
                      onChange={handleQaChange('baseline')}
                    />
                    <span>Usar cronograma base (sin ajustes)</span>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={qa.forceThree}
                      onChange={handleQaChange('forceThree')}
                    />
                    <span>Forzar 3 perforando (1 dia)</span>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={qa.forceOne}
                      onChange={handleQaChange('forceOne')}
                    />
                    <span>Forzar 1 perforando (post S3)</span>
                  </label>
                </div>
              )}
              <span className="field-hint">
                Activa este modo para probar alertas y recalcula el cronograma.
              </span>
            </div>
          </form>

          {inputIssues.length > 0 && (
            <div className="notice notice-warn">
              <strong>Revisar parametros</strong>
              <ul>
                {inputIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel panel-output">
          <div className="panel-title">
            <h2>Resultado</h2>
            <p>Visualiza el cronograma y las validaciones.</p>
          </div>

          {qa.enabled && (
            <div className="notice notice-info">
              <strong>Modo QA activo</strong>
              <span>Algunos resultados pueden incluir errores forzados.</span>
            </div>
          )}

          {!result && (
            <div className="notice notice-info">
              Completa la configuracion y presiona calcular.
            </div>
          )}

          {result?.error && (
            <div className="notice notice-error">
              <strong>Error</strong>
              <span>{result.error}</span>
            </div>
          )}

          {result && !result.error && (
            <>
              <div className="summary">
                <div>
                  <span className="summary-label">S3 sube dia</span>
                  <strong>{dayLabel(result.s3Start)}</strong>
                </div>
                <div>
                  <span className="summary-label">Regla estricta desde</span>
                  <strong>{dayLabel(result.enforceDay)}</strong>
                </div>
                <div>
                  <span className="summary-label">Dias mostrados</span>
                  <strong>{totalDays}</strong>
                </div>
                {qa.enabled && (
                  <div>
                    <span className="summary-label">Modo QA</span>
                    <strong>{qa.baseline ? 'Base' : 'Ajustado'}</strong>
                  </div>
                )}
              </div>

              <div className="legend">
                <span className="legend-item status-s">S Subida</span>
                <span className="legend-item status-i">I Induccion</span>
                <span className="legend-item status-p">P Perforacion</span>
                <span className="legend-item status-b">B Bajada</span>
                <span className="legend-item status-d">D Descanso</span>
                <span className="legend-item status-empty">- Vacio</span>
              </div>

              <div className="alerts">
                <div className="alert">
                  <span className="alert-title">Dias con 3 perforando</span>
                  <span>{dayList(result.issues.threePerf)}</span>
                </div>
                <div className="alert">
                  <span className="alert-title">Dias con 1 perforando (post S3)</span>
                  <span>{dayList(result.issues.onePerf)}</span>
                </div>
                <div className="alert">
                  <span className="alert-title">Patrones invalidos</span>
                  <span>
                    {result.issues.patternIssues.length > 0
                      ? `${result.issues.patternIssues.length} hallados`
                      : '0'}
                  </span>
                </div>
              </div>

              {result.issues.patternIssues.length > 0 && (
                <div className="notice notice-warn">
                  <strong>Detalle de patrones invalidos</strong>
                  <ul>
                    {result.issues.patternIssues.slice(0, 6).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  {result.issues.patternIssues.length > 6 && (
                    <span>
                      ... y {result.issues.patternIssues.length - 6} mas.
                    </span>
                  )}
                </div>
              )}

              <div className="schedule">
                <div className="schedule-scroll">
                  <div className="row">
                    <div className="row-label">Dia</div>
                    <div
                      className="row-cells"
                      style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cell))` }}
                    >
                      {Array.from({ length: totalDays }, (_, day) => (
                        <div key={`day-${day}`} className="cell cell-day">
                          {dayLabel(day)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {[
                    { label: 'S1', data: result.s1Schedule },
                    { label: 'S2', data: result.s2Schedule },
                    { label: 'S3', data: result.s3Schedule },
                  ].map((row) => (
                    <div className="row" key={row.label}>
                      <div className="row-label">{row.label}</div>
                      <div
                        className="row-cells"
                        style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cell))` }}
                      >
                        {row.data.map((status, day) => (
                          <div key={`${row.label}-${day}`} className={`cell ${statusClass(status)}`}>
                            {status}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="row">
                    <div className="row-label">#P</div>
                    <div
                      className="row-cells"
                      style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cell))` }}
                    >
                      {result.pCount.map((count, day) => (
                        <div
                          key={`count-${day}`}
                          className={`cell cell-count ${
                            dayErrors.has(day) ? 'cell-count-error' : ''
                          }`}
                        >
                          {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="schedule-footnote">
                  Los dias resaltados en rojo no cumplen con 2 perforando desde el inicio de la
                  regla estricta.
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
