import {
  DayBookRepository,
} from "../repositories/dayBook.repository.js";

import {
  DayBookService,
} from "../services/dayBook.service.js";

import {
  ApiResponse,
} from "../utils/apiResponse.js";

import {
  ApiError,
} from "../utils/apiError.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";


const dayBookRepository =
  new DayBookRepository();

const dayBookService =
  new DayBookService({
    dayBookRepository,
  });


const companyIdForRequest =
  (req) => {

    const companyId =
      req.accountingAccess
        ?.companyId ||
      req.auth
        ?.companyId ||
      req.user
        ?.companyId
        ?._id ||
      req.user
        ?.companyId;

    if (!companyId) {
      throw new ApiError(
        403,
        "Accounting company context missing."
      );
    }

    return companyId;

  };


export const getDayBook =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await dayBookService.getDayBook({
          companyId:
            companyIdForRequest(req),

          query:
            req.query ||
            {},
        });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Day Book fetched successfully."
          )
        );

    }
  );
