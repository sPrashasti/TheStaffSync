// Makes a model organisation-owned: every document carries an organisationId, and every query,
// update, delete and aggregation is limited to the organisation of the current request.
//
// Isolation therefore does not depend on each controller remembering a filter. A query that runs
// with no organisation context THROWS, instead of silently returning every company's data. Code
// that genuinely works across organisations must say so with runAsPlatform().
const mongoose = require('mongoose');
const { currentStore } = require('../../utils/tenantContext');

const QUERY_OPS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
];

// Collections that are platform-level and must not be filtered when joined.
const PLATFORM_COLLECTIONS = new Set(['organisations', 'platformadmins']);

class TenantContextError extends Error {}

// The organisation to scope to, or null for platform-level code.
const scopeFor = (what) => {
  const store = currentStore();
  if (store?.allTenants) return null;
  if (store?.organisationId) return store.organisationId;
  throw new TenantContextError(
    `${what} ran without an organisation context. Use it inside a signed-in request, or wrap platform-level code in runAsPlatform().`
  );
};

// Joined documents must come from the same organisation too, including joins nested inside
// other joins or $facet branches. Stages that read another collection without $lookup are refused,
// so a new one can't slip past isolation unnoticed.
const scopeJoins = (pipeline, organisationId) => {
  pipeline.forEach((stage) => {
    if (stage.$lookup && !PLATFORM_COLLECTIONS.has(stage.$lookup.from)) {
      const inner = stage.$lookup.pipeline || [];
      scopeJoins(inner, organisationId);
      stage.$lookup.pipeline = [{ $match: { organisationId } }, ...inner];
    }
    if (stage.$facet) Object.values(stage.$facet).forEach((branch) => scopeJoins(branch, organisationId));
    ['$unionWith', '$graphLookup', '$out', '$merge'].forEach((op) => {
      if (stage[op]) throw new TenantContextError(`${op} is not supported on organisation-owned models`);
    });
  });
};

function tenantScoped(schema) {
  schema.add({
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: [true, 'Organisation is required'],
      // Once set, a record can never be moved to another organisation through the app.
      immutable: true,
    },
  });

  schema.pre(QUERY_OPS, function scopeQuery() {
    const organisationId = scopeFor(`${this.model.modelName}.${this.op}`);
    if (!organisationId) return;
    const asked = this.getFilter().organisationId;
    if (asked && String(asked) !== String(organisationId)) {
      throw new TenantContextError(`${this.model.modelName}.${this.op} asked for another organisation`);
    }
    this.where({ organisationId });
  });

  schema.pre('aggregate', function scopeAggregate() {
    const organisationId = scopeFor(`${this._model.modelName}.aggregate`);
    if (!organisationId) return;
    const pipeline = this.pipeline();
    scopeJoins(pipeline, organisationId);
    pipeline.unshift({ $match: { organisationId } });
  });

  // New documents (create, save, insertMany) are stamped with the current organisation, and can
  // never be written into a different one.
  schema.pre('validate', function stampOrganisation() {
    const store = currentStore();
    if (!store?.organisationId) return; // platform code must set organisationId itself
    if (!this.organisationId) {
      this.organisationId = store.organisationId;
    } else if (String(this.organisationId) !== String(store.organisationId)) {
      throw new TenantContextError(`Cannot write a ${this.constructor.modelName} into another organisation`);
    }
  });
}

module.exports = tenantScoped;
module.exports.TenantContextError = TenantContextError;
