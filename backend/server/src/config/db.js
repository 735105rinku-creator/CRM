import mongoose from "mongoose";
import { env } from "./env.js";

const getConnectionFailureReason = (error) => {
  if (
    error.name === "MongoServerError" &&
    /bad auth|authentication failed/i.test(error.message)
  ) {
    return "MongoDB authentication failed. Check the MONGO_URI username, password, and database user permissions.";
  }

  if (error.name === "MongooseServerSelectionError") {
    return "MongoDB server selection timed out. Check network access, Atlas IP access list/firewall rules, and cluster hostnames.";
  }

  return error.message || "Unknown database connection error.";
};

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: env.DB_CONNECT_TIMEOUT_MS,
    });

    console.log(
      `MongoDB Connected : ${mongoose.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB Connection Failed");
    console.error(`Reason: ${getConnectionFailureReason(error)}`);

    if (env.NODE_ENV === "development") {
      console.error(error);
    }

    process.exit(1);
  }
};
