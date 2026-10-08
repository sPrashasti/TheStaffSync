const mongoose = require('mongoose');
const { isValidTimeZone } = require('../utils/dates');

const ORGANISATION_STATUSES = ['active', 'suspended'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// A customer company (tenant). Platform-level: not organisation-scoped itself. Everything an
// organisation owns (users, employees, attendance…) points here through organisationId.
const organisationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organisation name is required'],
      trim: true,
      minlength: [2, 'Organisation name must be at least 2 characters'],
      maxlength: [100, 'Organisation name cannot exceed 100 characters'],
    },
    // URL-safe, unique identifier derived from the name, for future subdomains and platform tools.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only lowercase letters, digits and hyphens'],
    },
    // Suspended organisations keep their data, but none of their users can sign in or use the API.
    // Only a platform admin changes this (Phase 21).
    status: {
      type: String,
      enum: { values: ORGANISATION_STATUSES, message: 'Status must be one of: active, suspended' },
      default: 'active',
    },
    // Company-wide defaults that used to come from .env.
    settings: {
      timeZone: {
        type: String,
        default: 'Asia/Kolkata',
        validate: { validator: isValidTimeZone, message: 'Time zone must be a valid IANA name, e.g. Asia/Kolkata' },
      },
      workingDays: {
        type: [{ type: String, enum: { values: DAY_NAMES, message: 'Working days must be Mon to Sun' } }],
        default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        validate: {
          validator: (days) => days.length > 0 && new Set(days).size === days.length,
          message: 'Working days must list at least one day, each once',
        },
      },
    },
    // Public demo (Phase 20). Platform-level: set only by `npm run demo:setup`, never through the
    // API. Visitors sign in as these accounts without a password, and everything they change is
    // put back to the baseline every night (services/demoService.js).
    demo: {
      enabled: { type: Boolean, default: false },
      accounts: {
        hr: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      baselineAt: Date,
      lastResetAt: Date,
    },
  },
  { timestamps: true }
);

// A unique slug for a name, e.g. "DemoTech Solutions" → demotech-solutions, demotech-solutions-2…
organisationSchema.statics.uniqueSlug = async function uniqueSlug(name) {
  const base = String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'organisation';
  let slug = base;
  for (let n = 2; await this.exists({ slug }); n += 1) slug = `${base}-${n}`;
  return slug;
};

module.exports = mongoose.model('Organisation', organisationSchema);
module.exports.ORGANISATION_STATUSES = ORGANISATION_STATUSES;
module.exports.DAY_NAMES = DAY_NAMES;
