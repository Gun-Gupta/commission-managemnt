const prisma = require('../lib/prisma');
const { createError } = require('../utils/createError');

/**
 * Detects circular manager relationships by walking up the hierarchy.
 * @param {string} userId - The user being assigned the manager
 * @param {string} managerId - The prospective manager
 * @returns {boolean} true if circular relationship would be created
 */
async function wouldCreateCircle(userId, managerId) {
  let currentId = managerId;
  const visited = new Set();

  while (currentId) {
    if (currentId === userId) return true;
    if (visited.has(currentId)) return true; // already-existing cycle
    visited.add(currentId);

    const manager = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });

    if (!manager) break;
    currentId = manager.managerId;
  }

  return false;
}

/**
 * Create a new user.
 */
async function createUser(data) {
  const { name, email, role, managerId } = data;

  // Check if email is unique
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw createError('A user with this email already exists.', 409);
  }

  // Validate manager if provided
  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      throw createError('Manager not found.', 404);
    }

    // Prevent circular hierarchy
    const circular = await wouldCreateCircle(null, managerId); // new user won't have an id yet, skip self-check
    // Additional check: managerId cannot reference itself
    if (managerId === data.id) {
      throw createError('A user cannot be their own manager.', 400);
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      managerId: managerId || null,
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return user;
}

/**
 * Get all users with their manager info.
 */
async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      createdAt: true,
      manager: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return users;
}

module.exports = {
  createUser,
  getAllUsers,
};
