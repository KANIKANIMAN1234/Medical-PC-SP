import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // 公開ルート
  const publicPaths = ['/', '/callback', '/invite'];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));

  // 未認証 → ログインページへ
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // /admin ルートは is_superadmin が必要（JWTカスタムクレームで確認）
  if (pathname.startsWith('/admin')) {
    const isSuperAdmin = session?.user?.user_metadata?.is_superadmin === true;
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png).*)'],
};
