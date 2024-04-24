const Joi = require("joi");
const statusCodes = require("../common/statusCodes");
const GroupSchema = require("../models/groups");
const UserSchema = require("../models/userDetails");
const TransactionSchema = require("../models/newEntry");
const { getUniqueGroupId } = require("../utils/getUniqueGroupId");
const groupEditType = require("../common/groupEditType");

const createNewGroup = async (req, res) => {
  const id = req.params.id;
  const isEdit = req.body.isEdit;
  if (!isEdit) {
    const isValid = Joi.object({
      groupName: Joi.string().required(),
      description: Joi.string().optional(),
      members: Joi.array().required(),
      groupImage: Joi.string().optional(),
    }).validate(req.body);

    if (isValid.error) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "Invalid input",
        data: isValid.error,
      });
    }

    const { groupName, description, members, groupImage } = req.body;

    const group = await GroupSchema.findOne({ groupName: groupName });
    if (group) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "Group with same name already exist.",
      });
    }
    const gid = getUniqueGroupId(groupName);
    const newGroup = new GroupSchema({
      groupName: groupName,
      description: description,
      members: [id, ...members],
      groupImage: groupImage,
      host: id,
      gid: gid,
    });

    try {
      await newGroup.save();
      res.status(statusCodes.CREATED).send({
        status: statusCodes.CREATED,
        message: "Group created successfully.",
      });
    } catch (err) {
      res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "Db Error",
        data: err,
      });
    }
  } else {
    const gId = req.body.gId;
    const userData = await UserSchema.findOne({ uid: id });
    if (req.body.isFaviroute) {
      await UserSchema.findOneAndUpdate(
        { uid: id },
        { favirouteGroups: [...userData.favirouteGroups, gId] }
      );
    } else if (req.body.isFaviroute === false) {
      const favirouteList = userData.favirouteGroups
        ?.map((item) => {
          if (item !== gId) {
            return item;
          }
          return null;
        })
        .filter((item) => item !== null);
      await UserSchema.findOneAndUpdate(
        { uid: id },
        { favirouteGroups: favirouteList }
      );
    }
    await GroupSchema.findOneAndUpdate({ gid: gId }, req.body);
    res.status(statusCodes.OK).send({
      status: statusCodes.OK,
      message: "Group updated successfully.",
    });
  }
};
const getGroupList = async (req, res) => {
  try {
    const id = req.params.id;
    const userGroups = await GroupSchema.find({
      members: { $in: [id] },
    });
    res.status(statusCodes.OK).send({
      status: statusCodes.OK,
      message: "Groups fetched successfully.",
      data: userGroups,
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).send({
      status: statusCodes.INTERNAL_SERVER_ERROR,
      message: "An error occurred while fetching groups.",
      error: error.message,
    });
  }
};
const editGroup = async (req, res) => {
  const gid = req.body.gid;
  if (!gid) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Invalid Group Id",
    });
  }
  const GroupData = await GroupSchema.findOne({ gid: gid });
  const editType = req.body.editType;

  switch (editType) {
    case groupEditType.ADD_FRIEND:
      const newMember = req.body.addMember;
      const members = [...GroupData.members, newMember];
      await GroupSchema.findOneAndUpdate({ gid: gid }, { members: members });
      break;
    case groupEditType.REMOVE_FRIEND:
      const removeMemberId = req.body.removeMember;
      const updatedMembers = GroupData.members.filter(
        (item) => item !== removeMemberId
      );
      await GroupSchema.findOneAndUpdate(
        { gid: gid },
        { members: updatedMembers }
      );
      break;
    case groupEditType.GROUP_TITLE:
      const groupName = req.body.groupName;
      await GroupSchema.findOneAndUpdate(
        { gid: gid },
        { groupName: groupName }
      );
      break;
    case groupEditType.SETTLE_PAYMENT:
      const { paidBy, paidTo, txnNo } = req.body;
      const TransactionData = await TransactionSchema.findOne({ gid: gid });
      const { txnMap } = TransactionData;
      const data = txnMap[paidBy][paidTo].map((item) => {
        if (item.txnNo === txnNo) {
          return { ...item, settled: true };
        }
        return item;
      });
      txnMap[paidBy][paidTo] = data;
      await TransactionSchema.findOneAndUpdate(
        { gid: gid },
        { txnMap: txnMap }
      );
      break;
  }
  res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Details updated successfully.",
  });
};
const getGroupDetails = async (req, res) => {
  const gid = req.params.gid;
  try {
    const group = await GroupSchema.findOne({ gid: gid });
    if (!group) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "Invalid Group Id",
      });
    }

    const groupMembers = await Promise.all(
      group.members.map(async (member) => {
        const data = await UserSchema.findOne({ uid: member });
        return {
          name: data.firstName + " " + data.lastName,
          email: data.email,
          uid: data.uid,
        };
      })
    );

    group.members = groupMembers;
    res.status(statusCodes.OK).send({
      status: statusCodes.OK,
      message: "Group details fetched successfully.",
      data: group,
    });
  } catch (error) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).send({
      status: statusCodes.INTERNAL_SERVER_ERROR,
      message: "An error occurred while fetching group details.",
    });
  }
};

module.exports = { createNewGroup, getGroupList, editGroup, getGroupDetails };
