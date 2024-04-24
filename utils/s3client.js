const AWS = require('aws-sdk');
const express = require('express');
const multer = require('multer');
const router = express.Router();
require("dotenv").config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const uploadToS3 = (file) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `lenden/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
  };
  return s3.upload(params).promise();
};

module.exports = { uploadToS3, upload };