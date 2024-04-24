const {uploadToS3} = require('../utils/s3client');

const uploadImg = async (req, res) => {
  try {
    const result = await uploadToS3(req.file);
    res.status(200).send({ url: result.Location });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = { uploadImg }