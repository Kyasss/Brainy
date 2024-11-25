const express = require('express');
const path = require('path');
const router = express.Router();


router.get('/resumen', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/resumen/resumen.html'));
});

module.exports = router;
