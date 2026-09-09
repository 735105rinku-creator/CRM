import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


/* ============================================================
   TEST IDS
============================================================ */

const companyId =
  "64b000000000000000000099";

const userId =
  "64b000000000000000000098";

const cashAccountId =
  "64b000000000000000000001";

const salesAccountId =
  "64b000000000000000000002";


/* ============================================================
   MOCK ACCOUNTS
============================================================ */

const accounts = {

  [cashAccountId]: {
    _id:
      cashAccountId,

    companyId,

    accountCode:
      "1001",

    accountName:
      "Cash",

    nature:
      "asset",

    status:
      "active",

    allowManualEntry:
      true,
  },


  [salesAccountId]: {
    _id:
      salesAccountId,

    companyId,

    accountCode:
      "4001",

    accountName:
      "Sales",

    nature:
      "income",

    status:
      "active",

    allowManualEntry:
      true,
  },

};


/* ============================================================
   VALID PAYLOAD
============================================================ */

const validPayload =
  () => ({

    journalDate:
      "2026-09-02",

    narration:
      "Cash sales",

    referenceType:
      "manual",

    referenceNo:
      "MANUAL-001",

    lines: [

      {
        accountId:
          cashAccountId,

        description:
          "Cash received",

        debit:
          1000,

        credit:
          0,
      },

      {
        accountId:
          salesAccountId,

        description:
          "Sales income",

        debit:
          0,

        credit:
          1000,
      },

    ],

  });


/* ============================================================
   MOCK FACTORY
============================================================ */

const createMocks =
  () => {

    let createdPayload =
      null;


    const journalRepository = {

      async create(
        payload
      ) {

        createdPayload =
          payload;


        return {
          _id:
            "64b000000000000000000050",

          ...payload,
        };

      },


      async findById() {

        return null;

      },


      async list() {

        return [];

      },


      async updateDraftById() {

        return null;

      },


      async postById() {

        return null;

      },


      async voidById() {

        return null;

      },

    };


    const chartRepository = {

      async findById({
        accountId,
      }) {

        return accounts[
          String(
            accountId
          )
        ] ||
        null;

      },

    };


    return {

      journalRepository,

      chartRepository,

      getCreatedPayload:
        () =>
          createdPayload,

    };

  };


/* ============================================================
   JOURNAL ENTRY SERVICE
============================================================ */

describe(
  "Journal Entry Service",
  () => {

    test(
      "exports service class and default service instance",
      async () => {

        let module;


        try {

          module =
            await import(
              "../services/journalEntry.service.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entry service must exist: ${error.message}`
          );

        }


        assert.equal(
          typeof module.JournalEntryService,
          "function"
        );


        assert.ok(
          module.default
        );

      }
    );


    test(
      "provides Journal CRUD and workflow service methods",
      async () => {

        const {
          JournalEntryService,
        } =
          await import(
            "../services/journalEntry.service.js"
          );


        const mocks =
          createMocks();


        const service =
          new JournalEntryService({
            journalRepository:
              mocks.journalRepository,

            chartRepository:
              mocks.chartRepository,
          });


        const requiredMethods = [

          "createJournal",

          "listJournals",

          "getJournal",

          "updateJournal",

          "postJournal",

          "voidJournal",

        ];


        for (
          const method of
            requiredMethods
        ) {

          assert.equal(
            typeof service[
              method
            ],
            "function",
            `Missing Journal service method: ${method}`
          );

        }

      }
    );


    test(
      "creates account snapshots and server-calculated totals",
      async () => {

        const {
          JournalEntryService,
        } =
          await import(
            "../services/journalEntry.service.js"
          );


        const mocks =
          createMocks();


        const service =
          new JournalEntryService({
            journalRepository:
              mocks.journalRepository,

            chartRepository:
              mocks.chartRepository,
          });


        await service
          .createJournal({

            companyId,

            userId,

            payload:
              validPayload(),

          });


        const created =
          mocks
            .getCreatedPayload();


        assert.ok(
          created
        );


        assert.match(
          created.journalNumber,
          /^JV-20260902-[A-F0-9]{8}$/
        );


        assert.equal(
          created.status,
          "draft"
        );


        assert.equal(
          created.totalDebit,
          1000
        );


        assert.equal(
          created.totalCredit,
          1000
        );


        assert.equal(
          created.companyId,
          companyId
        );


        assert.equal(
          created.createdBy,
          userId
        );


        assert.equal(
          created.updatedBy,
          userId
        );


        assert.equal(
          created.lines[0]
            .accountCode,
          "1001"
        );


        assert.equal(
          created.lines[0]
            .accountName,
          "Cash"
        );


        assert.equal(
          created.lines[1]
            .accountCode,
          "4001"
        );


        assert.equal(
          created.lines[1]
            .accountName,
          "Sales"
        );

      }
    );


    test(
      "rejects an inactive account",
      async () => {

        const {
          JournalEntryService,
        } =
          await import(
            "../services/journalEntry.service.js"
          );


        const mocks =
          createMocks();


        mocks
          .chartRepository
          .findById =
          async ({
            accountId,
          }) => {

            const account =
              accounts[
                String(
                  accountId
                )
              ];


            if (
              String(
                accountId
              ) ===
              cashAccountId
            ) {

              return {
                ...account,

                status:
                  "inactive",
              };

            }


            return account;

          };


        const service =
          new JournalEntryService({
            journalRepository:
              mocks.journalRepository,

            chartRepository:
              mocks.chartRepository,
          });


        await assert.rejects(

          () =>
            service
              .createJournal({

                companyId,

                userId,

                payload:
                  validPayload(),

              }),

          /inactive|active account/i

        );

      }
    );


    test(
      "rejects an account that does not allow manual entries",
      async () => {

        const {
          JournalEntryService,
        } =
          await import(
            "../services/journalEntry.service.js"
          );


        const mocks =
          createMocks();


        mocks
          .chartRepository
          .findById =
          async ({
            accountId,
          }) => {

            const account =
              accounts[
                String(
                  accountId
                )
              ];


            if (
              String(
                accountId
              ) ===
              salesAccountId
            ) {

              return {
                ...account,

                allowManualEntry:
                  false,
              };

            }


            return account;

          };


        const service =
          new JournalEntryService({
            journalRepository:
              mocks.journalRepository,

            chartRepository:
              mocks.chartRepository,
          });


        await assert.rejects(

          () =>
            service
              .createJournal({

                companyId,

                userId,

                payload:
                  validPayload(),

              }),

          /manual entr/i

        );

      }
    );


    test(
      "rejects an account outside the company or not found",
      async () => {

        const {
          JournalEntryService,
        } =
          await import(
            "../services/journalEntry.service.js"
          );


        const mocks =
          createMocks();


        mocks
          .chartRepository
          .findById =
          async () =>
            null;


        const service =
          new JournalEntryService({
            journalRepository:
              mocks.journalRepository,

            chartRepository:
              mocks.chartRepository,
          });


        await assert.rejects(

          () =>
            service
              .createJournal({

                companyId,

                userId,

                payload:
                  validPayload(),

              }),

          /account.*not found/i

        );

      }
    );

  }
);
test(
  "createJournal forwards Mongo session to the Journal repository",
  async () => {

    const fakeSession = {
      id: "journal-create-session",
    };


    let receivedSession =
      null;


    const journalRepository = {
      async create(
        payload,
        options = {}
      ) {

        receivedSession =
          options.session;

        return {
          _id:
            "64f000000000000000000099",

          ...payload,
        };
      },
    };


    const chartOfAccountRepository = {
      async findById({
        accountId,
      }) {

        return {
          _id:
            accountId,

          companyId:
            "64f000000000000000000001",

          code:
            accountId.endsWith("2")
              ? "EXP001"
              : "BANK001",

          name:
            accountId.endsWith("2")
              ? "Expense"
              : "Bank",

          status:
            "active",

          allowManualEntry:
            true,
        };
      },
    };


    const {
      JournalEntryService,
    } =
      await import(
        "../services/journalEntry.service.js"
      );


    const service =
      new JournalEntryService({
        journalRepository,
        chartRepository:
          chartOfAccountRepository,
      });


    await service.createJournal({
      companyId:
        "64f000000000000000000001",

      userId:
        "64f000000000000000000009",

      session:
        fakeSession,

      payload: {
        journalDate:
          "2026-09-03",

        referenceType:
          "voucher",

        referenceId:
          "64f000000000000000000010",

        referenceNo:
          "PV/2026-27/000001",

        narration:
          "Voucher posting",

        lines: [
          {
            accountId:
              "64f000000000000000000002",

            debit:
              1250,

            credit:
              0,
          },
          {
            accountId:
              "64f000000000000000000003",

            debit:
              0,

            credit:
              1250,
          },
        ],
      },
    });


    assert.equal(
      receivedSession,
      fakeSession
    );

  }
);


test(
  "postJournal forwards Mongo session to the Journal repository",
  async () => {

    const fakeSession = {
      id: "journal-post-service-session",
    };


    let receivedSession =
      null;


    const journalRepository = {
      async postById(input) {

        receivedSession =
          input.session;


        return {
          _id:
            input.journalEntryId,

          status:
            "posted",
        };

      },
    };


    const {
      JournalEntryService,
    } =
      await import(
        "../services/journalEntry.service.js"
      );


    const service =
      new JournalEntryService({
        journalRepository,
      });


    const result =
      await service.postJournal({
        companyId:
          "64f000000000000000000001",

        journalEntryId:
          "64f000000000000000000099",

        userId:
          "64f000000000000000000009",

        session:
          fakeSession,
      });


    assert.equal(
      receivedSession,
      fakeSession
    );


    assert.equal(
      result.status,
      "posted"
    );

  }
);


test(
  "voidJournal forwards Mongo session to the Journal repository",
  async () => {

    const fakeSession = {
      id: "journal-void-service-session",
    };


    let receivedSession =
      null;


    const journalRepository = {
      async voidById(input) {

        receivedSession =
          input.session;


        return {
          _id:
            input.journalEntryId,

          status:
            "void",

          voidReason:
            input.reason,
        };

      },
    };


    const {
      JournalEntryService,
    } =
      await import(
        "../services/journalEntry.service.js"
      );


    const service =
      new JournalEntryService({
        journalRepository,
      });


    const result =
      await service.voidJournal({
        companyId:
          "64f000000000000000000001",

        journalEntryId:
          "64f000000000000000000099",

        userId:
          "64f000000000000000000009",

        reason:
          "Voucher voided",

        session:
          fakeSession,
      });


    assert.equal(
      receivedSession,
      fakeSession
    );


    assert.equal(
      result.status,
      "void"
    );

  }
);

test(
  "createJournal forwards Mongo session to Chart of Account snapshot lookups",
  async () => {

    const fakeSession = {
      id: "journal-chart-session",
    };


    const receivedSessions = [];


    const journalRepository = {
      async create(payload) {
        return {
          _id:
            "64f000000000000000000099",

          ...payload,
        };
      },
    };


    const chartRepository = {
      async findById(input) {

        receivedSessions.push(
          input.session
        );


        return {
          _id:
            input.accountId,

          accountCode:
            input.accountId.endsWith("2")
              ? "EXP001"
              : "BANK001",

          accountName:
            input.accountId.endsWith("2")
              ? "Expense"
              : "Bank",

          status:
            "active",

          allowManualEntry:
            true,
        };

      },
    };


    const {
      JournalEntryService,
    } =
      await import(
        "../services/journalEntry.service.js"
      );


    const service =
      new JournalEntryService({
        journalRepository,
        chartRepository,
      });


    await service.createJournal({
      companyId:
        "64f000000000000000000001",

      userId:
        "64f000000000000000000009",

      session:
        fakeSession,

      payload: {
        journalDate:
          "2026-09-03",

        referenceType:
          "voucher",

        referenceId:
          "64f000000000000000000010",

        referenceNo:
          "PV/2026-27/000001",

        narration:
          "Voucher posting",

        lines: [
          {
            accountId:
              "64f000000000000000000002",

            debit:
              1250,

            credit:
              0,
          },
          {
            accountId:
              "64f000000000000000000003",

            debit:
              0,

            credit:
              1250,
          },
        ],
      },
    });


    assert.equal(
      receivedSessions.length,
      2
    );


    for (
      const receivedSession
      of receivedSessions
    ) {
      assert.equal(
        receivedSession,
        fakeSession
      );
    }

  }
);
