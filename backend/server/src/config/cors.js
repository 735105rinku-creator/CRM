export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:4200",
  "http://127.0.0.1:4200",
  "https://opasbizz.co.in",
  "https://www.opasbizz.co.in",
  "https://opasbizz.in",
  "https://www.opasbizz.in",
];

const ALLOWED_DOMAIN_SUFFIXES = [
  "opasbizz.co.in",
  "opasbizz.in",
];

export const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/+$/, "");

export const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

export const allowedOrigins = (env = {}) =>
  Array.from(
    new Set(
      [
        ...DEFAULT_ALLOWED_ORIGINS,
        env.CLIENT_ORIGIN,
        ...parseOrigins(env.CLIENT_ORIGINS || process.env.CLIENT_ORIGINS),
      ]
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)
    )
  );

const isLocalhostOrigin = (url) =>
  ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

const isAllowedDomainOrigin = (url) =>
  ["http:", "https:"].includes(url.protocol) &&
  ALLOWED_DOMAIN_SUFFIXES.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  );

export const isOriginAllowed = (origin, env = {}) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedOrigins(env).includes(normalizedOrigin)) {
    return true;
  }

  try {
    const url = new URL(normalizedOrigin);

    if (isAllowedDomainOrigin(url)) {
      return true;
    }

    if (env.NODE_ENV !== "production" && isLocalhostOrigin(url)) {
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
};

export const corsOptions = (env = {}) => ({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, env)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
});