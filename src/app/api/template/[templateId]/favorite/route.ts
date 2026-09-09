import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { templateId } = await params;

    const updatedTemplate = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ favorite: workoutTemplates.favorite })
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

      if (!current) throw new Error('TemplateNotFound');

      const [result] = await tx
        .update(workoutTemplates)
        .set({ favorite: !current.favorite })
        .where(eq(workoutTemplates.id, templateId))
        .returning();

      return result;
    });

    return successResponse(updatedTemplate);
  } catch (error: any) {
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }
    return errorResponse('Internal Server Error toggling favorite', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}
