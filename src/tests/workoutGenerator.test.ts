import { exercises } from '@/data/exercises'
import { splits } from '@/data/splits'
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
  const validWorkoutCounts = [2, 3, 4, 5, 6]
  
  validWorkoutCounts.forEach(workoutsPerWeek => {
    test(`generates correct number of workouts for ${workoutsPerWeek} days per week`, () => {
      const schedule = generateWorkoutSchedule(workoutsPerWeek, 4)
      const workoutDays = schedule.filter(day => Array.isArray(day))
      try {
        expect(workoutDays).toHaveLength(workoutsPerWeek)
      } catch (error) {
        throw new Error(`Expected ${workoutsPerWeek} workout days, got ${workoutDays.length}`)
      }
    })
  })

  const exerciseCounts = [3, 4, 5, 6]
  
  exerciseCounts.forEach(exerciseCount => {
    test(`generates correct number of exercises (${exerciseCount}) per workout`, () => {
      const schedule = generateWorkoutSchedule(3, exerciseCount)
      schedule.forEach((day, index) => {
        if (Array.isArray(day)) {
          try {
            expect(day).toHaveLength(exerciseCount)
          } catch (error) {
            throw new Error(`Day ${index}: Expected ${exerciseCount} exercises, got ${day.length}`)
          }
          day.forEach((exercise, exIndex) => {
            try {
              expect(typeof exercise).toBe('string')
            } catch (error) {
              throw new Error(`Day ${index}, Exercise ${exIndex}: Expected exercise name to be string, got ${typeof exercise}`)
            }
          })
        }
      })
    })
  })

  test('rest days are properly labeled', () => {
    const schedule = generateWorkoutSchedule(3, 4)
    const restDays = schedule.filter(day => day === 'Rest')
    try {
      expect(restDays.length).toBeGreaterThan(0)
    } catch (error) {
      throw new Error('Expected at least one rest day in schedule')
    }
    restDays.forEach((day, index) => {
      try {
        expect(day).toBe('Rest')
      } catch (error) {
        throw new Error(`Rest day at index ${index} should be exactly 'Rest'`)
      }
    })
  })
}) 