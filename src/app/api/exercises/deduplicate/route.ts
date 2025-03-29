import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - you must be logged in' }), 
        { status: 401 }
      )
    }

    // Get all exercises
    const allExercises = await prisma.exercise.findMany({
      include: {
        sets: true
      }
    })

    // Group exercises by name
    const exercisesByName: Record<string, typeof allExercises> = {}
    allExercises.forEach(exercise => {
      if (!exercisesByName[exercise.name]) {
        exercisesByName[exercise.name] = []
      }
      exercisesByName[exercise.name].push(exercise)
    })

    // Store statistics for the report
    const stats = {
      totalExercisesProcessed: allExercises.length,
      duplicateExerciseNamesFound: 0,
      exercisesDeduped: 0,
      setsUpdated: 0
    }

    // Process each group of exercises with the same name
    for (const [name, exercises] of Object.entries(exercisesByName)) {
      // Skip if no duplicates
      if (exercises.length <= 1) {
        continue
      }

      stats.duplicateExerciseNamesFound++

      // Group further by equipment and muscles (exact match)
      const exercisesBySignature: Record<string, typeof exercises> = {}
      
      exercises.forEach(exercise => {
        // Create a signature by combining sorted muscles and equipment
        const musclesKey = [...exercise.muscles].sort().join(',')
        const equipmentKey = [...exercise.equipment].sort().join(',')
        const signature = `${musclesKey}|${equipmentKey}`
        
        if (!exercisesBySignature[signature]) {
          exercisesBySignature[signature] = []
        }
        exercisesBySignature[signature].push(exercise)
      })

      // For each unique signature, merge duplicates
      for (const sameExercises of Object.values(exercisesBySignature)) {
        if (sameExercises.length <= 1) continue

        // Choose the first one as canonical
        const [canonical, ...duplicates] = sameExercises
        
        // Keep track of all sets that need to be updated
        const setsToUpdate = []
        
        // Collect all sets from duplicates
        for (const duplicate of duplicates) {
          for (const set of duplicate.sets) {
            setsToUpdate.push(set.id)
          }
          stats.exercisesDeduped++
        }
        
        // Update sets to point to the canonical exercise
        if (setsToUpdate.length > 0) {
          // We need to update the many-to-many relationship
          // First disconnect sets from the duplicate exercises
          for (const duplicate of duplicates) {
            for (const set of duplicate.sets) {
              await prisma.set.update({
                where: { id: set.id },
                data: {
                  exercises: {
                    disconnect: { id: duplicate.id },
                    connect: { id: canonical.id }
                  }
                }
              })
              stats.setsUpdated++
            }
          }

          // Delete the duplicate exercises
          for (const duplicate of duplicates) {
            await prisma.exercise.delete({
              where: { id: duplicate.id }
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deduplicated exercises`,
      stats
    })
  } catch (error) {
    console.error('Error deduplicating exercises:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 