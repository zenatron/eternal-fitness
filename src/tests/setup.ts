// Add custom matchers or global test setup here
expect.extend({
  toBeValidExercise(received) {
    const isValid = 
      received &&
      typeof received.name === 'string' &&
      Array.isArray(received.muscles) &&
      typeof received.sets?.min === 'number' &&
      typeof received.sets?.max === 'number' &&
      typeof received.reps?.min === 'number' &&
      typeof received.reps?.max === 'number' &&
      ['compound', 'isolation'].includes(received.category) &&
      Array.isArray(received.equipment)

    return {
      message: () =>
        `expected ${received} to be a valid exercise`,
      pass: isValid,
    }
  },
})

// Extend Jest's matchers using module augmentation
declare global {
  interface jest {
    Matchers: {
      toBeValidExercise(): boolean
    }
  }
}

export {} 