export const runtime = "edge";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { gaQuery } from "@/lib/ga/gaApi";

const ALLOWED_TYPES = [
  "daily",
  "pages",
  "sources",
  "events",
  "conversions",
] as const;

type GAType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(v: unknown): v is GAType {
  return typeof v === "string" && ALLOWED_TYPES.includes(v as GAType);
}

function isValidDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isValidIds(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((id) => Number.isInteger(id) || /^\d+$/.test(String(id)))
  );
}

export async function POST(req: Request) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, ids, start, end } = body;

  const invalidReason = {
    missingType: !type,
    invalidType: !isAllowedType(type),
    invalidIds: !isValidIds(ids),
    missingStart: !start,
    missingEnd: !end,
    invalidStart: start && !isValidDate(start),
    invalidEnd: end && !isValidDate(end),
  };

  if (
    !isAllowedType(type) ||
    !isValidIds(ids) ||
    !isValidDate(start) ||
    !isValidDate(end)
  ) {
    return Response.json(
      {
        ok: false,
        message: "Missing or invalid parameters",
        ...(process.env.NODE_ENV !== "production"
          ? { debug: { invalidReason, body } }
          : {}),
      },
      { status: 400 }
    );
  }

  try {
    const data = await gaQuery(user.id, {
      type,
      ids: ids.map(Number),
      start,
      end,
    });

    return Response.json({ ok: true, data });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}