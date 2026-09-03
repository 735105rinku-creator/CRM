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


        const account =
            await this.chartOfAccountRepository
                .findChartOfAccountById({
                    companyId,
                    accountId,
                });


        if (
            !account
        ) {

            throw new Error(
                "Chart of Account not found."
            );

        }


        const journalLines =
            await this.journalEntryRepository
                .findPostedLinesByAccount({
                    companyId,
                    accountId,
                    query,
                });


        const normalizedLines =
            Array.isArray(
                journalLines
            )
                ? [...journalLines]
                : [];


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


        let signedBalance =
            openingType ===
                "credit"
                ? -openingAmount
                : openingAmount;


        let totalDebit =
            0;


        let totalCredit =
            0;


        const entries =
            normalizedLines.map(
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


        const closingBalance =
            this.toBalance(
                signedBalance
            );


        return {

            account,

            openingBalance: {
                amount:
                    openingAmount,

                type:
                    openingType,
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


        if (
            typeof this
                .chartOfAccountRepository
                .findChartOfAccounts !==
            "function"
        ) {

            throw new Error(
                "Chart of Account list repository is not configured."
            );

        }


        const accountResults =
            await this.chartOfAccountRepository
                .findChartOfAccounts({
                    companyId,
                    ...query,
                });


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
                        ledger.totals?.debit ||
                        0
                    )
                );


            totalCredit =
                this.roundMoney(
                    totalCredit +
                    Number(
                        ledger.totals?.credit ||
                        0
                    )
                );


            ledgerAccounts.push({

                _id:
                    account._id,

                accountId:
                    account._id,

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
       REPOSITORY CONTRACTS
    ========================================================= */

    assertAccountRepository() {

        if (
            !this.chartOfAccountRepository ||
            typeof this
                .chartOfAccountRepository
                .findChartOfAccountById !==
            "function"
        ) {

            throw new Error(
                "Chart of Account repository is not configured."
            );

        }

    }


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


const generalLedgerService =
    new GeneralLedgerService();


export default generalLedgerService;