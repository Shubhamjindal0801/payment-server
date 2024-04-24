const Mongoose = require("mongoose");
const Schema = Mongoose.Schema;

const Gropus = new Schema({
  groupName: {
    type: String,
    require: true,
  },
  description: {
    type: String,
    require: false,
  },
  gid: {
    type: String,
    require: true,
  },
  members: {
    type: Array,
    require: true,
  },
  groupImage: {
    type: String,
    require: false,
  },
  dateOfCreation: {
    type: Date,
    default: Date.now,
    require: true,
  },
  host: {
    type: String,
    require: true,
  },
});

module.exports = Mongoose.model("groups", Gropus);
