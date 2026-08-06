const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../../middleware/auth');

/* Authentification : seule partie publique de l'espace d'administration. */
router.use('/', require('./auth'));

/* Tout le reste exige un jeton administrateur valide. */
router.use(requireAdmin);
router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/', require('./misc'));

module.exports = router;
