const Mongoose = require("mongoose");
const Schema = Mongoose.Schema;

const newEntry = new Schema({
  gid: {
    type: String,
    required: true,
  },
  paidBy: {
    type: Array,
    required: true,
  },
  txnMap: {
    type: Schema.Types.Mixed,
    required: true,
  },
});

module.exports = Mongoose.model("transactions", newEntry);
