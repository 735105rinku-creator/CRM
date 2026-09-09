const roundMoney = (value) => {

  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

};


const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;


const financialYearStartOf = (
  asOf
) => {

  if (
    typeof asOf !== "string" ||
    !DATE_PATTERN.test(asOf)
  ) {

    throw new Error(
      "Valid asOf date is required."
    );

  }


  const [
    yearText,
    monthText,
  ] = asOf.split("-");


  const year =
    Number(yearText);

  const month =
    Number(monthText);


  const financialYearStartYear =
    month >= 4
      ? year
      : year - 1;


  return (
    `${financialYearStartYear}` +
    "-04-01"
  );

};


const toSignedClosingBalance = (
  closingBalance
) => {

  if (
    closingBalance &&
    typeof closingBalance === "object"
  ) {

    return roundMoney(
      Number(
        closingBalance.debit || 0
      ) -
      Number(
        closingBalance.credit || 0
      )
    );

  }


  return roundMoney(
    closingBalance
  );

};

const mapBalanceSheetAccount = (
  account,
  amount
) => {

  return {

    accountId:
      account.accountId,

    accountCode:
      account.accountCode,

    accountName:
      account.accountName,

    nature:
      account.nature,

    accountType:
      account.accountType,

    status:
      account.status,

    closingBalance:
      toSignedClosingBalance(
        account.closingBalance
      ),

    amount:
      roundMoney(amount),

  };

};


export class BalanceSheetService {

  constructor({
    trialBalanceService,
  } = {}) {

    this.trialBalanceService =
      trialBalanceService;

  }


  async getBalanceSheet({
    companyId,
    asOf,
  } = {}) {

    const from =
      financialYearStartOf(asOf);


    const trialBalance =
      await this.trialBalanceService
        .getTrialBalance({
          companyId,
          from,
          to: asOf,
        });


    const assetAccounts = [];
    const liabilityAccounts = [];
    const equityAccounts = [];


    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    let totalIncome = 0;
    let totalExpenses = 0;


    for (
      const account of
      trialBalance.accounts || []
    ) {

      const closingBalance =
        toSignedClosingBalance(
          account.closingBalance
        );


      if (
        account.nature === "asset"
      ) {

        const amount =
          roundMoney(
            closingBalance
          );


        assetAccounts.push(
          mapBalanceSheetAccount(
            account,
            amount
          )
        );


        totalAssets =
          roundMoney(
            totalAssets +
            amount
          );

        continue;

      }


      if (
        account.nature ===
        "liability"
      ) {

        const amount =
          roundMoney(
            -closingBalance
          );


        liabilityAccounts.push(
          mapBalanceSheetAccount(
            account,
            amount
          )
        );


        totalLiabilities =
          roundMoney(
            totalLiabilities +
            amount
          );

        continue;

      }


      if (
        account.nature === "equity"
      ) {

        const amount =
          roundMoney(
            -closingBalance
          );


        equityAccounts.push(
          mapBalanceSheetAccount(
            account,
            amount
          )
        );


        totalEquity =
          roundMoney(
            totalEquity +
            amount
          );

        continue;

      }


      if (
        account.nature === "income"
      ) {

        totalIncome =
          roundMoney(
            totalIncome +
            Number(
              account.periodCredit || 0
            ) -
            Number(
              account.periodDebit || 0
            )
          );

        continue;

      }


      if (
        account.nature === "expense"
      ) {

        totalExpenses =
          roundMoney(
            totalExpenses +
            Number(
              account.periodDebit || 0
            ) -
            Number(
              account.periodCredit || 0
            )
          );

      }

    }


    const periodDifference =
      roundMoney(
        totalIncome -
        totalExpenses
      );


    const currentPeriodResult =
      periodDifference > 0
        ? {
            type: "profit",
            amount:
              periodDifference,
          }
        : periodDifference < 0
          ? {
              type: "loss",
              amount:
                roundMoney(
                  Math.abs(
                    periodDifference
                  )
                ),
            }
          : {
              type: "break-even",
              amount: 0,
            };


    const currentPeriodEquityImpact =
      currentPeriodResult.type ===
      "profit"
        ? currentPeriodResult.amount
        : currentPeriodResult.type ===
            "loss"
          ? -currentPeriodResult.amount
          : 0;


    const totalLiabilitiesAndEquity =
      roundMoney(
        totalLiabilities +
        totalEquity +
        currentPeriodEquityImpact
      );


    const difference =
      roundMoney(
        totalAssets -
        totalLiabilitiesAndEquity
      );


    return {

      companyId:
        trialBalance.companyId ||
        companyId,

      asOf,

      period:
        trialBalance.period,

      assets: {

        accounts:
          assetAccounts,

        total:
          roundMoney(
            totalAssets
          ),

      },

      liabilities: {

        accounts:
          liabilityAccounts,

        total:
          roundMoney(
            totalLiabilities
          ),

      },

      equity: {

        accounts:
          equityAccounts,

        total:
          roundMoney(
            totalEquity
          ),

      },

      currentPeriodResult,

      totalLiabilitiesAndEquity,

      difference,

      isBalanced:
        difference === 0,

    };

  }

}
