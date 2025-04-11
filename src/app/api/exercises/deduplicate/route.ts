// import { NextResponse } from "next/server";
// import { auth } from "@clerk/nextjs/server";
// import prisma from "@/lib/prisma";
// import { Prisma } from "@prisma/client"; // Import Prisma types if needed for errors

// // --- Standard Response Helpers ---
// const successResponse = (data: any, status = 200) => {
//   return NextResponse.json({ data }, { status });
// };

// const errorResponse = (message: string, status = 500, details?: any) => {
//   console.error(`API Error (${status}) [exercises/deduplicate]:`, message, details ? JSON.stringify(details) : '');
//   return NextResponse.json({ error: { message, ...(details && { details }) } }, { status });
// };


// export async function POST() {
//   try {
//     const { userId } = await auth();

//     // Optional: Add admin check if this should be restricted
//     // if (!isAdmin(userId)) { return errorResponse('Forbidden', 403); }

//     if (!userId) {
//       return errorResponse('Unauthorized', 401);
//     }

//     console.log("Starting exercise deduplication process...");

//     // Get all exercises WITH their sets (needed for re-linking)
//     const allExercises = await prisma.exercise.findMany({
//       include: {
//         sets: { select: { id: true } }, // Only need set IDs for linking
//       },
//     });

//     // Group exercises by name (case-insensitive for broader matching? - current is case-sensitive)
//     // Consider normalizing names (e.g., lowercase, trim) before grouping
//     const exercisesByName: Record<string, typeof allExercises> = {};
//     allExercises.forEach((exercise) => {
//       const normalizedName = exercise.name.toLowerCase().trim(); // Example normalization
//       if (!exercisesByName[normalizedName]) {
//         exercisesByName[normalizedName] = [];
//       }
//       exercisesByName[normalizedName].push(exercise);
//     });

//     const stats = {
//       totalExercisesProcessed: allExercises.length,
//       potentialDuplicateGroupsByName: 0,
//       exactSignatureMatchesFound: 0,
//       exercisesMerged: 0,
//       setsReconnected: 0,
//       duplicatesDeleted: 0,
//       errorsEncountered: 0,
//     };

//     // Use a transaction for the core merging logic
//     await prisma.$transaction(async (tx) => {
//       for (const [name, exercises] of Object.entries(exercisesByName)) {
//         if (exercises.length <= 1) {
//           continue; // No potential duplicates for this name
//         }
//         stats.potentialDuplicateGroupsByName++;

//         // Group further by signature (muscles + equipment)
//         const exercisesBySignature: Record<string, typeof exercises> = {};
//         exercises.forEach((exercise) => {
//           const musclesKey = [...exercise.muscles].sort().join(",");
//           const equipmentKey = [...exercise.equipment].sort().join(",");
//           const signature = `${musclesKey}|${equipmentKey}`;

//           if (!exercisesBySignature[signature]) {
//             exercisesBySignature[signature] = [];
//           }
//           exercisesBySignature[signature].push(exercise);
//         });

//         // Process each group with the exact same signature
//         for (const [signature, sameExercises] of Object.entries(exercisesBySignature)) {
//           if (sameExercises.length <= 1) {
//             continue; // No exact duplicates for this signature
//           }
//           stats.exactSignatureMatchesFound++;
//           stats.exercisesMerged += sameExercises.length - 1;

//           // Choose the first as canonical (or based on creation date, etc.)
//           sameExercises.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
//           const [canonical, ...duplicates] = sameExercises;
//           const duplicateIds = duplicates.map(d => d.id);

//           console.log(`Merging ${duplicates.length} duplicates into canonical exercise ${canonical.id} (Name: ${canonical.name}, Sig: ${signature})`);

//           // Find all sets linked ONLY to the duplicates
//           const setsToUpdate = await tx.set.findMany({
//               where: {
//                   exerciseId: { in: duplicateIds }
//               },
//               select: { id: true, exercise: { select: { id: true } } } // Select exercises to check links
//           });

//           for (const set of setsToUpdate) {
//               const linkedDuplicateIds = set.exercise
//               if (linkedDuplicateIds.length > 0) {
//                   // Disconnect from all duplicates, connect to canonical
//                   await tx.set.update({
//                       where: { id: set.id },
//                       data: {
//                           exercises: {
//                               disconnect: linkedDuplicateIds.map(id => ({ id })),
//                               connect: { id: canonical.id }
//                           }
//                       }
//                   });
//                   stats.setsReconnected++;
//               }
//           }
          
//           // Now safe to delete the duplicate exercises
//           const deleteResult = await tx.exercise.deleteMany({
//             where: { id: { in: duplicateIds } },
//           });
//           stats.duplicatesDeleted += deleteResult.count;
//           console.log(`Deleted ${deleteResult.count} duplicate exercises for Name: ${canonical.name}, Sig: ${signature}`);
//         }
//       }
//     }, {
//         maxWait: 15000, // Allow longer for potentially complex transactions
//         timeout: 30000, 
//     }); // End transaction

//     console.log("Exercise deduplication process completed.", stats);
//     return successResponse({
//       message: `Successfully processed exercises for deduplication.`,
//       stats,
//     });

//   } catch (error) {
//     console.error("Error during exercise deduplication:", error);
//     // Log specific Prisma errors if helpful
//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       console.error(`Prisma Error Code: ${error.code}`);
//     }
//     return errorResponse('Internal Server Error during deduplication', 500, { 
//         error: error instanceof Error ? error.message : String(error)
//     });
//   }
// }
