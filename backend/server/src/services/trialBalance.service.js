const DATE_ONLY_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;


const toDateOnly = (
  year,
  month,
  day
) => {

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

};


const roundMoney = (value) => {

  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

};


const resolveIndianFinancialYear = (
  now = new Date()
) => {

  const year =
    now.getUTCFullYear();

  const month =
    now.getUTCMonth() + 1;

  const startYear =
    month >= 4
      ? year
      : year - 1;

  return {
    from: toDateOnly(
      startYear,
      4,
      1
    ),
    to: toDateOnly(
      startYear + 1,
      3,
      31
    ),
  };

};


const resolvePeriod = ({
  from,
  to,
  now,
}) => {

  if (!from && !to) {

    return resolveIndianFinancialYear(
      now
    );

  }

  if (!from || !to) {

    throw new Error(
      "Both from and to dates are required."
    );

  }

  if (
    !DATE_ONLY_PATTERN.test(from) ||
    !DATE_ONLY_PATTERN.test(to)
  ) {

    throw new Error(
      "Dates must use YYYY-MM-DD format."
    );

  }

  if (from > to) {

    throw new Error(
      "From date cannot be after to date."
    );

  }

  return {
    from,
    to,
  };

};


const toSignedOpeningBalance = (
  account
) => {

  const amount =
    roundMoney(
      account.openingBalance
    );

  return account.openingBalanceType ===
    "credit"
    ? -amount
    : amount;

};


const toDebitCreditBalance = (
  signedAmount
) => {

  const amount =
    roundMoney(
      signedAmount
    );

  if (amount >= 0) {

    return {
      debit: amount,
      credit: 0,
    };

  }

  return {
    debit: 0,
    credit: roundMoney(
      Math.abs(amount)
    ),
  };

};


const toDateString = (
  value
) => {

  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {

    return value.slice(
      0,
      10
    );

  }

  if (
    value instanceof Date
  ) {

    return value
      .toISOString()
      .slice(
        0,
        10
      );

  }

  return new Date(value)
    .toISOString()
    .slice(
      0,
      10
    );

};


const calculateTotals = (
  accounts
) => {

  const totals = {

    totalOpeningDebit: 0,
    totalOpeningCredit: 0,

    totalPeriodDebit: 0,
    totalPeriodCredit: 0,

    totalClosingDebit: 0,
    totalClosingCredit: 0,

  };


  for (const account of accounts) {

    totals.totalOpeningDebit =
      roundMoney(
        totals.totalOpeningDebit +
        account.openingBalance.debit
      );

    totals.totalOpeningCredit =
      roundMoney(
        totals.totalOpeningCredit +
        account.openingBalance.credit
      );


    totals.totalPeriodDebit =
      roundMoney(
        totals.totalPeriodDebit +
        account.periodDebit
      );

    totals.totalPeriodCredit =
      roundMoney(
        totals.totalPeriodCredit +
        account.periodCredit
      );


    totals.totalClosingDebit =
      roundMoney(
        totals.totalClosingDebit +
        account.closingBalance.debit
      );

    totals.totalClosingCredit =
      roundMoney(
        totals.totalClosingCredit +
        account.closingBalance.credit
      );

  }


  const difference =
    roundMoney(
      totals.totalClosingDebit -
      totals.totalClosingCredit
    );


  return {
    ...totals,

    difference,

    isBalanced:
      Math.abs(
        difference
      ) < 0.01,
  };

};


export class TrialBalanceService {

  constructor({
    chartOfAccountRepository = null,
    journalEntryRepository = null,
  } = {}) {

    this.chartOfAccountRepository =
      chartOfAccountRepository;

    this.journalEntryRepository =
      journalEntryRepository;

  }


  async getTrialBalance({
    companyId,
    from,
    to,
    now = new Date(),
  } = {}) {

    const period =
      resolvePeriod({
        from,
        to,
        now,
      });


    if (
      !this.chartOfAccountRepository ||
      !this.journalEntryRepository
    ) {

      return {
        companyId,
        period,
      };

    }


    const accounts =
      await this.chartOfAccountRepository.list({
        companyId,
      });


    const rows = [];


    for (const account of accounts) {

      const lines =
        await this.journalEntryRepository
          .findPostedLinesByAccount({
            companyId,

            accountId:
              account._id,

            to:
              period.to,
          });


      let openingSigned =
        toSignedOpeningBalance(
          account
        );


      let periodDebit = 0;
      let periodCredit = 0;


      for (const line of lines) {

        const journalDate =
          toDateString(
            line.journalDate
          );


        const debit =
          roundMoney(
            line.debit
          );


        const credit =
          roundMoney(
            line.credit
          );


        if (
          journalDate <
          period.from
        ) {

          openingSigned =
            roundMoney(
              openingSigned +
              debit -
              credit
            );

          continue;

        }


        if (
          journalDate >
          period.to
        ) {

          continue;

        }


        periodDebit =
          roundMoney(
            periodDebit +
            debit
          );


        periodCredit =
          roundMoney(
            periodCredit +
            credit
          );

      }


      const closingSigned =
        roundMoney(
          openingSigned +
          periodDebit -
          periodCredit
        );


      rows.push({

        accountId:
          account._id,

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


        openingBalance:
          toDebitCreditBalance(
            openingSigned
          ),


        periodDebit,

        periodCredit,


        closingBalance:
          toDebitCreditBalance(
            closingSigned
          ),

      });

    }


    const totals =
      calculateTotals(
        rows
      );


    return {

      companyId,

      period,

      accounts:
        rows,

      totals,

    };

  }

}
