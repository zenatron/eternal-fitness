import { exercises } from '@/lib/exercises'
import { splits } from '@/lib/splits'
import { generateWorkoutSchedule } from '@/services/workoutGenerator'

describe('Data Structure Validation', () => {
  describe('Exercise Database', () => {
    test('all exercises have required properties', () => {
      Object.entries(exercises).forEach(([key, exercise]) => {
        const requiredProps = ['name', 'muscles', 'sets', 'reps', 'category', 'equipment']
        requiredProps.forEach(prop => {
          try {
            expect(exercise).toHaveProperty(prop)
          } catch (error) {
            throw new Error(`Exercise "${key}" is missing required property "${prop}"`)
          }
        })
      })
    })

    test('all exercise properties have correct types', () => {
      Object.entries(exercises).forEach(([key, exercise]) => {
        try {
          expect(typeof exercise.name).toBe('string')
        } catch (error) {
          throw new Error(`Exercise "${key}": name should be a string, got ${typeof exercise.name}`)
        }
        
        try {
          expect(Array.isArray(exercise.muscles)).toBe(true)
        } catch (error) {
          throw new Error(`Exercise "${key}": muscles should be an array`)
        }

        exercise.muscles.forEach(muscle => {
          try {
            expect(typeof muscle).toBe('string')
          } catch (error) {
            throw new Error(`Exercise "${key}": muscle "${muscle}" should be a string`)
          }
        })

        try {
          expect(typeof exercise.sets.min).toBe('number')
        } catch (error) {
          throw new Error(`Exercise "${key}": sets.min should be a number`)
        }

        try {
          expect(typeof exercise.sets.max).toBe('number')
        } catch (error) {
          throw new Error(`Exercise "${key}": sets.max should be a number`)
        }

        try {
          expect(typeof exercise.reps.min).toBe('number')
        } catch (error) {
          throw new Error(`Exercise "${key}": reps.min should be a number`)
        }

        try {
          expect(typeof exercise.reps.max).toBe('number')
        } catch (error) {
          throw new Error(`Exercise "${key}": reps.max should be a number`)
        }

        try {
          expect(['compound', 'isolation']).toContain(exercise.category)
        } catch (error) {
          throw new Error(`Exercise "${key}": category should be 'compound' or 'isolation', got "${exercise.category}"`)
        }

        try {
          expect(Array.isArray(exercise.equipment)).toBe(true)
        } catch (error) {
          throw new Error(`Exercise "${key}": equipment should be an array`)
        }

        exercise.equipment.forEach(item => {
          try {
            expect(typeof item).toBe('string')
          } catch (error) {
            throw new Error(`Exercise "${key}": equipment item "${item}" should be a string`)
          }
        })
      })
    })

    test('all exercise ranges are valid', () => {
      Object.entries(exercises).forEach(([key, exercise]) => {
        try {
          expect(exercise.sets.min).toBeLessThanOrEqual(exercise.sets.max)
        } catch (error) {
          throw new Error(`Exercise "${key}": minimum sets (${exercise.sets.min}) should be <= maximum sets (${exercise.sets.max})`)
        }

        try {
          expect(exercise.reps.min).toBeLessThanOrEqual(exercise.reps.max)
        } catch (error) {
          throw new Error(`Exercise "${key}": minimum reps (${exercise.reps.min}) should be <= maximum reps (${exercise.reps.max})`)
        }

        try {
          expect(exercise.sets.min).toBeGreaterThan(0)
        } catch (error) {
          throw new Error(`Exercise "${key}": minimum sets should be > 0`)
        }

        try {
          expect(exercise.reps.min).toBeGreaterThan(0)
        } catch (error) {
          throw new Error(`Exercise "${key}": minimum reps should be > 0`)
        }
      })
    })
  })

  describe('Split Database', () => {
    test('all splits have required properties', () => {
      Object.entries(splits).forEach(([key, split]) => {
        const requiredProps = ['name', 'description', 'daysPerWeek', 'pattern', 'days']
        requiredProps.forEach(prop => {
          try {
            expect(split).toHaveProperty(prop)
          } catch (error) {
            throw new Error(`Split "${key}" is missing required property "${prop}"`)
          }
        })
      })
    })

    test('all split days have required properties', () => {
      Object.entries(splits).forEach(([splitKey, split]) => {
        Object.entries(split.days).forEach(([dayKey, day]) => {
          const requiredProps = ['name', 'description', 'primary', 'secondary']
          requiredProps.forEach(prop => {
            try {
              expect(day).toHaveProperty(prop)
            } catch (error) {
              throw new Error(`Split "${splitKey}", day "${dayKey}" is missing required property "${prop}"`)
            }
          })
        })
      })
    })

    test('all exercises in splits exist in exercise database', () => {
      Object.entries(splits).forEach(([splitKey, split]) => {
        Object.entries(split.days).forEach(([dayKey, day]) => {
          const checkExercise = (exercise: string, type: 'primary' | 'secondary') => {
            const normalizedExercise = exercise.toLowerCase().replace(/\s+/g, '')
            const exists = Object.entries(exercises).some(([key, ex]) => {
              const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
              const normalizedName = ex.name.toLowerCase().replace(/\s+/g, '')
              return normalizedKey === normalizedExercise || normalizedName === normalizedExercise
            })
            try {
              expect(exists).toBe(true)
            } catch (error) {
              throw new Error(`Split "${splitKey}", day "${dayKey}": ${type} exercise "${exercise}" not found in exercise database`)
            }
          }

          day.primary.forEach(ex => checkExercise(ex, 'primary'))
          day.secondary.forEach(ex => checkExercise(ex, 'secondary'))
        })
      })
    })

    test('pattern days match defined days', () => {
      Object.entries(splits).forEach(([splitKey, split]) => {
        split.pattern.forEach((dayType, index) => {
          if (dayType !== 'rest') {
            try {
              expect(split.days).toHaveProperty(dayType)
            } catch (error) {
              throw new Error(`Split "${splitKey}": pattern day "${dayType}" at index ${index} not found in days definition`)
            }
          }
        })
      })
    })

    test('pattern length matches daysPerWeek', () => {
      Object.entries(splits).forEach(([splitKey, split]) => {
        const workoutDays = split.pattern.filter(day => day !== 'rest')
        try { 
          expect(workoutDays.length).toBe(split.daysPerWeek)
        } catch (error) {
          throw new Error(`Split "${splitKey}": number of workout days in pattern (${workoutDays.length}) doesn't match daysPerWeek (${split.daysPerWeek})`)
        }
      })
    })
  })
})

describe('Workout Generator', () => {
  test('generates correct number of days for a week', () => {
    const schedule = generateWorkoutSchedule(3, 5)
    expect(schedule).toHaveLength(7)
  })

  test('generates correct number of exercises per workout day', () => {
    const schedule = generateWorkoutSchedule(3, 5)
    schedule.forEach(day => {
      if (day !== 'Rest') {
        expect(day.primary.length).toBeLessThanOrEqual(5)
      }
    })
  })

  test('includes rest days in the schedule', () => {
    const schedule = generateWorkoutSchedule(3, 5)
    expect(schedule.filter(day => day === 'Rest')).toHaveLength(4)
  })

  test('workout days have required properties', () => {
    const schedule = generateWorkoutSchedule(3, 5)
    schedule.forEach(day => {
      if (day !== 'Rest') {
        expect(day).toHaveProperty('name')
        expect(day).toHaveProperty('description')
        expect(day).toHaveProperty('primary')
        expect(day).toHaveProperty('secondary')
        expect(Array.isArray(day.primary)).toBe(true)
        expect(Array.isArray(day.secondary)).toBe(true)
      }
    })
  })

  test('throws error for invalid workout count', () => {
    expect(() => generateWorkoutSchedule(8, 5)).toThrow('Invalid workout count')
  })

  test('handles different workout frequencies', () => {
    const frequencies = [2, 3, 4, 5, 6]
    frequencies.forEach(freq => {
      const schedule = generateWorkoutSchedule(freq, 5)
      const workoutDays = schedule.filter(day => day !== 'Rest')
      expect(workoutDays).toHaveLength(freq)
    })
  })
})