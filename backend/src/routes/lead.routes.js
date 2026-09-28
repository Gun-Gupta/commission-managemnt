const { Router } = require('express');
const {
  createLead,
  getAllLeads,
  getLeadById,
  assignLead,
  closeLead,
} = require('../controllers/lead.controller');

const router = Router();

router.get('/', getAllLeads);
router.post('/', createLead);
router.get('/:id', getLeadById);
router.post('/:id/assign', assignLead);
router.post('/:id/close', closeLead);

module.exports = router;
