const UserSchema = require("../models/userDetails");
const statusCodes = require("../common/statusCodes");

const authenticateUser = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(statusCodes.UNAUTHORIZED).send({
        status: statusCodes.UNAUTHORIZED,
        message: "Authentication failed: Token not provided",
      });
    }
    const token = authorizationHeader.split(" ")[1];
    if (!token) {
      return res.status(statusCodes.UNAUTHORIZED).send({
        status: statusCodes.UNAUTHORIZED,
        message: "Authentication failed: Token not provided",
      });
    }

    const creatorId = req.headers.creatorid;

    const user = await UserSchema.findOne({ uid: creatorId });
    if (!user) {
      return res.status(statusCodes.UNAUTHORIZED).send({
        status: statusCodes.UNAUTHORIZED,
        message: "Authentication failed: User not found",
      });
    }

    if (user.loginSessionId !== token) {
      return res.status(statusCodes.UNAUTHORIZED).send({
        status: statusCodes.UNAUTHORIZED,
        message: "Authentication failed: User not logged in",
      });
    }

    next();
  } catch (error) {
    return res.status(statusCodes.UNAUTHORIZED).send({
      status: statusCodes.UNAUTHORIZED,
      message: "Authentication failed: Invalid token",
    });
  }
};

module.exports = { authenticateUser };
