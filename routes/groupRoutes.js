const express = require("express");
const {
  createNewGroup,
  getGroupList,
  editGroup,
  getGroupDetails,
} = require("../controllers/groupController");
const { authenticateUser } = require("../middleware/isAuth");
const route = express();

route.post("/create-group/:id", authenticateUser, createNewGroup);
route.get("/get-list/:id", authenticateUser, getGroupList);
route.post("/edit-group", authenticateUser, editGroup);
route.get("/get-group-details/:gid", authenticateUser, getGroupDetails);

module.exports = route;
