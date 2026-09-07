const RECEIVABLE_TYPE = "accounts_receivable";
const PAYABLE_TYPE = "accounts_payable";

const SUPPORTED_TYPES =
  new Set([
    "receivable",
    "payable",
  ]);


function toSignedBalance(balance) {
  if (!balance) {
    return 0;
  }

  const amount =
    Number(balance.amount || 0);

  return balance.type === "credit"
    ? -amount
    : amount;
}


function isValidDate(value) {
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
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}


function getCurrentDate() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}


function getOutstandingAmount(
  accountType,
  closingBalance
) {

  const signedBalance =
    toSignedBalance(
      closingBalance
    );


  if (
    accountType ===
    RECEIVABLE_TYPE
  ) {
    return signedBalance;
  }


  if (
    accountType ===
    PAYABLE_TYPE
  ) {
    return -signedBalance;
  }


  return 0;
}


export class OutstandingService {

  constructor({
    chartOfAccountRepository,
    generalLedgerService,
  }) {

    this.chartOfAccountRepository =
      chartOfAccountRepository;

    this.generalLedgerService =
      generalLedgerService;

  }


  async getOutstanding({
    companyId,
    query = {},
  }) {

    const {
      type,
      accountId,
    } =
      query;


    if (
      type &&
      !SUPPORTED_TYPES.has(type)
    ) {
      throw new Error(
        "Outstanding type must be receivable or payable."
      );
    }


    const asOf =
      query.asOf ||
      getCurrentDate();


    if (
      !isValidDate(asOf)
    ) {
      throw new Error(
        "asOf must be a valid YYYY-MM-DD date."
      );
    }


    const accounts =
      await this.chartOfAccountRepository.list({
        companyId,
      });


    const outstandingAccounts =
      accounts.filter(
        (account) =>
          account.accountType ===
            RECEIVABLE_TYPE ||
          account.accountType ===
            PAYABLE_TYPE
      );


    let selectedAccounts =
      outstandingAccounts;


    if (type === "receivable") {
      selectedAccounts =
        selectedAccounts.filter(
          (account) =>
            account.accountType ===
            RECEIVABLE_TYPE
        );
    }


    if (type === "payable") {
      selectedAccounts =
        selectedAccounts.filter(
          (account) =>
            account.accountType ===
            PAYABLE_TYPE
        );
    }


    if (accountId) {

      const selectedAccount =
        outstandingAccounts.find(
          (account) =>
            String(account._id) ===
            String(accountId)
        );


      if (!selectedAccount) {
        throw new Error(
          "Selected account must be a Receivable or Payable account."
        );
      }


      if (
        type === "receivable" &&
        selectedAccount.accountType !==
          RECEIVABLE_TYPE
      ) {
        throw new Error(
          "Selected account must be a Receivable account."
        );
      }


      if (
        type === "payable" &&
        selectedAccount.accountType !==
          PAYABLE_TYPE
      ) {
        throw new Error(
          "Selected account must be a Payable account."
        );
      }


      selectedAccounts = [
        selectedAccount,
      ];

    }


    const receivableAccounts =
      selectedAccounts.filter(
        (account) =>
          account.accountType ===
          RECEIVABLE_TYPE
      );


    const payableAccounts =
      selectedAccounts.filter(
        (account) =>
          account.accountType ===
          PAYABLE_TYPE
      );


    const buildRows =
      async (
        accountsToBuild
      ) => {

        const rows = [];

        for (
          const account
          of accountsToBuild
        ) {

          const ledger =
            await this.generalLedgerService
              .getAccountLedger({
                companyId,
                accountId:
                  String(account._id),
                query: {
                  to: asOf,
                },
              });


          rows.push({
  accountId:
    String(account._id),

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

  debitMovement:
    Number(
      ledger.totals?.debit || 0
    ),

  creditMovement:
    Number(
      ledger.totals?.credit || 0
    ),

  closingBalance:
    ledger.closingBalance,

  balanceType:
    ledger.closingBalance?.type || null,

  entries:
    Array.isArray(ledger.entries)
      ? ledger.entries
      : [],

  outstanding:
    getOutstandingAmount(
      account.accountType,
      ledger.closingBalance
    ),
});

        }

        return rows;

      };


    const receivables =
      await buildRows(
        receivableAccounts
      );


    const payables =
      await buildRows(
        payableAccounts
      );


    return {
      asOf,

      receivables: {
        accounts:
          receivables,

        total:
          receivables.reduce(
            (sum, account) =>
              sum +
              Number(
                account.outstanding || 0
              ),
            0
          ),
      },

      payables: {
        accounts:
          payables,

        total:
          payables.reduce(
            (sum, account) =>
              sum +
              Number(
                account.outstanding || 0
              ),
            0
          ),
      },
    };

  }

}


export default OutstandingService;
