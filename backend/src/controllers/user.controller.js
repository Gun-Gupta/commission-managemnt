const { z } = require('zod');
const userService = require('../services/user.service');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['AGENT', 'MANAGER'], { message: 'Role must be AGENT or MANAGER' }),
  managerId: z.string().uuid('managerId must be a valid UUID').optional().nullable(),
});

/**
 * POST /api/users
 */
const createUser = async (req, res, next) => {
  try {
    const validated = createUserSchema.parse(req.body);
    const user = await userService.createUser(validated);
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, getAllUsers };
