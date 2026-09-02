import fs from "fs";
import path from "path";
import multer from "multer";

import { ApiError } from "../utils/apiError.js";


const uploadDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "logistics-documents"
  );


/* ============================================================
   ENSURE DIRECTORY
============================================================ */

if (
  !fs.existsSync(
    uploadDirectory
  )
) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    }
  );
}


/* ============================================================
   STORAGE
============================================================ */

const storage =
  multer.diskStorage({

    destination: (
      _req,
      _file,
      cb
    ) => {

      cb(
        null,
        uploadDirectory
      );
    },


    filename: (
      _req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname ||
          ""
        )
          .toLowerCase();


      const baseName =
        path.basename(
          file.originalname ||
          "document",
          extension
        )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .replace(
            /^-|-$/g,
            ""
          )
          .slice(
            0,
            70
          ) ||
        "document";


      const timestamp =
        Date.now();


      const random =
        Math.round(
          Math.random() *
          1e9
        );


      cb(
        null,
        `${timestamp}-${random}-${baseName}${extension}`
      );
    },
  });


/* ============================================================
   ALLOWED FILES
============================================================ */

const allowedMimeTypes =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);


const allowedExtensions =
  new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
  ]);


/* ============================================================
   FILE FILTER
============================================================ */

const fileFilter = (
  _req,
  file,
  cb
) => {

  const extension =
    path.extname(
      file.originalname ||
      ""
    )
      .toLowerCase();


  const validMime =
    allowedMimeTypes.has(
      file.mimetype
    );


  const validExtension =
    allowedExtensions.has(
      extension
    );


  if (
    !validMime ||
    !validExtension
  ) {

    return cb(
      new ApiError(
        400,
        "Only PDF, JPG, JPEG and PNG logistics documents are allowed"
      )
    );
  }


  cb(
    null,
    true
  );
};


/* ============================================================
   MULTER
============================================================ */

export const logisticsDocumentUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      /*
       * 10 MB maximum per document.
       */
      fileSize:
        10 *
        1024 *
        1024,

      files:
        1,
    },
  });


/* ============================================================
   SINGLE DOCUMENT
============================================================ */

export const uploadSingleLogisticsDocument =
  logisticsDocumentUpload.single(
    "file"
  );