import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();

    const allowed =
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv");

    if (!allowed) {
      return cb(
        new ApiError(
          400,
          "Only XLSX, XLS or CSV files are allowed"
        )
      );
    }

    cb(null, true);
  },
});

export const logisticsImportFile =
  upload.single("file");

export default logisticsImportFile;
