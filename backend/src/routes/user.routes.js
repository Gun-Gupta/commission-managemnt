const { Router } = require('express');
const { createUser, getAllUsers } = require('../controllers/user.controller');

const router = Router();

router.get('/', getAllUsers);
router.post('/', createUser);

module.exports = router;
