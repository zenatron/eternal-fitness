import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { templateId } = await params;

    // Fetch the template to check if it exists and belongs to the user
    const template = await prisma.workoutTemplate.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    if (template.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  } catch (error) {
    console.error("Error in POST /api/template/[templateId]/complete:", error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
