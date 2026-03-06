import { NextResponse } from "next/server";

export function json(data, init) {
  return NextResponse.json(data, init);
}

export function badRequest(message, details) {
  return json(
    {
      error: message,
      details,
    },
    { status: 400 }
  );
}

export function notFound(message = "Data tidak ditemukan.") {
  return json({ error: message }, { status: 404 });
}

export function serverError(message, details) {
  return json(
    {
      error: message,
      details,
    },
    { status: 500 }
  );
}

export function parseInteger(value, fallback) {
  if (value == null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
