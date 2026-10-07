// Only origins listed in CLIENT_URL may call the API from a browser. When this server also serves
// the frontend, its own public address (APP_URL, or RENDER_EXTERNAL_URL which Render sets
// automatically) is allowed too.
const allowedOrigins = [...new Set(
  [process.env.CLIENT_URL, process.env.APP_URL, process.env.RENDER_EXTERNAL_URL]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
)];

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (Postman, curl, server-to-server)
    // are not subject to browser CORS rules.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error(`Origin ${origin} is not allowed by CORS`);
    error.statusCode = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = { corsOptions, allowedOrigins };
