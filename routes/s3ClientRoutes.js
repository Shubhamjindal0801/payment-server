const express = require('express');
const router = express.Router();
const { uploadImg } = require('../controllers/s3uploadController');
const { upload } = require('../utils/s3client'); 

router.post("/upload", upload.single('image'), uploadImg);

module.exports = router;