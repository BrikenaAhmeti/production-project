import { z } from "zod";
import { getImage } from "@/lib/server/studio";
import { respondToError } from "@/lib/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new Response(null, { status: 404 });
  try {
    const data = await getImage(id.data);
    if (!data) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    return respondToError(error);
  }
}
