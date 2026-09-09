import {
  Router,
} from "express";

import {
  getDayBook,
} from "../controllers/dayBook.controller.js";

const router =
  Router();

router.get(
  "/",
  getDayBook
);

export default router;
