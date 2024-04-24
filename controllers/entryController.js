const statusCodes = require("../common/statusCodes");
const TransactionSchema = require("../models/newEntry");
const UserSchema = require("../models/userDetails");
const GroupSchema = require("../models/groups");
const crypto = require("crypto");

const makeNewEntry = async (req, res) => {
  try {
    const paidBy = req.body.paidBy;
    const groupId = req.body.gid;
    const groupData = await GroupSchema.findOne({ gid: groupId });

    if (!groupData) {
      return res.status(statusCodes.BAD_REQUEST).send({
        status: statusCodes.BAD_REQUEST,
        message: "No group found with the given id",
      });
    }
    const TransactionData = await TransactionSchema.findOne({ gid: groupId });

    const { transactionName, amount, participants, date, isEquallyDivided } =
      req.body;
    const description = req.body.description;

    TransactionPaidBy = TransactionData?.paidBy || [];
    if (!TransactionPaidBy.includes(paidBy)) {
      TransactionPaidBy.push(paidBy);
    }
    if (isEquallyDivided) {
      participants.push(paidBy);
    }

    if (TransactionData) {
      let txnMap = TransactionData.txnMap;
      participants.forEach((participant) => {
        if (!txnMap[paidBy]) {
          txnMap[paidBy] = {};
        }
        let key = isEquallyDivided ? participant : participant.name;
        if (!txnMap[paidBy][key]) {
          txnMap[paidBy][key] = [];
        }
        txnMap[paidBy][key].push({
          txnNo: crypto.randomBytes(4).toString("hex"),
          amount: isEquallyDivided
            ? parseFloat((amount / participants.length).toFixed(2))
            : parseFloat(participant.memberAmount.toFixed(2)),
          date: date,
          txnName: transactionName,
          settled: false,
          ...(description && { txnDescp: description }),
        });
      });
      TransactionData.markModified("txnMap");
      TransactionData.markModified("paidBy");
      await TransactionData.save();

      return res.status(statusCodes.OK).send({
        status: statusCodes.OK,
        message: "Transaction updated successfully",
        data: TransactionData,
      });
    } else {
      let txnMap = {};
      participants.forEach((participant) => {
        if (!txnMap[paidBy]) {
          txnMap[paidBy] = {};
        }
        txnMap[paidBy][isEquallyDivided ? participant : participant.name] = [
          {
            txnNo: crypto.randomBytes(4).toString("hex"),
            amount: isEquallyDivided
              ? parseFloat((amount / participants.length).toFixed(2))
              : parseFloat(participant.memberAmount.toFixed(2)),
            date: date,
            settled: false,
            txnName: transactionName,
            ...(description && { txnDescp: description }),
          },
        ];
      });

      const newTransaction = new TransactionSchema({
        gid: groupId,
        paidBy: TransactionPaidBy,
        txnMap: txnMap,
      });

      await newTransaction.save();

      return res.status(statusCodes.OK).send({
        status: statusCodes.OK,
        message: "Transaction added successfully",
        data: newTransaction,
      });
    }
  } catch (error) {
    return res.status(statusCodes.BAD_REQUEST).send({
      status: statusCodes.BAD_REQUEST,
      message: "Db Error",
      data: err,
    });
  }
};
const getTotalCount = async (req, res) => {
  const idToCheck = req.params.id;
  const gId = req.body.gid;
  const TransactionData = await TransactionSchema.findOne({ gid: gId });

  if (!TransactionData) {
    return res.status(statusCodes.OK).send({
      status: statusCodes.NO_CONTENT,
      message: "User is not a participant in any transaction",
    });
  }
  const { txnMap } = TransactionData;
  let totalAmount = {
    want: 0,
    give: 0,
    fromWhom: [],
    toWhom: [],
  };

  if (txnMap[idToCheck]) {
    Object.entries(txnMap[idToCheck]).forEach(([key]) => {
      if (key === idToCheck) {
        return;
      }
      txnMap[idToCheck][key]?.map(async (element) => {
        if (element.settled) return;
        totalAmount.want = totalAmount.want + element.amount;
        totalAmount.fromWhom.push({
          id: key,
          amount: element.amount,
          details: element,
        });
      });
    });
  }

  Object.entries(txnMap).forEach(([key]) => {
    if (key === idToCheck) {
      return;
    }
    Object.entries(txnMap[key]).forEach(([element]) => {
      if (element !== idToCheck) {
        return;
      }
      txnMap[key][element]?.map(async (data) => {
        if (data.settled) return;
        totalAmount.give = totalAmount.give + data.amount;
        totalAmount.toWhom.push({
          id: key,
          amount: data.amount,
          details: data,
        });
      });
    });
  });

  if (totalAmount.want === 0 && totalAmount.give === 0) {
    return res.status(statusCodes.NO_CONTENT).send({
      status: statusCodes.NO_CONTENT,
      message: "User is not a participant in any transaction",
    });
  }

  return res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Total amount fetched successfully",
    data: totalAmount,
  });
};
const getAllTransactionList = async (req, res) => {
  const gId = req.params.gId;

  const TransactionData = await TransactionSchema.findOne({ gid: gId });

  if (!TransactionData) {
    return res.status(statusCodes.NO_CONTENT).send({
      status: statusCodes.NO_CONTENT,
      message: "No Transaction happened",
    });
  }

  const paidBy = TransactionData.paidBy;
  const allTransaction = TransactionData.txnMap;

  let paymentObj = [];
  paidBy?.forEach((payer) => {
    Object.keys(allTransaction[payer]).forEach((key) => {
      TransactionData.txnMap[payer][key].forEach((element) => {
        if (key === payer) return;
        const obj = {
          paidBy: payer,
          paidTo: key,
          amount: element.amount,
          date: element.date,
          txnName: element.txnName,
          txnNo: element.txnNo,
          settled: element.settled,
          ...(element.txnDescp && { txnDescp: element.txnDescp }),
        };
        paymentObj.push(obj);
      });
    });
  });

  const userPromises = paymentObj.map(async (element) => {
    const paidByDetails = await UserSchema.findOne({ uid: element.paidBy });
    const paidToDetails = await UserSchema.findOne({ uid: element.paidTo });
    return {
      ...element,
      paidByName: paidByDetails.firstName + " " + paidByDetails.lastName,
      paidToName: paidToDetails.firstName + " " + paidToDetails.lastName,
    };
  });

  const result = await Promise.all(userPromises);

  return res.status(statusCodes.OK).send({
    status: statusCodes.OK,
    message: "Transactions retrieved successfully",
    data: result,
  });
};

module.exports = { makeNewEntry, getTotalCount, getAllTransactionList };
