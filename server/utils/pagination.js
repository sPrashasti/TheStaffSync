const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Reads ?page=&limit= safely: missing, negative or non-numeric values fall back to defaults,
// and limit is capped so a client cannot ask for the whole collection in one request.
const getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

// The list shape every paginated endpoint returns inside `data`.
const buildPage = (items, total, { page, limit }) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

module.exports = { getPagination, buildPage, DEFAULT_LIMIT, MAX_LIMIT };
