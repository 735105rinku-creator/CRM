const roundMoney = (value) => {

  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

};


const toAccountRow = (
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

    periodDebit:
      roundMoney(
        account.periodDebit
      ),

    periodCredit:
      roundMoney(
        account.periodCredit
      ),

    amount:
      roundMoney(amount),

  };

};


export class ProfitLossService {

  constructor({
    trialBalanceService,
  } = {}) {

    this.trialBalanceService =
      trialBalanceService;

  }


  async getProfitLoss({
    companyId,
    from,
    to,
  } = {}) {

    const trialBalance =
      await this.trialBalanceService
        .getTrialBalance({
          companyId,
          from,
          to,
        });


    const incomeAccounts = [];
    const expenseAccounts = [];


    let totalIncome = 0;
    let totalExpenses = 0;


    for (
      const account of
      trialBalance.accounts || []
    ) {

      if (
        account.nature === "income"
      ) {

        const amount =
          roundMoney(
            Number(
              account.periodCredit || 0
            ) -
            Number(
              account.periodDebit || 0
            )
          );


        incomeAccounts.push(
          toAccountRow(
            account,
            amount
          )
        );


        totalIncome =
          roundMoney(
            totalIncome +
            amount
          );

        continue;

      }


      if (
        account.nature === "expense"
      ) {

        const amount =
          roundMoney(
            Number(
              account.periodDebit || 0
            ) -
            Number(
              account.periodCredit || 0
            )
          );


        expenseAccounts.push(
          toAccountRow(
            account,
            amount
          )
        );


        totalExpenses =
          roundMoney(
            totalExpenses +
            amount
          );

      }

    }


    const difference =
      roundMoney(
        totalIncome -
        totalExpenses
      );


    const netProfit =
      difference > 0
        ? difference
        : 0;


    const netLoss =
      difference < 0
        ? roundMoney(
            Math.abs(difference)
          )
        : 0;


    const result =
      difference > 0
        ? "profit"
        : difference < 0
          ? "loss"
          : "break-even";


    return {

      companyId:
        trialBalance.companyId ||
        companyId,

      period:
        trialBalance.period,

      income: {

        accounts:
          incomeAccounts,

        total:
          roundMoney(
            totalIncome
          ),

      },

      expenses: {

        accounts:
          expenseAccounts,

        total:
          roundMoney(
            totalExpenses
          ),

      },

      netProfit,

      netLoss,

      result,

    };

  }

}
