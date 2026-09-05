export class GeneralLedgerService {

    /* =========================================================
       CONSTRUCTOR
    ========================================================= */

    constructor({
        chartOfAccountRepository = null,
        journalEntryRepository = null,
    } = {}) {

        this.chartOfAccountRepository =
            chartOfAccountRepository;

        this.journalEntryRepository =
            journalEntryRepository;

    }


    /* =========================================================
       ACCOUNT LEDGER
    ========================================================= */

    async getAccountLedger({
        companyId,
        accountId,
        query = {},
    } = {}) {

        this.assertRequired(
            companyId,
            "Company ID is required."
        );


        this.assertRequired(
            accountId,
            "Account ID is required."
        );


        this.assertAccountRepository();


        this.assertJournalRepository();


        /* ---------------------------------------------------------
           ACCOUNT REPOSITORY METHOD

           Current real repository:
             findById()

           Older test compatibility:
             findChartOfAccountById()
        --------------------------------------------------------- */

        const findAccountById =
            this.chartOfAccountRepository
                .findById ||
            this.chartOfAccountRepository
                .findChartOfAccountById;


        if (
            typeof findAccountById !==
            "function"
        ) {

            throw new Error(
                "Chart of Account find-by-id repository is not configured."
            );

        }


        const account =
            await findAccountById
                .call(
                    this.chartOfAccountRepository,
                    {
                        companyId,
                        accountId,
                    }
                );


        if (
            !account
        ) {

            throw new Error(
                "Chart of Account not found."
            );

        }


        /* ---------------------------------------------------------
           POSTED JOURNAL LINES

           Ledger must only come from posted Journal Entries.
           Draft / void entries are not used by repository method.
        --------------------------------------------------------- */

        const journalLines =
            await this.journalEntryRepository
                .findPostedLinesByAccount({
                    companyId,
                    accountId,
                    to:
                        query?.to ||
                        null,
                });


        const normalizedLines =
            Array.isArray(
                journalLines
            )
                ? [...journalLines]
                : [];


        /* ---------------------------------------------------------
           SORT CHRONOLOGICALLY
        --------------------------------------------------------- */

        normalizedLines.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    new Date(
                        first.journalDate ||
                        first.transactionDate ||
                        0
                    )
                        .getTime();


                const secondDate =
                    new Date(
                        second.journalDate ||
                        second.transactionDate ||
                        0
                    )
                        .getTime();


                return (
                    firstDate -
                    secondDate
                );

            }
        );


        /* ---------------------------------------------------------
           OPENING BALANCE
        --------------------------------------------------------- */

        const openingAmount =
            this.roundMoney(
                Math.abs(
                    Number(
                        account.openingBalance ||
                        0
                    )
                )
            );


        const openingType =
            account.openingBalanceType ===
                "credit"
                ? "credit"
                : "debit";


        /*
         * Internal signed balance convention:
         *
         * Debit  = positive
         * Credit = negative
         */

        let signedBalance =
            openingType ===
                "credit"
                ? -openingAmount
                : openingAmount;


        const fromTime =
            query?.from
                ? new Date(
                    query.from
                ).getTime()
                : null;


        let toTime =
            null;


        if (query?.to) {

            const endDate =
                new Date(
                    query.to
                );


            endDate.setHours(
                23,
                59,
                59,
                999
            );


            toTime =
                endDate.getTime();

        }


        const periodLines =
            [];


        for (
            const line of normalizedLines
        ) {

            const lineTime =
                new Date(
                    line.journalDate ||
                    line.transactionDate ||
                    0
                )
                    .getTime();


            const debit =
                this.roundMoney(
                    Number(
                        line.debit ||
                        0
                    )
                );


            const credit =
                this.roundMoney(
                    Number(
                        line.credit ||
                        0
                    )
                );


            if (
                fromTime !== null &&
                lineTime < fromTime
            ) {

                signedBalance =
                    this.roundMoney(
                        signedBalance +
                        debit -
                        credit
                    );


                continue;

            }


            if (
                toTime !== null &&
                lineTime > toTime
            ) {

                continue;

            }


            periodLines.push(
                line
            );

        }


        const periodOpeningBalance =
            this.toBalance(
                signedBalance
            );


        let totalDebit =
            0;


        let totalCredit =
            0;


        /* ---------------------------------------------------------
           RUNNING BALANCE
        --------------------------------------------------------- */

        const entries =
            periodLines.map(
                (
                    line
                ) => {

                    const debit =
                        this.roundMoney(
                            Number(
                                line.debit ||
                                0
                            )
                        );


                    const credit =
                        this.roundMoney(
                            Number(
                                line.credit ||
                                0
                            )
                        );


                    totalDebit =
                        this.roundMoney(
                            totalDebit +
                            debit
                        );


                    totalCredit =
                        this.roundMoney(
                            totalCredit +
                            credit
                        );


                    signedBalance =
                        this.roundMoney(
                            signedBalance +
                            debit -
                            credit
                        );


                    const balance =
                        this.toBalance(
                            signedBalance
                        );


                    return {

                        ...line,

                        debit,

                        credit,

                        runningBalance:
                            balance.amount,

                        balanceType:
                            balance.type,

                    };

                }
            );


        /* ---------------------------------------------------------
           CLOSING BALANCE
        --------------------------------------------------------- */

        const closingBalance =
            this.toBalance(
                signedBalance
            );


        return {

            account,

            openingBalance: {

                amount:
                    periodOpeningBalance.amount,

                type:
                    periodOpeningBalance.type,

            },

            entries,

            totals: {

                debit:
                    this.roundMoney(
                        totalDebit
                    ),

                credit:
                    this.roundMoney(
                        totalCredit
                    ),

            },

            closingBalance,

        };

    }


    /* =========================================================
       GENERAL LEDGER
    ========================================================= */

    async getGeneralLedger({
        companyId,
        query = {},
    } = {}) {

        this.assertRequired(
            companyId,
            "Company ID is required."
        );


        this.assertAccountRepository();


        this.assertJournalRepository();


        /* ---------------------------------------------------------
           ACCOUNT LIST REPOSITORY METHOD

           Current real repository:
             list()

           Older test compatibility:
             findChartOfAccounts()
        --------------------------------------------------------- */

        const listAccounts =
            this.chartOfAccountRepository
                .list ||
            this.chartOfAccountRepository
                .findChartOfAccounts;


        if (
            typeof listAccounts !==
            "function"
        ) {

            throw new Error(
                "Chart of Account list repository is not configured."
            );

        }


        const accountResults =
            await listAccounts
                .call(
                    this.chartOfAccountRepository,
                    {
                        companyId,
                        ...query,
                    }
                );


        const accounts =
            Array.isArray(
                accountResults
            )
                ? accountResults
                : [];


        let totalDebit =
            0;


        let totalCredit =
            0;


        const ledgerAccounts =
            [];


        /* ---------------------------------------------------------
           CALCULATE EACH ACCOUNT LEDGER
        --------------------------------------------------------- */

        for (
            const account of accounts
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
                await this.getAccountLedger({
                    companyId,
                    accountId,
                    query,
                });


            totalDebit =
                this.roundMoney(
                    totalDebit +
                    Number(
                        ledger.totals
                            ?.debit ||
                        0
                    )
                );


            totalCredit =
                this.roundMoney(
                    totalCredit +
                    Number(
                        ledger.totals
                            ?.credit ||
                        0
                    )
                );


            ledgerAccounts.push({

                _id:
                    account._id,

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

                totalDebit:
                    ledger.totals.debit,

                totalCredit:
                    ledger.totals.credit,

                closingBalance:
                    ledger.closingBalance,

            });

        }


        /* ---------------------------------------------------------
           SUMMARY
        --------------------------------------------------------- */

        return {

            accounts:
                ledgerAccounts,

            summary: {

                totalAccounts:
                    ledgerAccounts.length,

                totalDebit:
                    this.roundMoney(
                        totalDebit
                    ),

                totalCredit:
                    this.roundMoney(
                        totalCredit
                    ),

            },

        };

    }


    /* =========================================================
       BALANCE NORMALIZATION
    ========================================================= */

    toBalance(
        signedBalance
    ) {

        const normalized =
            this.roundMoney(
                signedBalance
            );


        if (
            normalized <
            0
        ) {

            return {

                amount:
                    this.roundMoney(
                        Math.abs(
                            normalized
                        )
                    ),

                type:
                    "credit",

            };

        }


        return {

            amount:
                normalized,

            type:
                "debit",

        };

    }


    /* =========================================================
       MONEY
    ========================================================= */

    roundMoney(
        value
    ) {

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

    }


    /* =========================================================
       REQUIRED VALUE
    ========================================================= */

    assertRequired(
        value,
        message
    ) {

        if (
            value ===
            undefined ||
            value ===
            null ||
            String(
                value
            )
                .trim() ===
            ""
        ) {

            throw new Error(
                message
            );

        }

    }


    /* =========================================================
       ACCOUNT REPOSITORY CONTRACT
    ========================================================= */

    assertAccountRepository() {

        const repository =
            this.chartOfAccountRepository;


        const hasFindById =
            typeof repository
                ?.findById ===
                "function" ||
            typeof repository
                ?.findChartOfAccountById ===
                "function";


        if (
            !repository ||
            !hasFindById
        ) {

            throw new Error(
                "Chart of Account repository is not configured."
            );

        }

    }


    /* =========================================================
       JOURNAL REPOSITORY CONTRACT
    ========================================================= */

    assertJournalRepository() {

        if (
            !this.journalEntryRepository ||
            typeof this
                .journalEntryRepository
                .findPostedLinesByAccount !==
            "function"
        ) {

            throw new Error(
                "Journal Entry repository is not configured."
            );

        }

    }

}


/* =========================================================
   DEFAULT SERVICE INSTANCE

   Kept for compatibility.
   Runtime controller creates an injected service instance using
   the real repository dependencies.
========================================================= */

const generalLedgerService =
    new GeneralLedgerService();


export default generalLedgerService;
