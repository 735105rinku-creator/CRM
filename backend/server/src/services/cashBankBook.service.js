const roundMoney = (value) => {
  return (
    Math.round(
      (
        Number(value || 0) +
        Number.EPSILON
      ) *
        100
    ) /
    100
  );
};


const toSignedBalance =
  (balance) => {

    const amount =
      Number(
        balance?.amount ||
        0
      );


    return (
      balance?.type ===
        "credit"
        ? -amount
        : amount
    );

  };


const CASH_BANK_TYPES =
  new Set([
    "cash",
    "bank",
  ]);


const isValidDate =
  (value) => {

    if (
      typeof value !==
        "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {

      return false;

    }


    const [
      year,
      month,
      day
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
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() ===
        day
    );

  };


export class CashBankBookService {

  constructor({
    chartOfAccountRepository = null,
    generalLedgerService = null,
  } = {}) {

    this.chartOfAccountRepository =
      chartOfAccountRepository;

    this.generalLedgerService =
      generalLedgerService;

  }


  async getCashBankBook({
    companyId,
    query = {},
  } = {}) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );

    }


    if (
      !this.chartOfAccountRepository ||
      typeof this
        .chartOfAccountRepository
        .list !==
        "function"
    ) {

      throw new Error(
        "Chart of Account repository is not configured."
      );

    }


    if (
      !this.generalLedgerService ||
      typeof this
        .generalLedgerService
        .getAccountLedger !==
        "function"
    ) {

      throw new Error(
        "General Ledger service is not configured."
      );

    }


    const accountResults =
      await this
        .chartOfAccountRepository
        .list({
          companyId,
        });


    const accounts =
      Array.isArray(
        accountResults
      )
        ? accountResults
        : [];


    const requestedAccountId =
      query?.accountId
        ? String(
            query.accountId
          )
        : null;


    let cashBankAccounts =
      accounts.filter(
        (account) =>
          CASH_BANK_TYPES.has(
            account?.accountType
          )
      );


    if (
      requestedAccountId
    ) {

      const selectedAccount =
        accounts.find(
          (account) =>
            String(
              account?._id ||
              account?.id ||
              ""
            ) ===
            requestedAccountId
        );


      if (
        !selectedAccount ||
        !CASH_BANK_TYPES.has(
          selectedAccount.accountType
        )
      ) {

        throw new Error(
          "Selected account must be a Cash or Bank account."
        );

      }


      cashBankAccounts =
        cashBankAccounts.filter(
          (account) =>
            String(
              account?._id ||
              account?.id ||
              ""
            ) ===
            requestedAccountId
        );

    }


    const {
      accountId: ignoredAccountId,
      ...requestedLedgerQuery
    } =
      query || {};


    let ledgerQuery = {
      ...requestedLedgerQuery,
    };


    if (
      !ledgerQuery.from &&
      !ledgerQuery.to
    ) {

      const now =
        new Date();


      const currentYear =
        now.getFullYear();


      const currentMonth =
        now.getMonth() + 1;


      const financialYearStartYear =
        currentMonth >= 4
          ? currentYear
          : currentYear - 1;


      ledgerQuery = {
        ...ledgerQuery,

        from:
          `${financialYearStartYear}-04-01`,

        to:
          `${financialYearStartYear + 1}-03-31`,
      };

    }


    if (
      ledgerQuery.from &&
      !isValidDate(
        ledgerQuery.from
      )
    ) {

      throw new Error(
        "From date must be a valid YYYY-MM-DD date."
      );

    }


    if (
      ledgerQuery.to &&
      !isValidDate(
        ledgerQuery.to
      )
    ) {

      throw new Error(
        "To date must be a valid YYYY-MM-DD date."
      );

    }


    if (
      ledgerQuery.from &&
      ledgerQuery.to &&
      ledgerQuery.from >
        ledgerQuery.to
    ) {

      throw new Error(
        "From date must not be after To date."
      );

    }


    const resultAccounts =
      [];

    let totalOpening =
      0;

    let totalDebit =
      0;

    let totalCredit =
      0;

    let totalClosing =
      0;


    for (
      const account
      of cashBankAccounts
    ) {

      const accountId =
        String(
          account?._id ||
          account?.id ||
          ""
        );


      if (
        !accountId
      ) {

        continue;

      }


      const ledger =
        await this
          .generalLedgerService
          .getAccountLedger({
            companyId,
            accountId,
            query:
              ledgerQuery,
          });


      totalOpening =
        roundMoney(
          totalOpening +
          toSignedBalance(
            ledger
              ?.openingBalance
          )
        );


      totalDebit =
        roundMoney(
          totalDebit +
          Number(
            ledger
              ?.totals
              ?.debit ||
            0
          )
        );


      totalCredit =
        roundMoney(
          totalCredit +
          Number(
            ledger
              ?.totals
              ?.credit ||
            0
          )
        );


      totalClosing =
        roundMoney(
          totalClosing +
          toSignedBalance(
            ledger
              ?.closingBalance
          )
        );


      resultAccounts.push({
        accountId:
          account._id ||
          account.id,

        accountCode:
          account.accountCode,

        accountName:
          account.accountName,

        accountType:
          account.accountType,

        nature:
          account.nature,

        status:
          account.status,

        openingBalance:
          ledger.openingBalance,

        entries:
          ledger.entries || [],

        totalDebit:
          roundMoney(
            ledger
              ?.totals
              ?.debit
          ),

        totalCredit:
          roundMoney(
            ledger
              ?.totals
              ?.credit
          ),

        closingBalance:
          ledger.closingBalance,
      });

    }


    return {
      accounts:
        resultAccounts,

      summary: {
        totalAccounts:
          resultAccounts.length,

        totalOpening:
          roundMoney(
            totalOpening
          ),

        totalDebit:
          roundMoney(
            totalDebit
          ),

        totalCredit:
          roundMoney(
            totalCredit
          ),

        totalClosing:
          roundMoney(
            totalClosing
          ),
      },
    };

  }

}


export default CashBankBookService;
