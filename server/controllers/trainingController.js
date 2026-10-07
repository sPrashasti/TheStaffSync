const Training = require('../models/Training');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const { toDateString, getTimeZone, dateStringToDate, dateToDateString } = require('../utils/dates');
const notifications = require('../services/notificationService');

const EDITABLE_FIELDS = ['title', 'description', 'trainer', 'startDate', 'endDate', 'capacity'];
const DATE_FIELDS = ['startDate', 'endDate'];
// Changes participants are told about.
const NOTIFY_FIELDS = ['title', 'trainer', 'startDate', 'endDate'];

const withCreator = { path: 'createdBy', select: 'name email role' };
const withParticipants = {
  path: 'participants',
  select: 'employeeId department designation userId',
  populate: { path: 'userId', select: 'name email' },
};

// Trainings are company events, so "today" is the company default time zone.
const companyToday = () => toDateString(new Date(), getTimeZone());

const statusOf = (training, today) => {
  if (dateToDateString(training.endDate) < today) return 'completed';
  if (dateToDateString(training.startDate) > today) return 'upcoming';
  return 'ongoing';
};

// HR may manage any training; a manager only the ones they created.
const canManage = (req, training) =>
  req.user.role === 'hr' || (req.user.role === 'manager' && training.createdBy && (training.createdBy._id || training.createdBy).equals(req.user._id));

// What a caller sees: seat counts, their own enrolment and the status for everyone; the
// participant list only for people who can manage the training.
const present = (req, training, today = companyToday()) => {
  const ids = training.participants.map((p) => p._id || p);
  const data = training.toJSON();
  if (!canManage(req, training)) delete data.participants;
  return {
    ...data,
    status: statusOf(training, today),
    enrolledCount: ids.length,
    seatsLeft: Math.max(0, training.capacity - ids.length),
    isEnrolled: ids.some((id) => id.equals(req.employee._id)),
  };
};

const loadTraining = async (id) => {
  const training = await Training.findById(id);
  if (!training) throw new AppError('Training not found', 404);
  return training;
};

const assertCanManage = (req, training) => {
  if (!canManage(req, training)) {
    throw new AppError('You can only change trainings you created', 403);
  }
};

// GET /api/trainings — any role. ?status=upcoming|ongoing|completed, ?enrolled=true (mine). Soonest first.
const listTrainings = async (req, res) => {
  const today = companyToday();
  const todayDate = dateStringToDate(today);
  const filter = {};
  if (req.query.status === 'upcoming') filter.startDate = { $gt: todayDate };
  if (req.query.status === 'ongoing') Object.assign(filter, { startDate: { $lte: todayDate }, endDate: { $gte: todayDate } });
  if (req.query.status === 'completed') filter.endDate = { $lt: todayDate };
  if (req.query.enrolled === 'true') filter.participants = req.employee._id;

  const pagination = getPagination(req.query);
  const [items, total] = await Promise.all([
    Training.find(filter)
      .sort({ startDate: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(withCreator)
      .populate(withParticipants),
    Training.countDocuments(filter),
  ]);
  sendSuccess(res, {
    message: 'Trainings',
    data: buildPage(items.map((t) => present(req, t, today)), total, pagination),
  });
};

// GET /api/trainings/:id — any role.
const getTraining = async (req, res) => {
  const training = await loadTraining(req.params.id);
  await training.populate([withCreator, withParticipants]);
  sendSuccess(res, { message: 'Training', data: present(req, training) });
};

// POST /api/trainings — hr, manager.
const createTraining = async (req, res) => {
  const { title, description, trainer, startDate, endDate, capacity } = req.body;
  if (startDate < companyToday()) {
    throw new AppError('Validation failed', 400, [{ field: 'startDate', message: 'Start date cannot be in the past' }]);
  }
  const training = await Training.create({
    title,
    description,
    trainer,
    startDate: dateStringToDate(startDate),
    endDate: dateStringToDate(endDate),
    capacity,
    createdBy: req.user._id,
  });
  await training.populate(withCreator);
  sendCreated(res, { message: 'Training created', data: present(req, training) });
};

// PUT /api/trainings/:id — hr, or the manager who created it.
const updateTraining = async (req, res) => {
  const training = await loadTraining(req.params.id);
  assertCanManage(req, training);

  const today = companyToday();
  if (statusOf(training, today) === 'completed') {
    throw new AppError('Completed trainings cannot be changed', 409);
  }

  const changes = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (field in req.body) changes[field] = DATE_FIELDS.includes(field) ? dateStringToDate(req.body[field]) : req.body[field];
  });

  const start = req.body.startDate || dateToDateString(training.startDate);
  const end = req.body.endDate || dateToDateString(training.endDate);
  if (end < start) {
    throw new AppError('Validation failed', 400, [{ field: 'endDate', message: 'End date cannot be before start date' }]);
  }
  if (req.body.startDate && req.body.startDate < today) {
    throw new AppError('Validation failed', 400, [{ field: 'startDate', message: 'Start date cannot be in the past' }]);
  }

  // A capacity below the current enrolment is refused in the same atomic update, so a
  // simultaneous enrolment cannot slip past it.
  const filter = { _id: training._id };
  if ('capacity' in changes) filter.$expr = { $lte: [{ $size: '$participants' }, changes.capacity] };
  const updated = await Training.findOneAndUpdate(filter, { $set: changes }, { returnDocument: 'after', runValidators: true });
  if (!updated) {
    const enrolled = (await Training.findById(training._id).select('participants')).participants.length;
    throw new AppError(`Capacity cannot be less than the ${enrolled} people already enrolled`, 409);
  }
  if (NOTIFY_FIELDS.some((field) => field in req.body)) await notifications.trainingChanged(updated);

  await updated.populate([withCreator, withParticipants]);
  sendSuccess(res, { message: 'Training updated', data: present(req, updated, today) });
};

// DELETE /api/trainings/:id — hr, or the manager who created it. Only before it starts, so
// past training records are kept.
const deleteTraining = async (req, res) => {
  const training = await loadTraining(req.params.id);
  assertCanManage(req, training);
  if (statusOf(training, companyToday()) !== 'upcoming') {
    throw new AppError('Trainings that have started cannot be deleted', 409);
  }
  await training.deleteOne();
  await notifications.trainingCancelled(training);
  sendSuccess(res, { message: 'Training deleted', data: { _id: training._id } });
};

// Explains why a conditional enrol/withdraw update matched nothing.
const enrolmentConflict = async (id, employeeId, enrolling) => {
  const training = await loadTraining(id);
  const enrolled = training.participants.some((p) => p.equals(employeeId));
  if (enrolling && enrolled) return new AppError('You are already enrolled in this training', 409);
  if (!enrolling && !enrolled) return new AppError('You are not enrolled in this training', 409);
  if (dateToDateString(training.startDate) < companyToday()) {
    return new AppError('Enrolment has closed because this training has started', 409);
  }
  return new AppError('This training is full', 409);
};

// POST /api/trainings/:id/enroll — employee, manager. One atomic update checks every rule, so
// simultaneous requests can never overfill a training or enrol someone twice.
const enroll = async (req, res) => {
  const employeeId = req.employee._id;
  const updated = await Training.findOneAndUpdate(
    {
      _id: req.params.id,
      startDate: { $gte: dateStringToDate(companyToday()) },
      participants: { $ne: employeeId },
      $expr: { $lt: [{ $size: '$participants' }, '$capacity'] },
    },
    { $push: { participants: employeeId } },
    { returnDocument: 'after' }
  );
  if (!updated) throw await enrolmentConflict(req.params.id, employeeId, true);

  await updated.populate([withCreator, withParticipants]);
  sendSuccess(res, { message: 'Enrolled', data: present(req, updated) });
};

// DELETE /api/trainings/:id/enroll — employee, manager. Withdraw before the training starts.
const withdraw = async (req, res) => {
  const employeeId = req.employee._id;
  const updated = await Training.findOneAndUpdate(
    { _id: req.params.id, startDate: { $gte: dateStringToDate(companyToday()) }, participants: employeeId },
    { $pull: { participants: employeeId } },
    { returnDocument: 'after' }
  );
  if (!updated) throw await enrolmentConflict(req.params.id, employeeId, false);

  await updated.populate([withCreator, withParticipants]);
  sendSuccess(res, { message: 'Withdrawn', data: present(req, updated) });
};

module.exports = {
  listTrainings,
  getTraining,
  createTraining,
  updateTraining,
  deleteTraining,
  enroll,
  withdraw,
  statusOf,
};
