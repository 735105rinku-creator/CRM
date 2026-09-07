import {
  Router
} from "express";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

import {
  getOutstanding
} from "../controllers/outstanding.controller.js";


const router =
  Router();


router.get(
  "/",
  asyncHandler(
    getOutstanding
  )
);


export default router;
