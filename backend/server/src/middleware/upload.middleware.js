import fs from "fs";
import path from "path";

import multer from "multer";

import { ApiError } from "../utils/apiError.js";

const uploadRoot = path.join(process.cwd(), "public", "uploads");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const imageFileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    return callback(new ApiError(400, "Only image files are allowed."));
  }

  callback(null, true);
};

const makeStorage = (folder) => multer.diskStorage({
  destination: (req, file, callback) => {
    const destination = path.join(uploadRoot, folder);
    ensureDir(destination);
    callback(null, destination);
  },
  filename: (req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    callback(null, safeName);
  },
});

const companyLogoStorage = makeStorage("company-logos");
const employeePhotoStorage = makeStorage("employee-photos");
const profileImageStorage = makeStorage("profile-images");
const employeeDocumentStorage = makeStorage("employee-documents");

export const uploadCompanyLogo = multer({
  storage: companyLogoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadEmployeePhoto = multer({
  storage: employeePhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});


export const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadEmployeeDocument = multer({
  storage: employeeDocumentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const toPublicUploadUrl = (file) => {
  if (!file?.filename) return "";
  return `/uploads/company-logos/${file.filename}`;
};

export const toPublicEmployeePhotoUrl = (file) => {
  if (!file?.filename) return "";
  return `/uploads/employee-photos/${file.filename}`;
};

export const toPublicProfileImageUrl = (file) => {
  if (!file?.filename) return "";
  return `/uploads/profile-images/${file.filename}`;
};

export const toPublicEmployeeDocumentUrl = (file) => {
  if (!file?.filename) return "";
  return `/uploads/employee-documents/${file.filename}`;
};


