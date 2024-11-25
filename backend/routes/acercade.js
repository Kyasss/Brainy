const express = require('express');
const path = require('path');
const router = express.Router();


router.get('/acercade', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/acercade/acercade.html'));
});

module.exports = router;
