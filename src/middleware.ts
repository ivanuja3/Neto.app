import { NextRequest, NextResponse } from "next/server";

// Middleware mínimo — la protección real la hace AuthGuard (client-side)
// porque Supabase almacena el token en localStorage, no en cookies
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: [] };
