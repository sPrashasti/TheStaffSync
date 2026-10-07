const express = require('express');
const {
  listTrainings,
  getTraining,
  createTraining,
  updateTraining,
  deleteTraining,
  enroll,
  withdraw,
  assignParticipant,
  unassignParticipant,
} = require('../controllers/trainingController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate, validateObjectId } = require('../middleware/validate');
const {
  createTrainingRules,
  updateTrainingRules,
  noBodyRules,
  listTrainingRules,
  assignParticipantRules,
} = require('../validators/trainingValidators');

const router = express.Router();

router.use(protect, loadEmployee);

router.get('/', listTrainingRules, validate, listTrainings);
router.get('/:id', validateObjectId(), getTraining);
router.post('/', authorize('hr', 'manager'), createTrainingRules, validate, createTraining);
// Managers may only change their own trainings; checked in the controller.
router.put('/:id', authorize('hr', 'manager'), validateObjectId(), updateTrainingRules, validate, updateTraining);
router.delete('/:id', authorize('hr', 'manager'), validateObjectId(), deleteTraining);

router.post('/:id/enroll', authorize('employee', 'manager'), validateObjectId(), noBodyRules, validate, enroll);
router.delete('/:id/enroll', authorize('employee', 'manager'), validateObjectId(), withdraw);

// HR assigns anyone; a manager assigns only their direct reports (checked in the controller).
router.post('/:id/participants', authorize('hr', 'manager'), validateObjectId(), assignParticipantRules, validate, assignParticipant);
router.delete('/:id/participants/:employeeId', authorize('hr', 'manager'), validateObjectId(), validateObjectId('employeeId'), unassignParticipant);

module.exports = router;
