const Mongoose = require("mongoose");
require("dotenv").config();

Mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDb Connected successfully!");
  })
  .catch((err) => {
    console.error(err);
  });
