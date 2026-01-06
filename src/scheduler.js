const STATUS = {
  S: 'S',
  I: 'I',
  P: 'P',
  B: 'B',
  D: 'D',
  EMPTY: '-',
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const buildFixedSchedule = ({ totalDays, startDay, workDays, restDays, inductionDays }) => {
  const schedule = Array(totalDays).fill(STATUS.EMPTY)
  const cycleLength = workDays + restDays

  for (let day = 0; day < totalDays; day += 1) {
    const relative = day - startDay
    if (relative < 0) {
      continue
    }

    const cycleIndex = relative % cycleLength
    const cycleNumber = Math.floor(relative / cycleLength)

    if (cycleIndex === 0) {
      schedule[day] = STATUS.S
      continue
    }

    if (cycleIndex <= workDays) {
      if (cycleNumber === 0 && cycleIndex <= inductionDays) {
        schedule[day] = STATUS.I
      } else {
        schedule[day] = STATUS.P
      }
      continue
    }

    if (cycleIndex === workDays + 1) {
      schedule[day] = STATUS.B
    } else {
      schedule[day] = STATUS.D
    }
  }

  return schedule
}

const stateKey = (state) =>
  `${state.phase}|${state.remaining}|${state.elapsed}|${state.firstCycle ? 1 : 0}`

const initState = (startDay) => {
  if (startDay <= 0) {
    return {
      phase: STATUS.S,
      remaining: 1,
      elapsed: 0,
      firstCycle: true,
    }
  }

  return {
    phase: 'pre',
    remaining: startDay,
    elapsed: 0,
    firstCycle: true,
  }
}

const getStatus = (state) => (state.phase === 'pre' ? STATUS.EMPTY : state.phase)

const uniqStates = (states) => {
  const seen = new Set()
  const unique = []

  states.forEach((state) => {
    const key = stateKey(state)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(state)
    }
  })

  return unique
}

const nextStates = (state, config) => {
  const {
    inductionDays,
    minP,
    minD,
    maxP,
    maxD,
    targetPFirst,
    targetP,
    targetD,
  } = config

  switch (state.phase) {
    case 'pre': {
      if (state.remaining > 1) {
        return [
          {
            ...state,
            remaining: state.remaining - 1,
          },
        ]
      }

      return [
        {
          phase: STATUS.S,
          remaining: 1,
          elapsed: 0,
          firstCycle: state.firstCycle,
        },
      ]
    }
    case STATUS.S: {
      if (state.firstCycle && inductionDays > 0) {
        return [
          {
            phase: STATUS.I,
            remaining: inductionDays,
            elapsed: 0,
            firstCycle: state.firstCycle,
          },
        ]
      }

      return [
        {
          phase: STATUS.P,
          remaining: 0,
          elapsed: 1,
          firstCycle: state.firstCycle,
        },
      ]
    }
    case STATUS.I: {
      if (state.remaining > 1) {
        return [
          {
            ...state,
            remaining: state.remaining - 1,
          },
        ]
      }

      return [
        {
          phase: STATUS.P,
          remaining: 0,
          elapsed: 1,
          firstCycle: state.firstCycle,
        },
      ]
    }
    case STATUS.P: {
      const target = state.firstCycle ? targetPFirst : targetP
      const options = []
      const canStay = state.elapsed < maxP
      const canLeave = state.elapsed >= minP

      if (canStay && state.elapsed < target) {
        options.push({
          ...state,
          elapsed: state.elapsed + 1,
        })
      }

      if (canLeave) {
        options.push({
          phase: STATUS.B,
          remaining: 1,
          elapsed: 0,
          firstCycle: false,
        })
      }

      if (canStay && state.elapsed >= target) {
        options.push({
          ...state,
          elapsed: state.elapsed + 1,
        })
      }

      return uniqStates(options)
    }
    case STATUS.B: {
      return [
        {
          phase: STATUS.D,
          remaining: 0,
          elapsed: 1,
          firstCycle: state.firstCycle,
        },
      ]
    }
    case STATUS.D: {
      const options = []
      const canStay = state.elapsed < maxD
      const canLeave = state.elapsed >= minD

      if (canStay && state.elapsed < targetD) {
        options.push({
          ...state,
          elapsed: state.elapsed + 1,
        })
      }

      if (canLeave) {
        options.push({
          phase: STATUS.S,
          remaining: 1,
          elapsed: 0,
          firstCycle: state.firstCycle,
        })
      }

      if (canStay && state.elapsed >= targetD) {
        options.push({
          ...state,
          elapsed: state.elapsed + 1,
        })
      }

      return uniqStates(options)
    }
    default:
      return [state]
  }
}

const buildFlexibleSchedules = ({
  totalDays,
  workDays,
  restDays,
  inductionDays,
  s1Schedule,
  s2Start,
  s3Start,
  enforceDay,
}) => {
  const minP = 2
  const minD = 1
  const maxP = Math.max(minP, workDays + restDays)
  const maxD = Math.max(minD, restDays - 2)
  const targetPFirst = clamp(workDays - inductionDays, minP, maxP)
  const targetP = clamp(workDays, minP, maxP)
  const targetD = clamp(restDays - 2, minD, maxD)

  const config = {
    inductionDays,
    minP,
    minD,
    maxP,
    maxD,
    targetPFirst,
    targetP,
    targetD,
  }

  const schedule2 = Array(totalDays).fill(STATUS.EMPTY)
  const schedule3 = Array(totalDays).fill(STATUS.EMPTY)
  const memo = new Set()

  // Depth-first search with memoization to satisfy daily P constraints.
  const dfs = (day, state2, state3) => {
    if (day >= totalDays) {
      return true
    }

    const status2 = getStatus(state2)
    const status3 = getStatus(state3)
    const pCount =
      (s1Schedule[day] === STATUS.P ? 1 : 0) +
      (status2 === STATUS.P ? 1 : 0) +
      (status3 === STATUS.P ? 1 : 0)

    if (pCount > 2) {
      return false
    }

    if (day >= enforceDay && pCount !== 2) {
      return false
    }

    if (day === totalDays - 1) {
      schedule2[day] = status2
      schedule3[day] = status3
      return true
    }

    const key = `${day}|${stateKey(state2)}|${stateKey(state3)}`
    if (memo.has(key)) {
      return false
    }

    const options2 = nextStates(state2, config)
    const options3 = nextStates(state3, config)

    for (let i = 0; i < options2.length; i += 1) {
      for (let j = 0; j < options3.length; j += 1) {
        if (dfs(day + 1, options2[i], options3[j])) {
          schedule2[day] = status2
          schedule3[day] = status3
          return true
        }
      }
    }

    memo.add(key)
    return false
  }

  const success = dfs(0, initState(s2Start), initState(s3Start))

  if (!success) {
    return null
  }

  return { s2: schedule2, s3: schedule3 }
}

const validatePatterns = (label, schedule) => {
  const issues = []

  for (let day = 0; day < schedule.length - 1; day += 1) {
    const current = schedule[day]
    const next = schedule[day + 1]

    if (current === STATUS.S && next === STATUS.S) {
      issues.push(`${label}: S-S en dia ${day}`)
    }

    if (current === STATUS.S && next === STATUS.B) {
      issues.push(`${label}: S-B en dia ${day}`)
    }
  }

  let day = 0
  while (day < schedule.length) {
    if (schedule[day] !== STATUS.P) {
      day += 1
      continue
    }

    const start = day
    while (day < schedule.length && schedule[day] === STATUS.P) {
      day += 1
    }

    const length = day - start
    const prev = start > 0 ? schedule[start - 1] : null
    const next = day < schedule.length ? schedule[day] : null
    if (length === 1 && prev !== STATUS.P && next !== STATUS.P && start > 0 && day < schedule.length) {
      issues.push(`${label}: P de 1 dia en ${start}`)
    }
  }

  return issues
}

const buildResultFromSchedules = ({
  s1Schedule,
  s2Schedule,
  s3Schedule,
  enforceDay,
  s3Start,
}) => {
  const totalDays = s1Schedule.length
  const pCount = []
  const errorDays = []
  const threePerf = []
  const onePerf = []

  for (let day = 0; day < totalDays; day += 1) {
    const count =
      (s1Schedule[day] === STATUS.P ? 1 : 0) +
      (s2Schedule[day] === STATUS.P ? 1 : 0) +
      (s3Schedule[day] === STATUS.P ? 1 : 0)

    pCount.push(count)

    if (count === 3) {
      threePerf.push(day)
    }

    if (day >= enforceDay && count === 1) {
      onePerf.push(day)
    }

    if (day >= enforceDay && count !== 2) {
      errorDays.push(day)
    }
  }

  const patternIssues = [
    ...validatePatterns('S1', s1Schedule),
    ...validatePatterns('S2', s2Schedule),
    ...validatePatterns('S3', s3Schedule),
  ]

  return {
    s1Schedule,
    s2Schedule,
    s3Schedule,
    pCount,
    enforceDay,
    s3Start,
    issues: {
      errorDays,
      threePerf,
      onePerf,
      patternIssues,
    },
  }
}

const applyQaOverrides = ({ s1Schedule, s2Schedule, s3Schedule, enforceDay, qa }) => {
  if (!qa || (!qa.forceThree && !qa.forceOne)) {
    return { s1Schedule, s2Schedule, s3Schedule }
  }

  const s1 = s1Schedule.slice()
  const s2 = s2Schedule.slice()
  const s3 = s3Schedule.slice()
  const totalDays = s1.length

  if (totalDays === 0) {
    return { s1Schedule: s1, s2Schedule: s2, s3Schedule: s3 }
  }

  const clampDay = (day) => clamp(day, 0, totalDays - 1)

  if (qa.forceThree) {
    const day = clampDay(enforceDay)
    s1[day] = STATUS.P
    s2[day] = STATUS.P
    s3[day] = STATUS.P
  }

  if (qa.forceOne) {
    const day = clampDay(enforceDay + 1)
    s1[day] = STATUS.D
    s2[day] = STATUS.D
    s3[day] = STATUS.P
  }

  return { s1Schedule: s1, s2Schedule: s2, s3Schedule: s3 }
}

export const generateSchedule = ({
  workDays,
  restDays,
  inductionDays,
  totalDays,
  mode = 'strict',
  qa = null,
}) => {
  const s1Schedule = buildFixedSchedule({
    totalDays,
    startDay: 0,
    workDays,
    restDays,
    inductionDays,
  })

  const firstB = s1Schedule.indexOf(STATUS.B)
  const s3Start =
    firstB === -1 ? totalDays : Math.max(0, firstB - (inductionDays + 1))
  const s3FirstP = s3Start + 1 + inductionDays
  const enforceDay = Math.min(totalDays, s3FirstP)

  let s2Schedule
  let s3Schedule

  if (mode === 'baseline') {
    s2Schedule = buildFixedSchedule({
      totalDays,
      startDay: 0,
      workDays,
      restDays,
      inductionDays,
    })
    s3Schedule = buildFixedSchedule({
      totalDays,
      startDay: s3Start,
      workDays,
      restDays,
      inductionDays,
    })
  } else {
    const flexible = buildFlexibleSchedules({
      totalDays,
      workDays,
      restDays,
      inductionDays,
      s1Schedule,
      s2Start: 0,
      s3Start,
      enforceDay,
    })

    if (!flexible) {
      return {
        error: 'No se pudo generar un cronograma valido con las reglas actuales.',
      }
    }

    s2Schedule = flexible.s2
    s3Schedule = flexible.s3
  }

  const qaSchedules = applyQaOverrides({
    s1Schedule,
    s2Schedule,
    s3Schedule,
    enforceDay,
    qa,
  })

  return buildResultFromSchedules({
    ...qaSchedules,
    enforceDay,
    s3Start,
  })
}
