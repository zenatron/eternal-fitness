export const workoutDisplayNames: { [key: string]: string } = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  fullbody: 'Full Body',
  // Add more mappings here as needed
}

export function getWorkoutDisplayName(name: string): string {
  return workoutDisplayNames[name.toLowerCase()] || name
} 