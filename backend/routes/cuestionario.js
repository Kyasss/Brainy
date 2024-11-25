const express = require('express');
const path = require('path');
const router = express.Router();


router.get('/cuestionario', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/cuestionario/cuestionario.html'));
});

module.exports = router;
