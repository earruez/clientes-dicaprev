import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith("/login")) return true;
      return Boolean(token);
    },
  },
});

export const config = {
  matcher: ["/", "/login", "/dicaprev/:path*", "/api/auth/:path*"],
};
