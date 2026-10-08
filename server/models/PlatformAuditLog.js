const mongoose = require('mongoose');

const PLATFORM_ACTIONS = [
  'organisation.update',
  'organisation.suspend',
  'organisation.reactivate',
  'admin.password',
];

// Every change a platform admin makes, so operator actions on customers' organisations are
// always accountable. Platform-level (not organisation-scoped) and append-only: no API edits or
// deletes entries.
const platformAuditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', required: true },
    // Copied, so the log stays readable even if the admin account is renamed or removed.
    adminEmail: { type: String, required: true },
    action: { type: String, enum: PLATFORM_ACTIONS, required: true },
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null },
    organisationName: { type: String, default: null },
    // What changed, e.g. { from: 'Old name', to: 'New name' } or { reason: '…' }.
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

platformAuditLogSchema.index({ createdAt: -1 });
platformAuditLogSchema.index({ organisationId: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformAuditLog', platformAuditLogSchema);
module.exports.PLATFORM_ACTIONS = PLATFORM_ACTIONS;
