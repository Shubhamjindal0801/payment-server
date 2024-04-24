const Mongoose = require("mongoose");
const Schema = Mongoose.Schema;

const friendList = new Schema({
  creatorId: {
    type: String,
    required: true,
  },
  friends: {
    type: Array,
    required: true,
  },
});

module.exports = Mongoose.model("friends", friendList);
