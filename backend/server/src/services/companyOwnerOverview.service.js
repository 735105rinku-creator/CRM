import { TrialBalanceRepository }
  from "../repositories/trialBalance.repository.js";

import { chartOfAccountRepository }
  from "../repositories/chartOfAccount.repository.js";

import { journalEntryRepository }
  from "../repositories/journalEntry.repository.js";

import { TrialBalanceService }
  from "./trialBalance.service.js";

import { ProfitLossService }
  from "./profitLoss.service.js";

import { BalanceSheetService }
  from "./balanceSheet.service.js";

import { GeneralLedgerService }
  from "./generalLedger.service.js";

import { CashBankBookService }
  from "./cashBankBook.service.js";

import { OutstandingService }
  from "./outstanding.service.js";

import { ApiError }
  from "../utils/apiError.js";


/* ============================================================
   DEPENDENCY WIRING

   Reuses the SAME Accounts domain services used by the
   accounting module.

   Important:
   - No duplicate ledger calculation
   - No journal mutation
   - No voucher mutation
   - Read-only Company Admin monitoring
============================================================ */

const trialBalanceRepository =
  new TrialBalanceRepository();


const trialBalanceService =
  new TrialBalanceService({
    chartOfAccountRepository:
      trialBalanceRepository,

    journalEntryRepository:
      trialBalanceRepository,
  });


const profitLossService =
  new ProfitLossService({
    trialBalanceService,
  });


const balanceSheetService =
  new BalanceSheetService({
    trialBalanceService,
  });


const generalLedgerService =
  new GeneralLedgerService({
    chartOfAccountRepository,
    journalEntryRepository,
  });


const cashBankBookService =
  new CashBankBookService({
    chartOfAccountRepository,
    generalLedgerService,
  });


const outstandingService =
  new OutstandingService({
    chartOfAccountRepository,
    generalLedgerService,
  });


/* ============================================================
   HELPERS
============================================================ */

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;


const roundMoney = (
  value
) => {

  return (
    Math.round(
      (
        Number(
          value ||
          0
        ) +
        Number.EPSILON
      ) *
      100
    ) /
    100
  );

};


const todayDate = () => {

  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );

};


const isValidDate = (
  value
) => {

  if (
    typeof value !==
      "string" ||
    !DATE_PATTERN.test(
      value
    )
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
      .map(
        Number
      );


  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  return (
    parsed.getUTCFullYear() ===
      year &&
    parsed.getUTCMonth() ===
      month - 1 &&
    parsed.getUTCDate() ===
      day
  );

};


const financialYearBounds = (
  referenceDate =
    todayDate()
) => {

  if (
    !isValidDate(
      referenceDate
    )
  ) {

    throw new ApiError(
      400,
      "Reference date must be a valid YYYY-MM-DD date."
    );

  }


  const [
    yearText,
    monthText,
  ] =
    referenceDate
      .split("-");


  const year =
    Number(
      yearText
    );


  const month =
    Number(
      monthText
    );


  const startYear =
    month >=
      4
      ? year
      : year - 1;


  return {
    from:
      `${startYear}-04-01`,

    to:
      `${startYear + 1}-03-31`,
  };

};


const normalizePeriod = (
  query =
    {}
) => {

  const today =
    todayDate();


  const asOf =
    String(
      query.asOf ||
      query.to ||
      today
    )
      .trim();


  if (
    !isValidDate(
      asOf
    )
  ) {

    throw new ApiError(
      400,
      "asOf must be a valid YYYY-MM-DD date."
    );

  }


  const financialYear =
    financialYearBounds(
      asOf
    );


  const from =
    String(
      query.from ||
      financialYear.from
    )
      .trim();


  const to =
    String(
      query.to ||
      asOf
    )
      .trim();


  if (
    !isValidDate(
      from
    )
  ) {

    throw new ApiError(
      400,
      "from must be a valid YYYY-MM-DD date."
    );

  }


  if (
    !isValidDate(
      to
    )
  ) {

    throw new ApiError(
      400,
      "to must be a valid YYYY-MM-DD date."
    );

  }


  if (
    from >
    to
  ) {

    throw new ApiError(
      400,
      "from date must not be after to date."
    );

  }


  if (
    asOf <
      from
  ) {

    throw new ApiError(
      400,
      "asOf date must not be before from date."
    );

  }


  return {
    from,
    to,
    asOf,
  };

};


const marginPercent = ({
  profit,
  revenue,
}) => {

  const revenueAmount =
    Number(
      revenue ||
      0
    );


  if (
    !revenueAmount
  ) {

    return 0;

  }


  return roundMoney(
    (
      Number(
        profit ||
        0
      ) /
      revenueAmount
    ) *
    100
  );

};


const financialHealth = ({
  profitLoss,
  balanceSheet,
  cashBank,
  outstanding,
}) => {

  const revenue =
    roundMoney(
      profitLoss
        ?.income
        ?.total
    );


  const expenses =
    roundMoney(
      profitLoss
        ?.expenses
        ?.total
    );


  const netProfit =
    roundMoney(
      profitLoss
        ?.netProfit
    );


  const netLoss =
    roundMoney(
      profitLoss
        ?.netLoss
    );


  const cashBankBalance =
    roundMoney(
      cashBank
        ?.summary
        ?.totalClosing
    );


  const receivable =
    roundMoney(
      outstanding
        ?.receivables
        ?.total
    );


  const payable =
    roundMoney(
      outstanding
        ?.payables
        ?.total
    );


  const assets =
    roundMoney(
      balanceSheet
        ?.assets
        ?.total
    );


  const liabilities =
    roundMoney(
      balanceSheet
        ?.liabilities
        ?.total
    );


  const equity =
    roundMoney(
      balanceSheet
        ?.equity
        ?.total
    );


  return {
    revenue,

    expenses,

    netProfit,

    netLoss,

    profitMargin:
      marginPercent({
        profit:
          netProfit,

        revenue,
      }),

    result:
      profitLoss?.result ||
      "break-even",

    cashBankBalance,

    receivable,

    payable,

    netOutstanding:
      roundMoney(
        receivable -
        payable
      ),

    assets,

    liabilities,

    equity,

    currentPeriodResult:
      balanceSheet
        ?.currentPeriodResult ||
      {
        type:
          "break-even",

        amount:
          0,
      },

    booksBalanced:
      Boolean(
        balanceSheet
          ?.isBalanced
      ),

    balanceDifference:
      roundMoney(
        balanceSheet
          ?.difference
      ),
  };

};


/* ============================================================
   OWNER OVERVIEW SERVICE
============================================================ */

export class CompanyOwnerOverviewService {

  constructor({
    profitLoss =
      profitLossService,

    balanceSheet =
      balanceSheetService,

    cashBankBook =
      cashBankBookService,

    outstanding =
      outstandingService,
  } = {}) {

    this.profitLossService =
      profitLoss;

    this.balanceSheetService =
      balanceSheet;

    this.cashBankBookService =
      cashBankBook;

    this.outstandingService =
      outstanding;

  }


  async getOwnerOverview({
    companyId,
    query =
      {},
  } = {}) {

    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Company context missing."
      );

    }


    const period =
      normalizePeriod(
        query
      );


    /*
     * Every request below is READ-ONLY.
     *
     * Accounts remains the authority for:
     * - Income
     * - Expenses
     * - Profit/Loss
     * - Assets/Liabilities/Equity
     * - Cash/Bank
     * - Receivable/Payable
     */

    const [
      profitLoss,
      balanceSheet,
      cashBank,
      outstanding,
    ] =
      await Promise.all([

        this.profitLossService
          .getProfitLoss({
            companyId,

            from:
              period.from,

            to:
              period.to,
          }),


        this.balanceSheetService
          .getBalanceSheet({
            companyId,

            asOf:
              period.asOf,
          }),


        this.cashBankBookService
          .getCashBankBook({
            companyId,

            query: {
              from:
                period.from,

              to:
                period.to,
            },
          }),


        this.outstandingService
          .getOutstanding({
            companyId,

            query: {
              asOf:
                period.asOf,
            },
          }),

      ]);


    return {
      generatedAt:
        new Date()
          .toISOString(),

      period,

      financial:
        financialHealth({
          profitLoss,
          balanceSheet,
          cashBank,
          outstanding,
        }),

      reports: {

        profitLoss: {
          period:
            profitLoss?.period,

          income:
            profitLoss?.income ||
            {
              accounts:
                [],

              total:
                0,
            },

          expenses:
            profitLoss?.expenses ||
            {
              accounts:
                [],

              total:
                0,
            },

          netProfit:
            roundMoney(
              profitLoss?.netProfit
            ),

          netLoss:
            roundMoney(
              profitLoss?.netLoss
            ),

          result:
            profitLoss?.result ||
            "break-even",
        },


        balanceSheet: {
          asOf:
            balanceSheet?.asOf ||
            period.asOf,

          assets:
            balanceSheet?.assets ||
            {
              accounts:
                [],

              total:
                0,
            },

          liabilities:
            balanceSheet?.liabilities ||
            {
              accounts:
                [],

              total:
                0,
            },

          equity:
            balanceSheet?.equity ||
            {
              accounts:
                [],

              total:
                0,
            },

          currentPeriodResult:
            balanceSheet
              ?.currentPeriodResult ||
            {
              type:
                "break-even",

              amount:
                0,
            },

          totalLiabilitiesAndEquity:
            roundMoney(
              balanceSheet
                ?.totalLiabilitiesAndEquity
            ),

          difference:
            roundMoney(
              balanceSheet
                ?.difference
            ),

          isBalanced:
            Boolean(
              balanceSheet
                ?.isBalanced
            ),
        },


        cashBank: {
          accounts:
            cashBank?.accounts ||
            [],

          summary:
            cashBank?.summary ||
            {
              totalAccounts:
                0,

              totalOpening:
                0,

              totalDebit:
                0,

              totalCredit:
                0,

              totalClosing:
                0,
            },
        },


        outstanding: {
          asOf:
            outstanding?.asOf ||
            period.asOf,

          receivables:
            outstanding
              ?.receivables ||
            {
              accounts:
                [],

              total:
                0,
            },

          payables:
            outstanding
              ?.payables ||
            {
              accounts:
                [],

              total:
                0,
            },
        },

      },
    };

  }

}


const companyOwnerOverviewService =
  new CompanyOwnerOverviewService();


export default
  companyOwnerOverviewService;