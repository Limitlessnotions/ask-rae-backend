export function getXConfig() {
  return {
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    redirectUri: process.env.X_REDIRECT_URI,

    authorizationUrl: "https://twitter.com/i/oauth2/authorize",

    tokenUrl: "https://api.twitter.com/2/oauth2/token",

    scopes: [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access"
    ].join(" "),
  };
}