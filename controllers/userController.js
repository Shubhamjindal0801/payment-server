const UserSchema = require("../models/userDetails");
const FriendSchema = require("../models/friendList");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { emailCheck } = require("../utils/emailCheck");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const statusCodes = require("../common/statusCodes");
const secretKey = crypto.randomBytes(32).toString("hex");
const schedule = require("node-schedule");

const registerUser = async (req, res) => {
  const isValid = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(15).required(),
  }).validate(req.body);

  if (isValid.error) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Invalid input",
      data: isValid.error,
    });
  }
  const { firstName, lastName, email, password } = req.body;
  const isEmailExist = await emailCheck(email);
  if (isEmailExist === "E") {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Email already exist.",
    });
  }
  const hashPass = await bcrypt.hash(password, 10);
  const userObj = new UserSchema({
    uid: uuidv4(),
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: hashPass,
  });
  try {
    await userObj.save();
    res.status(200).send({
      status: 200,
      message: "User registered successfully.",
    });
  } catch (err) {
    res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Db Error",
      data: err,
    });
  }
};
const signInUser = async (req, res) => {
  const isValid = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(15).required(),
  }).validate(req.body);
  if (isValid.error) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Invalid input",
      data: isValid.error,
    });
  }
  const { email, password } = req.body;
  const user = await UserSchema.findOne({
    email: email,
  });
  if (!user) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "User not found.",
    });
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Invalid password.",
    });
  }
  const payload = {
    email: email,
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
  await UserSchema.findOneAndUpdate({ email: email }, { loginSessionId: token });

  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  schedule.scheduleJob(oneHourFromNow, async () => {
    await UserSchema.findOneAndUpdate(
      { email: email },
      { $unset: { loginSessionId: "" } }
    );
  });
  res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "User logged in successfully.",
    data: {
      token: token,
      creatorId: user.uid,
    },
  });
};
const checkUserLoggedIn = async (req, res) => {
  const creatorId = req.params.id;
  const user = await UserSchema.findOne({ uid: creatorId });
  if (!user) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "User not found.",
    });
  }
  if (!user.loginSessionId) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "User not logged in.",
    });
  }
  res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "User logged in.",
  });
};
const getUserDetails = async (req, res) => {
  const identifier = req.params.identifier;
  let query = {};

  if (identifier.includes("@")) {
    const isValid = Joi.string().email().required().validate(identifier);
    if (isValid.error) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: "Email is not valid.",
      });
    }
    query.email = identifier;
  } else {
    query.uid = identifier;
  }

  const user = await UserSchema.findOne(query);

  if (!user) {
    return res.status(statusCodes.BAD_REQUEST).json({
      status: statusCodes.BAD_REQUEST,
      message: "User not found.",
    });
  }

  const userData = {
    firstName: user.firstName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    uid: user.uid,
    favirouteGroups: user.favirouteGroups,
  };

  res.status(statusCodes.OK).json({
    status: statusCodes.OK,
    message: "User details.",
    data: userData,
  });
};
const addFriend = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;

  if (id === userId) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "You can't add yourself as a friend of yours.",
    });
  }
  const UserData = await UserSchema.findOne({ uid: id });
  if (!UserData) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "User not found.",
    });
  }

  const FriendData = await FriendSchema.findOne({ creatorId: id });
  if (!FriendData) {
    const friendObj = new FriendSchema({
      creatorId: id,
      friends: [{ friendId: userId, streak: 1 }],
    });
    await friendObj.save();
    return res.status(statusCodes.OK).send({
      status: statusCodes.OK,
      message: "Yout first friend added successfully",
    });
  }
  for (let friend of FriendData.friends) {
    if (friend.friendId === userId) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "Friend already added",
      });
    }
  }
  await FriendSchema.findOneAndUpdate(
    { creatorId: id },
    { friends: [...FriendData.friends, { friendId: userId, streak: 1 }] }
  );
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  schedule.scheduleJob(oneHourFromNow, async () => {
    await FriendSchema.findOneAndUpdate(
      { creatorId: id },
      {
        friends: FriendData.friends.map((friend) => {
          if (friend.friendId === userId) {
            return { friendId: userId, streak: friend.streak + 1 };
          }
          return friend;
        }),
      }
    );
  });
  return res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Friend added successfully",
  });
};
const getFriendList = async (req, res) => {
  const id = req.params.id;
  const FriendData = await FriendSchema.findOne({ creatorId: id });
  if (!FriendData) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "No Friends added",
    });
  }
  const FriendList = FriendData.friends;
  let friends = [];
  for (const friend of FriendList) {
    try {
      const UserDetail = await UserSchema.findOne({ uid: friend.friendId });
      friends = [
        ...friends,
        {
          name: UserDetail.firstName + " " + UserDetail.lastName,
          email: UserDetail.email,
          streak: friend.streak,
          uid: UserDetail.uid,
        },
      ];
    } catch (error) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "DB Error",
      });
    }
  }
  return res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Successfully fetched freind list",
    data: friends,
  });
};
const removeFriend = async (req, res) => {
  const id = req.params.id;
  const { friendId } = req.body;

  const FriendData = await FriendSchema.findOne({ creatorId: id });
  if (!FriendData) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Something went wrong",
    });
  }

  const alteredFriendList = FriendData.friends
    ?.map((friend) => {
      if (friend.friendId !== friendId) {
        return friend;
      }
      return null;
    })
    .filter((friend) => friend !== null);

  await FriendSchema.findOneAndUpdate(
    { creatorId: id },
    { friends: alteredFriendList }
  );
  return res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Friend removed successfully",
  });
};

module.exports = {
  registerUser,
  signInUser,
  checkUserLoggedIn,
  getUserDetails,
  addFriend,
  getFriendList,
  removeFriend,
};
