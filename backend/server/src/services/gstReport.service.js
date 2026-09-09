import { ApiError } from "../utils/apiError.js";


const GST_VOUCHER_TYPES =
  new Set([
    "sales",
    "purchase",
    "credit_note",
    "debit_note",
  ]);


function roundMoney(
  value
) {
  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;
}


function isValidDate(
  value
) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }


  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}


function getCurrentIndianFinancialYear() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth() + 1;

  const startYear =
    month >= 4
      ? year
      : year - 1;

  return {
    from:
      `${startYear}-04-01`,

    to:
      `${startYear + 1}-03-31`,
  };
}

function normalizeDateRange(
  query = {}
) {
  const defaultRange =
    getCurrentIndianFinancialYear();


  const from =
    query?.from ||
    defaultRange.from;


  const to =
    query?.to ||
    defaultRange.to;


  if (
    from &&
    !isValidDate(from)
  ) {
    throw new ApiError(
      400,
      "Invalid from date. Expected YYYY-MM-DD."
    );
  }


  if (
    to &&
    !isValidDate(to)
  ) {
    throw new ApiError(
      400,
      "Invalid to date. Expected YYYY-MM-DD."
    );
  }


  if (
    from &&
    to &&
    from > to
  ) {
    throw new ApiError(
      400,
      "Invalid date range. from date cannot be after to date."
    );
  }


  return {
    from,
    to,
  };
}


function toId(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value);
}


function createTaxEntry({
  voucher,
  account,
  line,
  taxAmount,
}) {
  return {
    voucherId:
      toId(
        voucher?._id
      ),

    voucherNumber:
      voucher?.voucherNumber ||
      null,

    voucherType:
      voucher?.voucherType ||
      null,

    voucherDate:
      voucher?.voucherDate ||
      null,

    accountId:
      toId(
        account?._id
      ),

    accountCode:
      account?.accountCode ||
      null,

    accountName:
      account?.accountName ||
      null,

    accountType:
      account?.accountType ||
      null,

    accountStatus:
      account?.status ||
      null,

    debit:
      roundMoney(
        line?.debit
      ),

    credit:
      roundMoney(
        line?.credit
      ),

    taxAmount:
      roundMoney(
        taxAmount
      ),
  };
}


export class GstReportService {

  constructor({
    voucherRepository,
    chartOfAccountRepository,
  }) {

    this.voucherRepository =
      voucherRepository;

    this.chartOfAccountRepository =
      chartOfAccountRepository;
  }


  async getGstReport({
    companyId,
    query = {},
  }) {

    if (
      !companyId
    ) {
      throw new ApiError(
        403,
        "Accounting company context missing."
      );
    }


    const {
      from,
      to,
    } =
      normalizeDateRange(
        query
      );


    const accounts =
      await this.chartOfAccountRepository.list({
        companyId,
      });


    const accountById =
      new Map();


    for (
      const account
      of accounts || []
    ) {

      accountById.set(
        toId(
          account?._id
        ),
        account
      );
    }


    const vouchers =
      await this.voucherRepository.list({
        companyId,

        status:
          "posted",

        from,

        to,

        sortBy:
          "voucherDate",

        sortOrder:
          "asc",
      });


    const outputEntries =
      [];

    const inputEntries =
      [];


    let outputTaxTotal =
      0;

    let inputTaxTotal =
      0;


    for (
      const voucher
      of vouchers || []
    ) {

      if (
        !GST_VOUCHER_TYPES.has(
          voucher?.voucherType
        )
      ) {
        continue;
      }


      for (
        const line
        of voucher?.lines || []
      ) {

        const account =
          accountById.get(
            toId(
              line?.accountId
            )
          );


        if (
          !account ||
          account.accountType !== "tax"
        ) {
          continue;
        }


        const debit =
          roundMoney(
            line?.debit
          );

        const credit =
          roundMoney(
            line?.credit
          );


        if (
          voucher.voucherType ===
          "sales"
        ) {

          const amount =
            roundMoney(
              credit - debit
            );


          outputTaxTotal =
            roundMoney(
              outputTaxTotal +
              amount
            );


          outputEntries.push(
            createTaxEntry({
              voucher,
              account,
              line,
              taxAmount:
                amount,
            })
          );

          continue;
        }


        if (
          voucher.voucherType ===
          "credit_note"
        ) {

          const amount =
            roundMoney(
              debit - credit
            );


          outputTaxTotal =
            roundMoney(
              outputTaxTotal -
              amount
            );


          outputEntries.push(
            createTaxEntry({
              voucher,
              account,
              line,
              taxAmount:
                roundMoney(
                  -amount
                ),
            })
          );

          continue;
        }


        if (
          voucher.voucherType ===
          "purchase"
        ) {

          const amount =
            roundMoney(
              debit - credit
            );


          inputTaxTotal =
            roundMoney(
              inputTaxTotal +
              amount
            );


          inputEntries.push(
            createTaxEntry({
              voucher,
              account,
              line,
              taxAmount:
                amount,
            })
          );

          continue;
        }


        if (
          voucher.voucherType ===
          "debit_note"
        ) {

          const amount =
            roundMoney(
              credit - debit
            );


          inputTaxTotal =
            roundMoney(
              inputTaxTotal -
              amount
            );


          inputEntries.push(
            createTaxEntry({
              voucher,
              account,
              line,
              taxAmount:
                roundMoney(
                  -amount
                ),
            })
          );
        }
      }
    }


    const net =
      roundMoney(
        outputTaxTotal -
        inputTaxTotal
      );


    let netType =
      "settled";


    if (
      net > 0
    ) {
      netType =
        "payable";
    } else if (
      net < 0
    ) {
      netType =
        "receivable";
    }


    return {
      from,
      to,

      outputTax: {
        total:
          roundMoney(
            outputTaxTotal
          ),

        entries:
          outputEntries,
      },

      inputTax: {
        total:
          roundMoney(
            inputTaxTotal
          ),

        entries:
          inputEntries,
      },

      netGst: {
        amount:
          roundMoney(
            Math.abs(
              net
            )
          ),

        type:
          netType,
      },
    };
  }
}


export default
  GstReportService;
