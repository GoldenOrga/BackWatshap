import * as Sentry from "@sentry/node";

export function sentryUserContext(req, _res, next) {
  const user = req.user;

  if (user) {
    Sentry.setUser({
      id: user.id?.toString(),
      email: user.email,
      name: user.name,
    });
  } else {
    Sentry.setUser(null);
  }

  next();
}
