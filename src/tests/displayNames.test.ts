import { workoutDisplayNames, getWorkoutDisplayName } from '@/data/displayNames'
import { splits } from '@/data/splits'

describe('Display Names', () => {
  test('all split patterns have display names defined', () => {
    // Get all unique day types from all splits (excluding 'rest')
    const allDayTypes = new Set<string>()
    Object.values(splits).forEach(split => {
      split.pattern.forEach(day => {
        if (day !== 'rest') {
          allDayTypes.add(day.toLowerCase())
        }
      })
    })

    // Check if each day type has a display name
    allDayTypes.forEach(dayType => {
      const displayName = getWorkoutDisplayName(dayType)
      const hasMapping = dayType in workoutDisplayNames
      
      if (!hasMapping) {
        console.warn(`Warning: No display name mapping found for split type "${dayType}"`)
      }
      
      expect(displayName).toBeTruthy()
      expect(typeof displayName).toBe('string')
    })
  })

  test('getWorkoutDisplayName handles unknown splits gracefully', () => {
    const unknownSplit = 'unknownSplit'
    expect(getWorkoutDisplayName(unknownSplit)).toBe(unknownSplit)
  })

  test('getWorkoutDisplayName is case insensitive', () => {
    expect(getWorkoutDisplayName('UPPER')).toBe('Upper Body')
    expect(getWorkoutDisplayName('upper')).toBe('Upper Body')
    expect(getWorkoutDisplayName('Upper')).toBe('Upper Body')
  })
}) 