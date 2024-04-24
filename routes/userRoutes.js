const express = require("express");
const router = express();
const {
  registerUser,
  signInUser,
  checkUserLoggedIn,
  getUserDetails,
  addFriend,
  getFriendList,
  removeFriend,
} = require("../controllers/userController");
const { authenticateUser } = require("../middleware/isAuth");

router.post("/signup", registerUser);
router.post("/login", signInUser);
router.get("/logged/:id", checkUserLoggedIn);
router.get("/get-user-detail/:identifier", authenticateUser, getUserDetails);
router.post("/add-friend/:id", authenticateUser, addFriend);
router.post("/remove-friend/:id", authenticateUser, removeFriend);
router.get("/get-friend-list/:id", authenticateUser, getFriendList);

module.exports = router;
