const Employee = require('../models/Employee');
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
  // managerId lets the app decide whom a manager may remove.
  select: 'employeeId department designation managerId userId',
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

// A manager's direct reports (ids), or null for other roles. Decides whom they may assign and
// which participants they may see on trainings they did not create.
const teamIdsFor = async (req) =>
  (req.user.role === 'manager' ? Employee.find({ managerId: req.employee._id }).distinct('_id') : null);

// What a caller sees: seat counts, their own enrolment and the status for everyone. The
// participant list goes to HR and the creator in full, to other managers only for their own
// team, and to employees not at all.
const present = (req, training, today = companyToday(), teamIds = null) => {
  const ids = training.participants.map((p) => p._id || p);
  const data = training.toJSON();
  if (!canManage(req, training)) {
    if (teamIds) data.participants = data.participants.filter((p) => teamIds.some((id) => id.equals(p._id || p)));
    else delete data.participants;
  }
  return {
    ...data,
    status: statusOf(training, today),
    enrolledCount: ids.length,
    seatsLeft: Math.max(0, training.capacity - ids.length),
    isEnrolled: ids.some((id) => id.equals(req.employee._id)),
    // Enrolment and withdrawal stay open until the end of the start day.
    enrolmentOpen: dateToDateString(training.startDate) >= today,
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
  const [items, total, teamIds] = await Promise.all([
    Training.find(filter)
      .sort({ startDate: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(withCreator)
      .populate(withParticipants),
    Training.countDocuments(filter),
    teamIdsFor(req),
  ]);
  sendSuccess(res, {
    message: 'Trainings',
    data: buildPage(items.map((t) => present(req, t, today, teamIds)), total, pagination),
  });
};

// GET /api/trainings/:id — any role.
const getTraining = async (req, res) => {
  const training = await loadTraining(req.params.id);
  await training.populate([withCreator, withParticipants]);
  sendSuccess(res, { message: 'Training', data: present(req, training, companyToday(), await teamIdsFor(req)) });
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

// Explains why a conditional enrol/withdraw update matched nothing. `who` names the person:
// "You" for self-service, their name when someone else assigned them.
const enrolmentConflict = async (id, employeeId, enrolling, who = 'You') => {
  const training = await loadTraining(id);
  const enrolled = training.participants.some((p) => p.equals(employeeId));
  const verb = who === 'You' ? 'are' : 'is';
  if (enrolling && enrolled) return new AppError(`${who} ${verb} already enrolled in this training`, 409);
  if (!enrolling && !enrolled) return new AppError(`${who} ${verb} not enrolled in this training`, 409);
  if (dateToDateString(training.startDate) < companyToday()) {
    return new AppError('Enrolment has closed because this training has started', 409);
  }
  return new AppError('This training is full', 409);
};

// Adds one person to a training in a single atomic update, so simultaneous requests can never
// overfill it or enrol someone twice. Returns the updated training, or null if a rule failed.
const addParticipant = (trainingId, employeeId) => Training.findOneAndUpdate(
  {
    _id: trainingId,
    startDate: { $gte: dateStringToDate(companyToday()) },
    participants: { $ne: employeeId },
    $expr: { $lt: [{ $size: '$participants' }, '$capacity'] },
  },
  { $push: { participants: employeeId } },
  { returnDocument: 'after' }
);

// Removes one person, only before the training starts.
const removeParticipant = (trainingId, employeeId) => Training.findOneAndUpdate(
  { _id: trainingId, startDate: { $gte: dateStringToDate(companyToday()) }, participants: employeeId },
  { $pull: { participants: employeeId } },
  { returnDocument: 'after' }
);

const respondWith = async (req, res, message, training) => {
  await training.populate([withCreator, withParticipants]);
  sendSuccess(res, { message, data: present(req, training, companyToday(), await teamIdsFor(req)) });
};

// POST /api/trainings/:id/enroll — employee, manager. Enrol yourself.
const enroll = async (req, res) => {
  const updated = await addParticipant(req.params.id, req.employee._id);
  if (!updated) throw await enrolmentConflict(req.params.id, req.employee._id, true);
  return respondWith(req, res, 'Enrolled', updated);
};

// DELETE /api/trainings/:id/enroll — employee, manager. Withdraw before the training starts.
const withdraw = async (req, res) => {
  const updated = await removeParticipant(req.params.id, req.employee._id);
  if (!updated) throw await enrolmentConflict(req.params.id, req.employee._id, false);
  return respondWith(req, res, 'Withdrawn', updated);
};

// The employee an HR user or manager wants to assign. HR may pick any active employee; a manager
// only their direct reports. Returns the Employee with its user populated.
const loadAssignable = async (req, employeeId) => {
  const employee = await Employee.findById(employeeId).populate('userId', 'name isActive');
  if (!employee || !employee.userId) throw new AppError('Employee not found', 404);
  if (req.user.role === 'manager' && !(employee.managerId && employee.managerId.equals(req.employee._id))) {
    throw new AppError('That employee is not in your team', 403);
  }
  if (!employee.userId.isActive) throw new AppError('This employee is deactivated', 400);
  return employee;
};

// POST /api/trainings/:id/participants { employeeId } — hr, manager. Assign someone to a training.
const assignParticipant = async (req, res) => {
  const employee = await loadAssignable(req, req.body.employeeId);
  const updated = await addParticipant(req.params.id, employee._id);
  if (!updated) throw await enrolmentConflict(req.params.id, employee._id, true, employee.userId.name);
  await notifications.trainingAssigned({ training: updated, employee, byName: req.user.name });
  return respondWith(req, res, `${employee.userId.name} enrolled`, updated);
};

// DELETE /api/trainings/:id/participants/:employeeId — hr, manager. Remove someone before it starts.
const unassignParticipant = async (req, res) => {
  const employee = await loadAssignable(req, req.params.employeeId);
  const updated = await removeParticipant(req.params.id, employee._id);
  if (!updated) throw await enrolmentConflict(req.params.id, employee._id, false, employee.userId.name);
  await notifications.trainingUnassigned({ training: updated, employee, byName: req.user.name });
  return respondWith(req, res, `${employee.userId.name} removed`, updated);
};

module.exports = {
  listTrainings,
  getTraining,
  createTraining,
  updateTraining,
  deleteTraining,
  enroll,
  withdraw,
  assignParticipant,
  unassignParticipant,
  statusOf,
};
