import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag } = body;

    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // 캐시 무효화
    revalidateTag(tag);

    return NextResponse.json({
      success: true,
      revalidated: tag,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to revalidate" },
      { status: 500 }
    );
  }
}
