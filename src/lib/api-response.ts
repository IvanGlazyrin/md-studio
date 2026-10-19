import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Maps a thrown error to a JSON error response: 400 for bad input, 500 otherwise. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: err.issues, message: err.message },
      { status: 400 }
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
