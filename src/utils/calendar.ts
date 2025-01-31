import type { WorkoutDay } from '@/types/exercises'

export function generateICalendarData(workoutSchedule: (WorkoutDay | 'Rest')[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Eternal Fitness//Workout Schedule//EN");
  
  const now = new Date();
  
  // Helper to pad numbers and format dates as YYYYMMDD
  const pad = (num: number) => (num < 10 ? '0' + num : num.toString());
  const formatDate = (date: Date): string =>
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  
  workoutSchedule.forEach((workout, index) => {
    // Calculate the event date (starting from tomorrow)
    const eventDate = new Date(now);
    eventDate.setDate(now.getDate() + index + 1);
    const dtStart = formatDate(eventDate);
    // dtEnd is the following day (required for all-day events in ICS, dtEnd is non-inclusive)
    const dtEndDate = new Date(eventDate);
    dtEndDate.setDate(eventDate.getDate() + 1);
    const dtEnd = formatDate(dtEndDate);
    
    // Generate the timestamp in the ICS-compliant format
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let summary = '';
    let description = '';
  
    if (workout === 'Rest') {
      summary = "Rest Day";
      description = "Rest & Recovery. Take time off to relax and rejuvenate.";
    } else {
      summary = `Workout: ${workout.name}`;
      // List primary exercises in the description
      const primaryExercises = workout.primary.join(', ');
      description = `Exercises: ${primaryExercises}`;
    }

    lines.push("BEGIN:VEVENT");
    // Create a unique identifier for the event using the index and dtStamp
    lines.push(`UID:${index}-${dtStamp}@eternalfitness.com`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push("END:VEVENT");
  });
  
  lines.push("END:VCALENDAR");
  
  return lines.join("\r\n");
}

export function downloadCalendarFile(icalData: string) {
  const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'workout_schedule.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 