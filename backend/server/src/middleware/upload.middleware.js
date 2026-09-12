import fs from "fs";
import path from "path";

import multer from "multer";

import { ApiError } from "../utils/apiError.js";


const uploadRoot =
  path.join(
    process.cwd(),
    "public",
    "uploads"
  );


const ensureDir = (
  dirPath
) => {

  if (
    !fs.existsSync(
      dirPath
    )
  ) {

    fs.mkdirSync(
      dirPath,
      {
        recursive: true,
      }
    );
  }
};


/* ============================================================
   IMAGE FILTER
============================================================ */

const imageFileFilter = (
  req,
  file,
  callback
) => {

  if (
    !file.mimetype
      .startsWith(
        "image/"
      )
  ) {

    return callback(
      new ApiError(
        400,
        "Only image files are allowed."
      )
    );
  }


  callback(
    null,
    true
  );
};


/* ============================================================
   VENDOR PAYMENT PROOF FILTER

   Allowed:
   - JPG
   - JPEG
   - PNG
   - PDF
============================================================ */

const vendorPaymentProofFilter = (
  req,
  file,
  callback
) => {

  const allowedMimeTypes =
    new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ]);


  const extension =
    path
      .extname(
        file.originalname ||
        ""
      )
      .toLowerCase();


  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
    ]);


  if (
    !allowedMimeTypes.has(
      file.mimetype
    ) ||
    !allowedExtensions.has(
      extension
    )
  ) {

    return callback(
      new ApiError(
        400,
        "Payment proof must be JPG, JPEG, PNG or PDF."
      )
    );
  }


  callback(
    null,
    true
  );
};


/* ============================================================
   LOGISTICS VENDOR BILL FILTER

   Separate from Payment Proof.

   Allowed:
   - JPG
   - JPEG
   - PNG
   - PDF

   Maximum file size:
   - 1 MB

   MongoDB stores metadata / URL only.
============================================================ */

const logisticsVendorBillFileFilter = (
  req,
  file,
  callback
) => {

  const allowedMimeTypes =
    new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ]);


  const extension =
    path
      .extname(
        file.originalname ||
        ""
      )
      .toLowerCase();


  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
    ]);


  if (
    !allowedMimeTypes.has(
      file.mimetype
    ) ||
    !allowedExtensions.has(
      extension
    )
  ) {

    return callback(
      new ApiError(
        400,
        "Vendor bill must be JPG, JPEG, PNG or PDF."
      )
    );
  }


  callback(
    null,
    true
  );
};


/* ============================================================
   PURCHASE INVOICE FILTER

   Allowed:
   - JPG
   - JPEG
   - PNG
   - PDF

   Maximum file size is enforced separately by Multer:
   1 MB per file.
============================================================ */

const purchaseInvoiceFileFilter = (
  req,
  file,
  callback
) => {

  const allowedMimeTypes =
    new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ]);


  const extension =
    path
      .extname(
        file.originalname ||
        ""
      )
      .toLowerCase();


  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
    ]);


  if (
    !allowedMimeTypes.has(
      file.mimetype
    ) ||
    !allowedExtensions.has(
      extension
    )
  ) {

    return callback(
      new ApiError(
        400,
        "Invoice attachment must be JPG, JPEG, PNG or PDF."
      )
    );
  }


  callback(
    null,
    true
  );
};


/* ============================================================
   STORAGE FACTORY
============================================================ */

const makeStorage = (
  folder
) =>
  multer.diskStorage({

    destination: (
      req,
      file,
      callback
    ) => {

      const destination =
        path.join(
          uploadRoot,
          folder
        );


      ensureDir(
        destination
      );


      callback(
        null,
        destination
      );
    },


    filename: (
      req,
      file,
      callback
    ) => {

      const ext =
        path
          .extname(
            file.originalname ||
            ""
          )
          .toLowerCase() ||
        ".png";


      const safeName =
        `${Date.now()}-${Math.round(
          Math.random() *
          1e9
        )}${ext}`;


      callback(
        null,
        safeName
      );
    },

  });


/* ============================================================
   STORAGE LOCATIONS
============================================================ */

const companyLogoStorage =
  makeStorage(
    "company-logos"
  );


const employeePhotoStorage =
  makeStorage(
    "employee-photos"
  );


const profileImageStorage =
  makeStorage(
    "profile-images"
  );


const employeeDocumentStorage =
  makeStorage(
    "employee-documents"
  );


const vendorPaymentProofStorage =
  makeStorage(
    "vendor-payment-proofs"
  );


const logisticsVendorBillStorage =
  makeStorage(
    "logistics-vendor-bills"
  );


const purchaseInvoiceStorage =
  makeStorage(
    "purchase-invoices"
  );


/* ============================================================
   COMPANY LOGO
============================================================ */

export const uploadCompanyLogo =
  multer({

    storage:
      companyLogoStorage,

    fileFilter:
      imageFileFilter,

    limits: {

      fileSize:
        2 *
        1024 *
        1024,

    },

  });


/* ============================================================
   EMPLOYEE PHOTO
============================================================ */

export const uploadEmployeePhoto =
  multer({

    storage:
      employeePhotoStorage,

    fileFilter:
      imageFileFilter,

    limits: {

      fileSize:
        2 *
        1024 *
        1024,

    },

  });


/* ============================================================
   PROFILE IMAGE
============================================================ */

export const uploadProfileImage =
  multer({

    storage:
      profileImageStorage,

    fileFilter:
      imageFileFilter,

    limits: {

      fileSize:
        2 *
        1024 *
        1024,

    },

  });


/* ============================================================
   EMPLOYEE DOCUMENT
============================================================ */

export const uploadEmployeeDocument =
  multer({

    storage:
      employeeDocumentStorage,

    limits: {

      fileSize:
        10 *
        1024 *
        1024,

    },

  });


/* ============================================================
   VENDOR PAYMENT PROOF

   Optional upload is controlled by the route:

   uploadVendorPaymentProof.single("paymentProof")

   No file = request continues normally.
============================================================ */

export const uploadVendorPaymentProof =
  multer({

    storage:
      vendorPaymentProofStorage,

    fileFilter:
      vendorPaymentProofFilter,

    limits: {

      fileSize:
        10 *
        1024 *
        1024,

    },

  });


/* ============================================================
   LOGISTICS VENDOR BILL / INVOICE

   Separate from payment proof.

   Route usage:

   uploadLogisticsVendorBill.single("vendorBill")

   Actual file:
   public/uploads/logistics-vendor-bills/

   MongoDB:
   metadata + URL only.

   Allowed:
   JPG / JPEG / PNG / PDF

   Maximum:
   1 MB
============================================================ */

export const uploadLogisticsVendorBill =
  multer({

    storage:
      logisticsVendorBillStorage,

    fileFilter:
      logisticsVendorBillFileFilter,

    limits: {

      fileSize:
        1 *
        1024 *
        1024,

    },

  });


/* ============================================================
   PURCHASE INVOICE ATTACHMENT

   Actual file is stored on server disk:

   public/uploads/purchase-invoices/

   MongoDB must store only file metadata / URL.

   Allowed:
   - JPG
   - JPEG
   - PNG
   - PDF

   Maximum:
   - 1 MB per file
============================================================ */

export const uploadPurchaseInvoice =
  multer({

    storage:
      purchaseInvoiceStorage,

    fileFilter:
      purchaseInvoiceFileFilter,

    limits: {

      fileSize:
        1 *
        1024 *
        1024,

    },

  });


/* ============================================================
   PUBLIC URL HELPERS
============================================================ */

export const toPublicUploadUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/company-logos/${file.filename}`
  );
};


export const toPublicEmployeePhotoUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/employee-photos/${file.filename}`
  );
};


export const toPublicProfileImageUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/profile-images/${file.filename}`
  );
};


export const toPublicEmployeeDocumentUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/employee-documents/${file.filename}`
  );
};


/* ============================================================
   VENDOR PAYMENT PROOF PUBLIC URL
============================================================ */

export const toPublicVendorPaymentProofUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/vendor-payment-proofs/${file.filename}`
  );
};


/* ============================================================
   LOGISTICS VENDOR BILL PUBLIC URL
============================================================ */

export const toPublicLogisticsVendorBillUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/logistics-vendor-bills/${file.filename}`
  );
};


/* ============================================================
   PURCHASE INVOICE PUBLIC URL
============================================================ */

export const toPublicPurchaseInvoiceUrl = (
  file
) => {

  if (
    !file?.filename
  ) {

    return "";
  }


  return (
    `/uploads/purchase-invoices/${file.filename}`
  );
};