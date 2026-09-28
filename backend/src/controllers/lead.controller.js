const { z } = require('zod');
const leadService = require('../services/lead.service');

const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  customerName: z.string().min(1, 'Customer name is required').max(200),
  revenue: z
    .number({ invalid_type_error: 'Revenue must be a number' })
    .positive('Revenue must be greater than 0'),
});

const assignLeadSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

/**
 * POST /api/leads
 */
const createLead = async (req, res, next) => {
  try {
    const validated = createLeadSchema.parse(req.body);
    const lead = await leadService.createLead(validated);
    return res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leads
 */
const getAllLeads = async (req, res, next) => {
  try {
    const leads = await leadService.getAllLeads();
    return res.status(200).json({ success: true, data: leads });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leads/:id
 */
const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await leadService.getLeadById(id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leads/:id/assign
 */
const assignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = assignLeadSchema.parse(req.body);
    const lead = await leadService.assignLead(id, validated.userId);
    return res.status(200).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leads/:id/close
 */
const closeLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await leadService.closeLead(id);

    const statusCode = result.alreadyClosed ? 200 : 200;
    const message = result.alreadyClosed
      ? 'Lead was already closed. Returning existing commission breakdown.'
      : 'Lead closed and commission distributed successfully.';

    return res.status(statusCode).json({
      success: true,
      message,
      data: {
        lead: result.lead,
        commissions: result.commissions,
        alreadyClosed: result.alreadyClosed,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createLead, getAllLeads, getLeadById, assignLead, closeLead };
