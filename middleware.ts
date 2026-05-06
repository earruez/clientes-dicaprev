import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/dicaprev/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith("/dicaprev/login")) {
        return true;
      }
      return Boolean(token);
    },
  },
});

export const config = {
  matcher: ["/dicaprev/:path*"],
};