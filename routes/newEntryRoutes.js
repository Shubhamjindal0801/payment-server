const express = require("express");
const router = express();
const {
  makeNewEntry,
  getTotalCount,
  getAllTransactionList,
} = require("../controllers/entryController");
const { authenticateUser } = require("../middleware/isAuth");

router.post("/new-payment", authenticateUser, makeNewEntry);
router.post("/get-count/:id", authenticateUser, getTotalCount);
router.get(
  "/get-transaction-list/:gId",
  authenticateUser,
  getAllTransactionList
);

module.exports = router;
