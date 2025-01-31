import { WorkoutDay } from '@/services/workoutGenerator'

export function generateICalendarData(workoutSchedule: (WorkoutDay | 'Rest')[]): string {
  const now = new Date()
  const events = workoutSchedule.map((day, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() + index + 1)
    
    if (day === 'Rest') return null

    const summary = `Workout: ${day.splitName}`
    const description = `Exercises:\n${day.exercises.join('\n')}`
    
    // Format date to YYYYMMDD
    const dateString = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    return `BEGIN:VEVENT
DTSTART:${dateString}
DURATION:PT1H
SUMMARY:${summary}
DESCRIPTION:${description}
END:VEVENT`
  }).filter(Boolean).join('\n')

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Eternal Fitness//Workout Schedule//EN
${events}
END:VCALENDAR`
}

export function downloadCalendarFile(icalData: string) {
  const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'workout-schedule.ics')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
} 