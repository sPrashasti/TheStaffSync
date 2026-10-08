const mongoose = require('mongoose');

// Sequence numbers for human-readable IDs such as EMP0001, one sequence per organisation.
// Platform-level (keyed by organisation in _id), so not tenant-scoped.
// $inc is atomic, so two employees created at the same moment never get the same number.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

counterSchema.statics.next = async function next(name) {
  const counter = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter.seq;
};

// The key of an organisation's employee number sequence.
counterSchema.statics.employeeIdKey = (organisationId) => `${organisationId}:employeeId`;

module.exports = mongoose.model('Counter', counterSchema);
