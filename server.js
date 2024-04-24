const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/db");
const session = require("express-session");
const MongoDbSession = require("connect-mongodb-session")(session);
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const newEntryRoutes = require("./routes/newEntryRoutes");
const s3ClientRoutes = require("./routes/s3ClientRoutes");
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
const store = new MongoDbSession({
  uri: process.env.MONGODB_URI,
  collection: "sessions",
});

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use("/user", userRoutes);
app.use("/user/group", groupRoutes);
app.use("/user/group/transactions", newEntryRoutes);
app.use("/s3", s3ClientRoutes);
app.listen(process.env.DEFAULT_PORT);
