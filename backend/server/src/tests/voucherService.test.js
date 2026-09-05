import assert from "node:assert/strict";
import { test } from "node:test";
import {
  existsSync,
} from "node:fs";

const servicePath =
  new URL(
    "../services/voucher.service.js",
    import.meta.url
  );


async function loadService() {

  assert.equal(
    existsSync(servicePath),
    true,
    "src/services/voucher.service.js must exist"
  );

  return import(
    servicePath.href
  );
}


test(
  "resolves India-style financial year boundaries",
  async () => {

    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository: {},
      });


    assert.equal(
      service.resolveFinancialYear(
        "2026-04-01"
      ),
      "2026-27"
    );


    assert.equal(
      service.resolveFinancialYear(
        "2027-03-31"
      ),
      "2026-27"
    );


    assert.equal(
      service.resolveFinancialYear(
        "2027-04-01"
      ),
      "2027-28"
    );

  }
);


test(
  "builds the next Tally-style voucher number",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async findLastVoucherNumber(
        query
      ) {

        receivedQuery =
          query;


        return {
          voucherNumber:
            "PV/2026-27/000041",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucherNumber =
      await service
        .buildVoucherNumber({

          companyId:
            "64f000000000000000000001",

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

        });


    assert.equal(
      voucherNumber,
      "PV/2026-27/000042"
    );


    assert.deepEqual(
      receivedQuery,
      {

        companyId:
          "64f000000000000000000001",

        financialYear:
          "2026-27",

        voucherType:
          "payment",

        prefix:
          "PV",

      }
    );

  }
);


test(
  "starts a voucher type sequence at 000001",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {

        return null;
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucherNumber =
      await service
        .buildVoucherNumber({

          companyId:
            "64f000000000000000000001",

          voucherType:
            "journal",

          voucherDate:
            "2026-04-01",

        });


    assert.equal(
      voucherNumber,
      "JV/2026-27/000001"
    );

  }
);

test(
  "lists vouchers with company-scoped query",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async list(
        query
      ) {

        receivedQuery =
          query;

        return [];
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const result =
      await service.getVouchers({

        companyId:
          "64f000000000000000000001",

        query: {
          voucherType:
            "payment",

          status:
            "draft",
        },

      });


    assert.deepEqual(
      result,
      []
    );


    assert.deepEqual(
      receivedQuery,
      {
        companyId:
          "64f000000000000000000001",

        voucherType:
          "payment",

        status:
          "draft",
      }
    );

  }
);


test(
  "gets one company-scoped voucher by id",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async findById(
        query
      ) {

        receivedQuery =
          query;

        return {
          _id:
            query.voucherId,

          voucherNumber:
            "JV/2026-27/000001",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucher =
      await service.getVoucherById({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",

      });


    assert.equal(
      voucher.voucherNumber,
      "JV/2026-27/000001"
    );


    assert.deepEqual(
      receivedQuery,
      {
        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",
      }
    );

  }
);


test(
  "creates a draft voucher with financial year, generated number and derived totals",
  async () => {

    let createPayload =
      null;


    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },


      async create(
        payload
      ) {

        createPayload =
          payload;

        return payload;
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
      });


    const result =
      await service.createVoucher({

        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

          narration:
            "Office payment",

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
      result.voucherNumber,
      "PV/2026-27/000001"
    );


    assert.equal(
      createPayload.financialYear,
      "2026-27"
    );


    assert.equal(
      createPayload.status,
      "draft"
    );


    assert.equal(
      createPayload.totalDebit,
      1250
    );


    assert.equal(
      createPayload.totalCredit,
      1250
    );


    assert.equal(
      createPayload.createdBy,
      "64f000000000000000000009"
    );


    assert.equal(
      createPayload.updatedBy,
      "64f000000000000000000009"
    );

  }
);


test(
  "updates only through the repository draft update contract",
  async () => {

    let receivedUpdate =
      null;


    const voucherRepository = {

      async updateDraftById(
        input
      ) {

        receivedUpdate =
          input;

        return {
          _id:
            input.voucherId,

          status:
            "draft",

          ...input.payload,
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const result =
      await service.updateDraftVoucher({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",

        userId:
          "64f000000000000000000009",

        payload: {
          narration:
            "Updated voucher narration",
        },

      });


    assert.equal(
      result.status,
      "draft"
    );


    assert.equal(
      receivedUpdate.companyId,
      "64f000000000000000000001"
    );


    assert.equal(
      receivedUpdate.voucherId,
      "64f000000000000000000002"
    );


    assert.equal(
      receivedUpdate.payload.updatedBy,
      "64f000000000000000000009"
    );

  }
);

test(
  "posts a draft Voucher through JournalEntry and links the posted Journal",
  async () => {

    const calls = [];


    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        calls.push(
          "findVoucher"
        );


        return {
          _id:
            voucherId,

          companyId,

          voucherNumber:
            "PV/2026-27/000001",

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

          narration:
            "Office payment",

          status:
            "draft",

          lines: [
            {
              accountId:
                "64f000000000000000000002",

              description:
                "Electricity expense",

              debit:
                1250,

              credit:
                0,
            },
            {
              accountId:
                "64f000000000000000000003",

              description:
                "Bank payment",

              debit:
                0,

              credit:
                1250,
            },
          ],
        };
      },


      async postById(
        input
      ) {

        calls.push(
          "postVoucher"
        );


        return {
          _id:
            input.voucherId,

          status:
            "posted",

          journalEntryId:
            input.journalEntryId,
        };
      },

    };


    let createJournalInput =
      null;

    let postJournalInput =
      null;


    const journalService = {

      async createJournal(
        input
      ) {

        calls.push(
          "createJournal"
        );


        createJournalInput =
          input;


        return {
          _id:
            "64f000000000000000000099",

          status:
            "draft",
        };
      },


      async postJournal(
        input
      ) {

        calls.push(
          "postJournal"
        );


        postJournalInput =
          input;


        return {
          _id:
            input.journalEntryId,

          status:
            "posted",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const sessionProvider = {
      async startSession() {
        return {
          async withTransaction(callback) {
            return callback();
          },

          async endSession() {
          },
        };
      },
    };


    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
        journalService,
        sessionProvider,
      });


    const result =
      await service.postVoucher({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000010",

        userId:
          "64f000000000000000000009",

      });


    assert.deepEqual(
      calls,
      [
        "findVoucher",
        "createJournal",
        "postJournal",
        "postVoucher",
      ]
    );


    assert.equal(
      createJournalInput.companyId,
      "64f000000000000000000001"
    );


    assert.equal(
      createJournalInput.userId,
      "64f000000000000000000009"
    );


    assert.equal(
      createJournalInput.payload.referenceType,
      "voucher"
    );


    assert.equal(
      createJournalInput.payload.referenceId,
      "64f000000000000000000010"
    );


    assert.equal(
      createJournalInput.payload.referenceNo,
      "PV/2026-27/000001"
    );


    assert.equal(
      createJournalInput.payload.journalDate,
      "2026-09-03"
    );


    assert.deepEqual(
      createJournalInput.payload.lines,
      [
        {
          accountId:
            "64f000000000000000000002",

          description:
            "Electricity expense",

          debit:
            1250,

          credit:
            0,
        },
        {
          accountId:
            "64f000000000000000000003",

          description:
            "Bank payment",

          debit:
            0,

          credit:
            1250,
        },
      ]
    );


    assert.equal(
      postJournalInput.companyId,
      "64f000000000000000000001"
    );


    assert.equal(
      postJournalInput.journalEntryId,
      "64f000000000000000000099"
    );


    assert.equal(
      postJournalInput.userId,
      "64f000000000000000000009"
    );


    assert.ok(
      postJournalInput.session
    );


    assert.equal(
      result.status,
      "posted"
    );


    assert.equal(
      result.journalEntryId,
      "64f000000000000000000099"
    );

  }
);

test(
  "postVoucher runs the complete posting workflow inside one Mongo session",
  async () => {

    const session = {
      async withTransaction(callback) {
        session.withTransactionCount += 1;
        return callback();
      },

      async endSession() {
        session.endSessionCount += 1;
      },

      withTransactionCount: 0,
      endSessionCount: 0,
    };


    const sessionProvider = {
      startSessionCount: 0,

      async startSession() {
        this.startSessionCount += 1;
        return session;
      },
    };


    const receivedSessions = [];


    const voucherRepository = {
      async findById(input) {
        receivedSessions.push(input.session);

        return {
          _id: "64f000000000000000000010",
          companyId: input.companyId,
          voucherNumber: "PV/2026-27/000001",
          voucherType: "payment",
          voucherDate: "2026-09-03",
          narration: "Office payment",
          status: "draft",
          lines: [
            {
              accountId: "64f000000000000000000002",
              description: "Expense",
              debit: 1250,
              credit: 0,
            },
            {
              accountId: "64f000000000000000000003",
              description: "Bank",
              debit: 0,
              credit: 1250,
            },
          ],
        };
      },

      async postById(input) {
        receivedSessions.push(input.session);

        return {
          _id: input.voucherId,
          status: "posted",
          journalEntryId: input.journalEntryId,
        };
      },
    };


    const journalService = {
      async createJournal(input) {
        receivedSessions.push(input.session);

        return {
          _id: "64f000000000000000000099",
          status: "draft",
        };
      },

      async postJournal(input) {
        receivedSessions.push(input.session);

        return {
          _id: input.journalEntryId,
          status: "posted",
        };
      },
    };


    const {
      VoucherService,
    } = await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
        journalService,
        sessionProvider,
      });


    await service.postVoucher({
      companyId: "64f000000000000000000001",
      voucherId: "64f000000000000000000010",
      userId: "64f000000000000000000009",
    });


    assert.equal(
      sessionProvider.startSessionCount,
      1
    );


    assert.equal(
      session.withTransactionCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );


    assert.equal(
      receivedSessions.length,
      4
    );


    for (
      const receivedSession
      of receivedSessions
    ) {
      assert.equal(
        receivedSession,
        session
      );
    }

  }
);



test(
  "postVoucher aborts the transaction when Voucher posting fails after Journal posting",
  async () => {

    const session = {
      abortCount: 0,
      endSessionCount: 0,

      async withTransaction(callback) {
        try {
          return await callback();
        } catch (error) {
          this.abortCount += 1;
          throw error;
        }
      },

      async endSession() {
        this.endSessionCount += 1;
      },
    };


    const sessionProvider = {
      async startSession() {
        return session;
      },
    };


    const calls = [];


    const voucherRepository = {
      async findById(input) {
        calls.push(
          "findVoucher"
        );

        return {
          _id:
            input.voucherId,

          companyId:
            input.companyId,

          voucherNumber:
            "PV/2026-27/000001",

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

          narration:
            "Office payment",

          status:
            "draft",

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
        };
      },

      async postById() {
        calls.push(
          "postVoucher"
        );

        return null;
      },
    };


    const journalService = {
      async createJournal() {
        calls.push(
          "createJournal"
        );

        return {
          _id:
            "64f000000000000000000099",

          status:
            "draft",
        };
      },

      async postJournal() {
        calls.push(
          "postJournal"
        );

        return {
          _id:
            "64f000000000000000000099",

          status:
            "posted",
        };
      },
    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
        journalService,
        sessionProvider,
      });


    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",
        }),

      /Voucher not found or cannot be posted/
    );


    assert.deepEqual(
      calls,
      [
        "findVoucher",
        "createJournal",
        "postJournal",
        "postVoucher",
      ]
    );


    assert.equal(
      session.abortCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );

  }
);

test(
  "postVoucher aborts transaction and never posts Voucher when Journal posting fails",
  async () => {

    const session = {
      abortCount: 0,
      endSessionCount: 0,

      async withTransaction(callback) {
        try {
          return await callback();
        } catch (error) {
          this.abortCount += 1;
          throw error;
        }
      },

      async endSession() {
        this.endSessionCount += 1;
      },
    };


    const sessionProvider = {
      async startSession() {
        return session;
      },
    };


    let voucherPostCount =
      0;


    const voucherRepository = {
      async findById(input) {
        return {
          _id:
            input.voucherId,

          companyId:
            input.companyId,

          voucherNumber:
            "PV/2026-27/000001",

          voucherDate:
            "2026-09-03",

          narration:
            "Office payment",

          status:
            "draft",

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
        };
      },

      async postById() {
        voucherPostCount += 1;

        return {
          status:
            "posted",
        };
      },
    };


    const journalService = {
      async createJournal() {
        return {
          _id:
            "64f000000000000000000099",

          status:
            "draft",
        };
      },

      async postJournal() {
        throw new Error(
          "Journal posting failed."
        );
      },
    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        journalService,
        sessionProvider,
      });


    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",
        }),

      /Journal posting failed/
    );


    assert.equal(
      voucherPostCount,
      0
    );


    assert.equal(
      session.abortCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );

  }
);

test(
  "voidVoucher voids the linked JournalEntry and Voucher inside one transaction",
  async () => {

    const session = {
      withTransactionCount: 0,
      endSessionCount: 0,

      async withTransaction(callback) {
        this.withTransactionCount += 1;
        return callback();
      },

      async endSession() {
        this.endSessionCount += 1;
      },
    };


    const sessionProvider = {
      startSessionCount: 0,

      async startSession() {
        this.startSessionCount += 1;
        return session;
      },
    };


    const calls = [];
    const receivedSessions = [];


    const voucherRepository = {

      async findById(input) {

        calls.push(
          "findVoucher"
        );

        receivedSessions.push(
          input.session
        );


        return {
          _id:
            input.voucherId,

          companyId:
            input.companyId,

          voucherNumber:
            "PV/2026-27/000001",

          status:
            "posted",

          journalEntryId:
            "64f000000000000000000099",
        };

      },


      async voidById(input) {

        calls.push(
          "voidVoucher"
        );

        receivedSessions.push(
          input.session
        );


        return {
          _id:
            input.voucherId,

          status:
            "void",

          journalEntryId:
            "64f000000000000000000099",

          voidReason:
            input.reason,
        };

      },

    };


    const journalService = {

      async voidJournal(input) {

        calls.push(
          "voidJournal"
        );

        receivedSessions.push(
          input.session
        );


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
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        journalService,
        sessionProvider,
      });


    const result =
      await service.voidVoucher({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000010",

        userId:
          "64f000000000000000000009",

        reason:
          "Incorrect payment entry",

      });


    assert.deepEqual(
      calls,
      [
        "findVoucher",
        "voidJournal",
        "voidVoucher",
      ]
    );


    assert.equal(
      sessionProvider.startSessionCount,
      1
    );


    assert.equal(
      session.withTransactionCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );


    for (
      const receivedSession
      of receivedSessions
    ) {
      assert.equal(
        receivedSession,
        session
      );
    }


    assert.equal(
      result.status,
      "void"
    );


    assert.equal(
      result.voidReason,
      "Incorrect payment entry"
    );

  }
);

test(
  "voidVoucher aborts transaction when Voucher void fails after Journal void",
  async () => {

    const session = {
      abortCount: 0,
      endSessionCount: 0,

      async withTransaction(callback) {
        try {
          return await callback();
        } catch (error) {
          this.abortCount += 1;
          throw error;
        }
      },

      async endSession() {
        this.endSessionCount += 1;
      },
    };


    const sessionProvider = {
      async startSession() {
        return session;
      },
    };


    const calls = [];


    const voucherRepository = {

      async findById(input) {
        calls.push(
          "findVoucher"
        );

        return {
          _id:
            input.voucherId,

          companyId:
            input.companyId,

          voucherNumber:
            "PV/2026-27/000001",

          status:
            "posted",

          journalEntryId:
            "64f000000000000000000099",
        };
      },


      async voidById() {
        calls.push(
          "voidVoucher"
        );

        return null;
      },

    };


    const journalService = {

      async voidJournal() {
        calls.push(
          "voidJournal"
        );

        return {
          _id:
            "64f000000000000000000099",

          status:
            "void",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        journalService,
        sessionProvider,
      });


    await assert.rejects(
      () =>
        service.voidVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",

          reason:
            "Incorrect payment entry",
        }),

      /Voucher not found or cannot be voided/
    );


    assert.deepEqual(
      calls,
      [
        "findVoucher",
        "voidJournal",
        "voidVoucher",
      ]
    );


    assert.equal(
      session.abortCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );

  }
);

test(
  "voidVoucher rejects a posted Voucher without a linked JournalEntry",
  async () => {

    const session = {
      abortCount: 0,
      endSessionCount: 0,

      async withTransaction(callback) {
        try {
          return await callback();
        } catch (error) {
          this.abortCount += 1;
          throw error;
        }
      },

      async endSession() {
        this.endSessionCount += 1;
      },
    };


    const sessionProvider = {
      async startSession() {
        return session;
      },
    };


    let journalVoidCount =
      0;

    let voucherVoidCount =
      0;


    const voucherRepository = {
      async findById(input) {
        return {
          _id:
            input.voucherId,

          companyId:
            input.companyId,

          status:
            "posted",

          journalEntryId:
            null,
        };
      },

      async voidById() {
        voucherVoidCount += 1;
        return null;
      },
    };


    const journalService = {
      async voidJournal() {
        journalVoidCount += 1;

        return {
          status:
            "void",
        };
      },
    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
        journalService,
        sessionProvider,
      });


    await assert.rejects(
      () =>
        service.voidVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",

          reason:
            "Incorrect payment entry",
        }),

      /Posted Voucher has no linked Journal Entry/
    );


    assert.equal(
      journalVoidCount,
      0
    );


    assert.equal(
      voucherVoidCount,
      0
    );


    assert.equal(
      session.abortCount,
      1
    );


    assert.equal(
      session.endSessionCount,
      1
    );

  }
);

test(
  "renumbers a draft voucher when its date crosses into a new financial year",
  async () => {

    let receivedUpdate = null;

    const voucherRepository = {

      async findById() {
        return {
          _id: "64f000000000000000000002",
          status: "draft",
          voucherType: "payment",
          voucherDate: "2027-03-31",
          financialYear: "2026-27",
          voucherNumber: "PV/2026-27/000041",
        };
      },

      async findLastVoucherNumber() {
        return null;
      },

      async updateDraftById(input) {
        receivedUpdate = input;

        return {
          _id: input.voucherId,
          status: "draft",
          ...input.payload,
        };
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
      });

    await service.updateDraftVoucher({

      companyId:
        "64f000000000000000000001",

      voucherId:
        "64f000000000000000000002",

      userId:
        "64f000000000000000000009",

      payload: {
        voucherDate:
          "2027-04-01",
      },

    });

    assert.equal(
      receivedUpdate.payload.financialYear,
      "2027-28"
    );

    assert.equal(
      receivedUpdate.payload.voucherNumber,
      "PV/2027-28/000001"
    );

  }
);

test(
  "retries voucher creation with a fresh number after a duplicate-key collision",
  async () => {

    let lookupCount = 0;
    const createdNumbers = [];

    const voucherRepository = {

      async findLastVoucherNumber() {

        lookupCount += 1;

        if (lookupCount === 1) {
          return {
            voucherNumber:
              "PV/2026-27/000041",
          };
        }

        return {
          voucherNumber:
            "PV/2026-27/000042",
        };
      },

      async create(payload) {

        createdNumbers.push(
          payload.voucherNumber
        );

        if (createdNumbers.length === 1) {

          const error =
            new Error(
              "E11000 duplicate key error"
            );

          error.code = 11000;

          throw error;
        }

        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
      });

    const result =
      await service.createVoucher({

        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {
          voucherType:
            "payment",

          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId:
                "64f000000000000000000011",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "64f000000000000000000012",
              debit:
                0,
              credit:
                1000,
            },
          ],
        },

      });

    assert.deepEqual(
      createdNumbers,
      [
        "PV/2026-27/000042",
        "PV/2026-27/000043",
      ]
    );

    assert.equal(
      result.voucherNumber,
      "PV/2026-27/000043"
    );

  }
);

test(
  "retries multiple duplicate voucher-number collisions before succeeding",
  async () => {

    let lookupCount = 0;
    const createdNumbers = [];

    const voucherRepository = {

      async findLastVoucherNumber() {

        lookupCount += 1;

        return {
          voucherNumber:
            `PV/2026-27/${String(
              40 + lookupCount
            ).padStart(6, "0")}`,
        };
      },

      async create(payload) {

        createdNumbers.push(
          payload.voucherNumber
        );

        if (createdNumbers.length < 3) {

          const error =
            new Error(
              "E11000 duplicate key error"
            );

          error.code = 11000;

          throw error;
        }

        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
      });

    const result =
      await service.createVoucher({

        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {
          voucherType:
            "payment",

          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId:
                "64f000000000000000000011",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "64f000000000000000000012",
              debit:
                0,
              credit:
                1000,
            },
          ],
        },

      });

    assert.deepEqual(
      createdNumbers,
      [
        "PV/2026-27/000042",
        "PV/2026-27/000043",
        "PV/2026-27/000044",
      ]
    );

    assert.equal(
      result.voucherNumber,
      "PV/2026-27/000044"
    );

  }
);

test(
  "stops voucher creation after the maximum duplicate-key retry attempts",
  async () => {

    let createAttempts = 0;

    const voucherRepository = {

      async findLastVoucherNumber() {
        return {
          voucherNumber:
            `PV/2026-27/${String(
              41 + createAttempts
            ).padStart(6, "0")}`,
        };
      },

      async create() {

        createAttempts += 1;

        const error =
          new Error(
            "E11000 duplicate key error"
          );

        error.code = 11000;

        throw error;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({

          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType:
              "payment",

            voucherDate:
              "2026-09-05",

            lines: [
              {
                accountId:
                  "64f000000000000000000011",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "64f000000000000000000012",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },

        }),
      (error) =>
        error?.code === 11000
    );

    assert.equal(
      createAttempts,
      3
    );

  }
);

test(
  "does not retry voucher creation for non-duplicate database errors",
  async () => {

    let createAttempts = 0;
    let numberLookups = 0;

    const voucherRepository = {

      async findLastVoucherNumber() {

        numberLookups += 1;

        return null;
      },

      async create() {

        createAttempts += 1;

        const error =
          new Error(
            "Database unavailable"
          );

        error.code = 12345;

        throw error;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createLegacyPaymentChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({

          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType:
              "payment",

            voucherDate:
              "2026-09-05",

            lines: [
              {
                accountId:
                  "64f000000000000000000011",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "64f000000000000000000012",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },

        }),
      /Database unavailable/
    );

    assert.equal(
      createAttempts,
      1
    );

    assert.equal(
      numberLookups,
      1
    );

  }
);

test(
  "accepts a Payment Voucher that credits a Bank account",
  async () => {

    const accounts = {
      expense: {
        _id: "expense",
        accountType: "indirect_expense",
        status: "active",
        allowManualEntry: true,
      },
      bank: {
        _id: "bank",
        accountType: "bank",
        status: "active",
        allowManualEntry: true,
      },
    };

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const chartRepository = {

      async findById({ accountId }) {
        return accounts[accountId] || null;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
      });

    const result =
      await service.createVoucher({
        companyId: "64f000000000000000000001",
        userId: "64f000000000000000000009",

        payload: {
          voucherType: "payment",
          voucherDate: "2026-09-05",

          lines: [
            {
              accountId: "expense",
              debit: 1000,
              credit: 0,
            },
            {
              accountId: "bank",
              debit: 0,
              credit: 1000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "payment"
    );

  }
);


test(
  "accepts a Payment Voucher that credits a Cash account",
  async () => {

    const accounts = {
      vendor: {
        _id: "vendor",
        accountType: "accounts_payable",
        status: "active",
        allowManualEntry: true,
      },
      cash: {
        _id: "cash",
        accountType: "cash",
        status: "active",
        allowManualEntry: true,
      },
    };

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const chartRepository = {

      async findById({ accountId }) {
        return accounts[accountId] || null;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
      });

    const result =
      await service.createVoucher({
        companyId: "64f000000000000000000001",
        userId: "64f000000000000000000009",

        payload: {
          voucherType: "payment",
          voucherDate: "2026-09-05",

          lines: [
            {
              accountId: "vendor",
              debit: 2500,
              credit: 0,
            },
            {
              accountId: "cash",
              debit: 0,
              credit: 2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "payment"
    );

  }
);


test(
  "rejects a Payment Voucher without a Cash or Bank credit line",
  async () => {

    const accounts = {
      expense: {
        _id: "expense",
        accountType: "indirect_expense",
        status: "active",
        allowManualEntry: true,
      },
      payable: {
        _id: "payable",
        accountType: "accounts_payable",
        status: "active",
        allowManualEntry: true,
      },
    };

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const chartRepository = {

      async findById({ accountId }) {
        return accounts[accountId] || null;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType: "payment",
            voucherDate: "2026-09-05",

            lines: [
              {
                accountId: "expense",
                debit: 1000,
                credit: 0,
              },
              {
                accountId: "payable",
                debit: 0,
                credit: 1000,
              },
            ],
          },
        }),
      /cash or bank/i
    );

  }
);


test(
  "rejects a Payment Voucher that debits a Cash or Bank account",
  async () => {

    const accounts = {
      bank: {
        _id: "bank",
        accountType: "bank",
        status: "active",
        allowManualEntry: true,
      },
      cash: {
        _id: "cash",
        accountType: "cash",
        status: "active",
        allowManualEntry: true,
      },
    };

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const chartRepository = {

      async findById({ accountId }) {
        return accounts[accountId] || null;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType: "payment",
            voucherDate: "2026-09-05",

            lines: [
              {
                accountId: "bank",
                debit: 1000,
                credit: 0,
              },
              {
                accountId: "cash",
                debit: 0,
                credit: 1000,
              },
            ],
          },
        }),
      /cash or bank.*debit|debit.*cash or bank/i
    );

  }
);

function createLegacyPaymentChartRepository() {

  const bankAccountIds =
    new Set([
      "64f000000000000000000003",
      "64f000000000000000000012",
    ]);

  return {

    async findById({
      accountId,
    }) {

      return {
        _id:
          accountId,

        accountType:
          bankAccountIds.has(
            String(accountId)
          )
            ? "bank"
            : "indirect_expense",

        status:
          "active",

        allowManualEntry:
          true,
      };

    },

  };

}

test(
  "rejects updating a Payment Voucher to debit a Cash or Bank account",
  async () => {

    let updateCalled = false;

    const voucherRepository = {

      async findById() {
        return {
          _id: "voucher-1",
          status: "draft",
          voucherType: "payment",
          financialYear: "2026-27",
          voucherNumber: "PV/2026-27/000001",
        };
      },

      async updateDraftById() {
        updateCalled = true;

        return {
          _id: "voucher-1",
          status: "draft",
        };
      },

    };

    const chartRepository = {

      async findById({ accountId }) {

        return {
          _id: accountId,
          accountType:
            accountId === "bank"
              ? "bank"
              : "cash",
          status: "active",
          allowManualEntry: true,
        };

      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "voucher-1",

          userId:
            "64f000000000000000000009",

          payload: {
            lines: [
              {
                accountId: "bank",
                debit: 1000,
                credit: 0,
              },
              {
                accountId: "cash",
                debit: 0,
                credit: 1000,
              },
            ],
          },
        }),
      /cash or bank.*debit|debit.*cash or bank/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Payment Voucher before creating its JournalEntry",
  async () => {

    let journalCreateCalled = false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id: voucherId,
          companyId,
          status: "draft",
          voucherType: "payment",
          voucherNumber:
            "PV/2026-27/000001",
          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId: "bank",
              debit: 1000,
              credit: 0,
            },
            {
              accountId: "cash",
              debit: 0,
              credit: 1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status: "posted",
        };
      },

    };

    const chartRepository = {

      async findById({
        accountId,
      }) {

        return {
          _id: accountId,
          accountType:
            accountId === "bank"
              ? "bank"
              : "cash",
          status: "active",
          allowManualEntry: true,
        };

      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled = true;

        return {
          _id: "journal-1",
          status: "draft",
        };

      },

      async postJournal() {

        return {
          _id: "journal-1",
          status: "posted",
        };

      },

    };

    const session = {

      async withTransaction(callback) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository,
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "voucher-1",

          userId:
            "64f000000000000000000009",
        }),
      /cash or bank.*debit|debit.*cash or bank/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);

function createReceiptChartRepository() {

  const accountTypes = {
    bank: "bank",
    cash: "cash",
    customer: "accounts_receivable",
    income: "direct_income",
  };

  return {

    async findById({
      accountId,
    }) {

      const accountType =
        accountTypes[
          String(accountId)
        ];

      if (!accountType) {
        return null;
      }

      return {
        _id:
          accountId,

        accountType,

        status:
          "active",

        allowManualEntry:
          true,
      };

    },

  };

}


test(
  "accepts a Receipt Voucher that debits a Bank account",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {
          voucherType:
            "receipt",

          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId:
                "bank",
              debit:
                5000,
              credit:
                0,
            },
            {
              accountId:
                "customer",
              debit:
                0,
              credit:
                5000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "receipt"
    );

  }
);


test(
  "accepts a Receipt Voucher that debits a Cash account",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {
          voucherType:
            "receipt",

          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId:
                "cash",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "income",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "receipt"
    );

  }
);


test(
  "rejects a Receipt Voucher without a Cash or Bank debit line",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType:
              "receipt",

            voucherDate:
              "2026-09-05",

            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "income",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /cash or bank/i
    );

  }
);


test(
  "rejects a Receipt Voucher that credits a Cash or Bank account",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType:
              "receipt",

            voucherDate:
              "2026-09-05",

            lines: [
              {
                accountId:
                  "cash",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "bank",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /cash or bank.*credit|credit.*cash or bank/i
    );

  }
);


test(
  "rejects updating a Receipt Voucher to credit a Cash or Bank account",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "receipt-voucher-1",

          status:
            "draft",

          voucherType:
            "receipt",

          financialYear:
            "2026-27",

          voucherNumber:
            "RV/2026-27/000001",
        };
      },

      async updateDraftById() {

        updateCalled =
          true;

        return {
          _id:
            "receipt-voucher-1",

          status:
            "draft",
        };
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "receipt-voucher-1",

          userId:
            "64f000000000000000000009",

          payload: {
            lines: [
              {
                accountId:
                  "cash",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "bank",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /cash or bank.*credit|credit.*cash or bank/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Receipt Voucher before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,

          companyId,

          status:
            "draft",

          voucherType:
            "receipt",

          voucherNumber:
            "RV/2026-27/000001",

          voucherDate:
            "2026-09-05",

          lines: [
            {
              accountId:
                "cash",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled =
          true;

        return {
          _id:
            "journal-1",

          status:
            "draft",
        };
      },

      async postJournal() {
        return {
          _id:
            "journal-1",

          status:
            "posted",
        };
      },

    };

    const session = {

      async withTransaction(
        callback
      ) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",

          voucherId:
            "receipt-voucher-1",

          userId:
            "64f000000000000000000009",
        }),
      /cash or bank.*credit|credit.*cash or bank/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);


test(
  "rejects a Receipt Voucher that debits a non-Cash or Bank account even when Bank is also debited",
  async () => {

    const voucherRepository = {
      async findLastVoucherNumber() {
        return null;
      },

      async create(payload) {
        return payload;
      },
    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createReceiptChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",

          userId:
            "64f000000000000000000009",

          payload: {
            voucherType:
              "receipt",

            voucherDate:
              "2026-09-05",

            lines: [
              {
                accountId:
                  "bank",
                debit:
                  500,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  500,
                credit:
                  0,
              },
              {
                accountId:
                  "income",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /only cash or bank.*debit|debit.*only cash or bank/i
    );

  }
);

function createContraChartRepository() {

  const accounts = {
    bank: {
      accountType: "bank",
      status: "active",
    },
    bank2: {
      accountType: "bank",
      status: "active",
    },
    cash: {
      accountType: "cash",
      status: "active",
    },
    customer: {
      accountType: "accounts_receivable",
      status: "active",
    },
    inactiveBank: {
      accountType: "bank",
      status: "inactive",
    },
  };

  return {

    async findById({
      accountId,
    }) {

      const account =
        accounts[String(accountId)];

      if (!account) {
        return null;
      }

      return {
        _id:
          accountId,
        accountType:
          account.accountType,
        status:
          account.status,
        allowManualEntry:
          true,
      };

    },

  };

}


function createContraCreateRepository() {

  return {

    async findLastVoucherNumber() {
      return null;
    },

    async create(payload) {
      return payload;
    },

  };

}


test(
  "accepts a Contra Voucher from Cash to Bank",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "contra",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "bank",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "cash",
              debit:
                0,
              credit:
                1000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "contra"
    );

  }
);


test(
  "accepts a Contra Voucher from Bank to Cash",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "contra",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "cash",
              debit:
                1500,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                1500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "contra"
    );

  }
);


test(
  "accepts a Contra Voucher from Bank to Bank",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "contra",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "bank2",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "contra"
    );

  }
);


test(
  "rejects a Contra Voucher that debits a non-Cash or Bank account",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "contra",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "bank",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /only cash or bank.*debit|debit.*only cash or bank/i
    );

  }
);


test(
  "rejects a Contra Voucher that credits a non-Cash or Bank account",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "contra",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "bank",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /only cash or bank.*credit|credit.*only cash or bank/i
    );

  }
);


test(
  "rejects a Contra Voucher that uses an inactive Cash or Bank account",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "contra",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "bank",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "inactiveBank",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /active accounts/i
    );

  }
);


test(
  "rejects a Contra Voucher account outside the company or not found",
  async () => {

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository:
          createContraCreateRepository(),
        chartRepository:
          createContraChartRepository(),
      });

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "contra",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "bank",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "foreignAccount",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /account not found/i
    );

  }
);


test(
  "rejects updating a Contra Voucher with a non-Cash or Bank account",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "contra-voucher-1",
          status:
            "draft",
          voucherType:
            "contra",
          financialYear:
            "2026-27",
          voucherNumber:
            "CV/2026-27/000001",
        };
      },

      async updateDraftById() {

        updateCalled =
          true;

        return {
          _id:
            "contra-voucher-1",
          status:
            "draft",
        };

      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createContraChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "contra-voucher-1",
          userId:
            "64f000000000000000000009",
          payload: {
            lines: [
              {
                accountId:
                  "bank",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /only cash or bank.*credit|credit.*only cash or bank/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Contra Voucher before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,
          companyId,
          status:
            "draft",
          voucherType:
            "contra",
          voucherNumber:
            "CV/2026-27/000001",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "bank",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "customer",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled =
          true;

        return {
          _id:
            "journal-1",
          status:
            "draft",
        };

      },

      async postJournal() {
        return {
          _id:
            "journal-1",
          status:
            "posted",
        };
      },

    };

    const session = {

      async withTransaction(
        callback
      ) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createContraChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "contra-voucher-1",
          userId:
            "64f000000000000000000009",
        }),
      /only cash or bank.*credit|credit.*only cash or bank/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);

function createSalesChartRepository() {

  const accounts = {
    customer: {
      accountType: "accounts_receivable",
      status: "active",
    },
    cash: {
      accountType: "cash",
      status: "active",
    },
    bank: {
      accountType: "bank",
      status: "active",
    },
    sales: {
      accountType: "sales",
      status: "active",
    },
    directIncome: {
      accountType: "direct_income",
      status: "active",
    },
    indirectIncome: {
      accountType: "indirect_income",
      status: "active",
    },
    tax: {
      accountType: "tax",
      status: "active",
    },
    purchase: {
      accountType: "purchase",
      status: "active",
    },
    expense: {
      accountType: "direct_expense",
      status: "active",
    },
    payable: {
      accountType: "accounts_payable",
      status: "active",
    },
    inactiveSales: {
      accountType: "sales",
      status: "inactive",
    },
  };

  return {
    async findById({
      accountId,
    }) {

      const account =
        accounts[String(accountId)];

      if (!account) {
        return null;
      }

      return {
        _id:
          accountId,
        accountType:
          account.accountType,
        status:
          account.status,
        allowManualEntry:
          true,
      };

    },
  };

}


function createSalesCreateRepository() {

  return {
    async findLastVoucherNumber() {
      return null;
    },

    async create(payload) {
      return payload;
    },
  };

}


async function createSalesService() {

  const {
    VoucherService,
  } = await loadService();

  return new VoucherService({
    voucherRepository:
      createSalesCreateRepository(),
    chartRepository:
      createSalesChartRepository(),
  });

}


test(
  "accepts a Sales Voucher for a credit sale",
  async () => {

    const service =
      await createSalesService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "customer",
              debit:
                5000,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                5000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "sales"
    );

  }
);


test(
  "accepts a Sales Voucher for a cash sale",
  async () => {

    const service =
      await createSalesService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "cash",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "sales"
    );

  }
);


test(
  "accepts a Sales Voucher for a bank sale",
  async () => {

    const service =
      await createSalesService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "bank",
              debit:
                3200,
              credit:
                0,
            },
            {
              accountId:
                "directIncome",
              debit:
                0,
              credit:
                3200,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "sales"
    );

  }
);


test(
  "accepts a Sales Voucher with output tax credit",
  async () => {

    const service =
      await createSalesService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "customer",
              debit:
                1180,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                1000,
            },
            {
              accountId:
                "tax",
              debit:
                0,
              credit:
                180,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "sales"
    );

  }
);


test(
  "rejects a Sales Voucher without a Sales or Income credit line",
  async () => {

    const service =
      await createSalesService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "sales",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  180,
                credit:
                  0,
              },
              {
                accountId:
                  "tax",
                debit:
                  0,
                credit:
                  180,
              },
            ],
          },
        }),
      /sales or income.*credit|credit.*sales or income/i
    );

  }
);


test(
  "rejects a Sales Voucher that debits an invalid ledger",
  async () => {

    const service =
      await createSalesService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "sales",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "purchase",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "sales",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /customer.*cash.*bank|cash.*bank.*debit|debit.*customer/i
    );

  }
);


test(
  "rejects a Sales Voucher that credits an invalid ledger",
  async () => {

    const service =
      await createSalesService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "sales",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "purchase",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /sales.*income.*tax|credit.*sales|credited.*sales/i
    );

  }
);


test(
  "rejects a Sales Voucher that uses an inactive account",
  async () => {

    const service =
      await createSalesService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "sales",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "inactiveSales",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /active accounts/i
    );

  }
);


test(
  "rejects a Sales Voucher account outside the company or not found",
  async () => {

    const service =
      await createSalesService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "sales",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "foreignAccount",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /account not found/i
    );

  }
);


test(
  "rejects updating a Sales Voucher with an invalid credit ledger",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "sales-voucher-1",
          status:
            "draft",
          voucherType:
            "sales",
          financialYear:
            "2026-27",
          voucherNumber:
            "SV/2026-27/000001",
        };
      },

      async updateDraftById() {
        updateCalled =
          true;

        return {
          _id:
            "sales-voucher-1",
          status:
            "draft",
        };
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createSalesChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "sales-voucher-1",
          userId:
            "64f000000000000000000009",
          payload: {
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "purchase",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /sales.*income.*tax|credit.*sales|credited.*sales/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Sales Voucher before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,
          companyId,
          status:
            "draft",
          voucherType:
            "sales",
          voucherNumber:
            "SV/2026-27/000001",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "customer",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "purchase",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {
        journalCreateCalled =
          true;

        return {
          _id:
            "journal-sales-1",
          status:
            "draft",
        };
      },

      async postJournal() {
        return {
          _id:
            "journal-sales-1",
          status:
            "posted",
        };
      },

    };

    const session = {
      async withTransaction(callback) {
        return callback();
      },

      async endSession() {},
    };

    const sessionProvider = {
      async startSession() {
        return session;
      },
    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createSalesChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "sales-voucher-1",
          userId:
            "64f000000000000000000009",
        }),
      /sales.*income.*tax|credit.*sales|credited.*sales/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);

function createPurchaseChartRepository() {

  const accounts = {
    supplier: {
      accountType: "accounts_payable",
      status: "active",
    },
    cash: {
      accountType: "cash",
      status: "active",
    },
    bank: {
      accountType: "bank",
      status: "active",
    },
    purchase: {
      accountType: "purchase",
      status: "active",
    },
    tax: {
      accountType: "tax",
      status: "active",
    },
    sales: {
      accountType: "sales",
      status: "active",
    },
    customer: {
      accountType: "accounts_receivable",
      status: "active",
    },
    expense: {
      accountType: "direct_expense",
      status: "active",
    },
    inactivePurchase: {
      accountType: "purchase",
      status: "inactive",
    },
  };

  return {

    async findById({
      accountId,
    }) {

      const account =
        accounts[String(accountId)];

      if (!account) {
        return null;
      }

      return {
        _id:
          accountId,
        accountType:
          account.accountType,
        status:
          account.status,
        allowManualEntry:
          true,
      };

    },

  };

}


function createPurchaseCreateRepository() {

  return {

    async findLastVoucherNumber() {
      return null;
    },

    async create(payload) {
      return payload;
    },

  };

}


async function createPurchaseService() {

  const {
    VoucherService,
  } = await loadService();

  return new VoucherService({
    voucherRepository:
      createPurchaseCreateRepository(),
    chartRepository:
      createPurchaseChartRepository(),
  });

}


test(
  "accepts a Purchase Voucher for a supplier credit purchase",
  async () => {

    const service =
      await createPurchaseService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                5000,
              credit:
                0,
            },
            {
              accountId:
                "supplier",
              debit:
                0,
              credit:
                5000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "purchase"
    );

  }
);


test(
  "accepts a Purchase Voucher for a cash purchase",
  async () => {

    const service =
      await createPurchaseService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "cash",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "purchase"
    );

  }
);


test(
  "accepts a Purchase Voucher for a bank purchase",
  async () => {

    const service =
      await createPurchaseService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                3200,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                3200,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "purchase"
    );

  }
);


test(
  "accepts a Purchase Voucher with input tax debit",
  async () => {

    const service =
      await createPurchaseService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "tax",
              debit:
                180,
              credit:
                0,
            },
            {
              accountId:
                "supplier",
              debit:
                0,
              credit:
                1180,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "purchase"
    );

  }
);


test(
  "rejects a Purchase Voucher without a Purchase debit line",
  async () => {

    const service =
      await createPurchaseService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "purchase",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "tax",
                debit:
                  180,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  180,
              },
            ],
          },
        }),
      /purchase.*debit|debit.*purchase/i
    );

  }
);


test(
  "rejects a Purchase Voucher that debits an invalid ledger",
  async () => {

    const service =
      await createPurchaseService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "purchase",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "sales",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /only purchase.*tax.*debit|debit.*purchase.*tax/i
    );

  }
);


test(
  "rejects a Purchase Voucher that credits an invalid ledger",
  async () => {

    const service =
      await createPurchaseService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "purchase",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "purchase",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /accounts payable.*cash.*bank|supplier.*cash.*bank|credit.*cash.*bank/i
    );

  }
);


test(
  "rejects a Purchase Voucher that uses an inactive account",
  async () => {

    const service =
      await createPurchaseService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "purchase",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "inactivePurchase",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /active accounts/i
    );

  }
);


test(
  "rejects a Purchase Voucher account outside the company or not found",
  async () => {

    const service =
      await createPurchaseService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "purchase",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "foreignAccount",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /account not found/i
    );

  }
);


test(
  "rejects updating a Purchase Voucher with an invalid credit ledger",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "purchase-voucher-1",
          status:
            "draft",
          voucherType:
            "purchase",
          financialYear:
            "2026-27",
          voucherNumber:
            "PUR/2026-27/000001",
        };
      },

      async updateDraftById() {

        updateCalled =
          true;

        return {
          _id:
            "purchase-voucher-1",
          status:
            "draft",
        };

      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createPurchaseChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "purchase-voucher-1",
          userId:
            "64f000000000000000000009",
          payload: {
            lines: [
              {
                accountId:
                  "purchase",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /accounts payable.*cash.*bank|supplier.*cash.*bank|credit.*cash.*bank/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Purchase Voucher before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,
          companyId,
          status:
            "draft",
          voucherType:
            "purchase",
          voucherNumber:
            "PUR/2026-27/000001",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "customer",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled =
          true;

        return {
          _id:
            "journal-purchase-1",
          status:
            "draft",
        };

      },

      async postJournal() {
        return {
          _id:
            "journal-purchase-1",
          status:
            "posted",
        };
      },

    };

    const session = {

      async withTransaction(callback) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createPurchaseChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "purchase-voucher-1",
          userId:
            "64f000000000000000000009",
        }),
      /accounts payable.*cash.*bank|supplier.*cash.*bank|credit.*cash.*bank/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);

function createCreditNoteChartRepository() {

  const accounts = {
    customer: {
      accountType: "accounts_receivable",
      status: "active",
    },
    cash: {
      accountType: "cash",
      status: "active",
    },
    bank: {
      accountType: "bank",
      status: "active",
    },
    sales: {
      accountType: "sales",
      status: "active",
    },
    directIncome: {
      accountType: "direct_income",
      status: "active",
    },
    indirectIncome: {
      accountType: "indirect_income",
      status: "active",
    },
    tax: {
      accountType: "tax",
      status: "active",
    },
    purchase: {
      accountType: "purchase",
      status: "active",
    },
    supplier: {
      accountType: "accounts_payable",
      status: "active",
    },
    expense: {
      accountType: "direct_expense",
      status: "active",
    },
    inactiveSales: {
      accountType: "sales",
      status: "inactive",
    },
  };

  return {

    async findById({
      accountId,
    }) {

      const account =
        accounts[String(accountId)];

      if (!account) {
        return null;
      }

      return {
        _id:
          accountId,
        accountType:
          account.accountType,
        status:
          account.status,
        allowManualEntry:
          true,
      };

    },

  };

}


function createCreditNoteCreateRepository() {

  return {

    async findLastVoucherNumber() {
      return null;
    },

    async create(payload) {
      return payload;
    },

  };

}


async function createCreditNoteService() {

  const {
    VoucherService,
  } = await loadService();

  return new VoucherService({
    voucherRepository:
      createCreditNoteCreateRepository(),
    chartRepository:
      createCreditNoteChartRepository(),
  });

}


test(
  "accepts a Credit Note against a customer receivable",
  async () => {

    const service =
      await createCreditNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "credit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "sales",
              debit:
                5000,
              credit:
                0,
            },
            {
              accountId:
                "customer",
              debit:
                0,
              credit:
                5000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "credit_note"
    );

  }
);


test(
  "accepts a Credit Note with a cash refund",
  async () => {

    const service =
      await createCreditNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "credit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "sales",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "cash",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "credit_note"
    );

  }
);


test(
  "accepts a Credit Note with a bank refund",
  async () => {

    const service =
      await createCreditNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "credit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "directIncome",
              debit:
                3200,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                3200,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "credit_note"
    );

  }
);


test(
  "accepts a Credit Note with output tax reversal",
  async () => {

    const service =
      await createCreditNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "credit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "sales",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "tax",
              debit:
                180,
              credit:
                0,
            },
            {
              accountId:
                "customer",
              debit:
                0,
              credit:
                1180,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "credit_note"
    );

  }
);


test(
  "rejects a Credit Note without a Sales or Income debit line",
  async () => {

    const service =
      await createCreditNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "credit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "tax",
                debit:
                  180,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  180,
              },
            ],
          },
        }),
      /sales or income.*debit|debit.*sales or income/i
    );

  }
);


test(
  "rejects a Credit Note that debits an invalid ledger",
  async () => {

    const service =
      await createCreditNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "credit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "purchase",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /sales.*income.*tax|debit.*sales|debited.*sales/i
    );

  }
);


test(
  "rejects a Credit Note that credits an invalid ledger",
  async () => {

    const service =
      await createCreditNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "credit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "sales",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /accounts receivable.*cash.*bank|customer.*cash.*bank|credit.*cash.*bank/i
    );

  }
);


test(
  "rejects a Credit Note that uses an inactive account",
  async () => {

    const service =
      await createCreditNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "credit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "inactiveSales",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /active accounts/i
    );

  }
);


test(
  "rejects a Credit Note account outside the company or not found",
  async () => {

    const service =
      await createCreditNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "credit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "foreignAccount",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "customer",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /account not found/i
    );

  }
);


test(
  "rejects updating a Credit Note with an invalid credit ledger",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "credit-note-1",
          status:
            "draft",
          voucherType:
            "credit_note",
          financialYear:
            "2026-27",
          voucherNumber:
            "CN/2026-27/000001",
        };
      },

      async updateDraftById() {

        updateCalled =
          true;

        return {
          _id:
            "credit-note-1",
          status:
            "draft",
        };

      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createCreditNoteChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "credit-note-1",
          userId:
            "64f000000000000000000009",
          payload: {
            lines: [
              {
                accountId:
                  "sales",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "supplier",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /accounts receivable.*cash.*bank|customer.*cash.*bank|credit.*cash.*bank/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Credit Note before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,
          companyId,
          status:
            "draft",
          voucherType:
            "credit_note",
          voucherNumber:
            "CN/2026-27/000001",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "sales",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "supplier",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled =
          true;

        return {
          _id:
            "journal-credit-note-1",
          status:
            "draft",
        };

      },

      async postJournal() {
        return {
          _id:
            "journal-credit-note-1",
          status:
            "posted",
        };
      },

    };

    const session = {

      async withTransaction(callback) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createCreditNoteChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "credit-note-1",
          userId:
            "64f000000000000000000009",
        }),
      /accounts receivable.*cash.*bank|customer.*cash.*bank|credit.*cash.*bank/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);

function createDebitNoteChartRepository() {

  const accounts = {
    supplier: {
      accountType: "accounts_payable",
      status: "active",
    },
    cash: {
      accountType: "cash",
      status: "active",
    },
    bank: {
      accountType: "bank",
      status: "active",
    },
    purchase: {
      accountType: "purchase",
      status: "active",
    },
    tax: {
      accountType: "tax",
      status: "active",
    },
    sales: {
      accountType: "sales",
      status: "active",
    },
    customer: {
      accountType: "accounts_receivable",
      status: "active",
    },
    expense: {
      accountType: "direct_expense",
      status: "active",
    },
    inactivePurchase: {
      accountType: "purchase",
      status: "inactive",
    },
  };

  return {

    async findById({
      accountId,
    }) {

      const account =
        accounts[String(accountId)];

      if (!account) {
        return null;
      }

      return {
        _id:
          accountId,
        accountType:
          account.accountType,
        status:
          account.status,
        allowManualEntry:
          true,
      };

    },

  };

}


function createDebitNoteCreateRepository() {

  return {

    async findLastVoucherNumber() {
      return null;
    },

    async create(payload) {
      return payload;
    },

  };

}


async function createDebitNoteService() {

  const {
    VoucherService,
  } = await loadService();

  return new VoucherService({
    voucherRepository:
      createDebitNoteCreateRepository(),
    chartRepository:
      createDebitNoteChartRepository(),
  });

}


test(
  "accepts a Debit Note against a supplier payable",
  async () => {

    const service =
      await createDebitNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "debit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "supplier",
              debit:
                5000,
              credit:
                0,
            },
            {
              accountId:
                "purchase",
              debit:
                0,
              credit:
                5000,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "debit_note"
    );

  }
);


test(
  "accepts a Debit Note with a cash refund",
  async () => {

    const service =
      await createDebitNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "debit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "cash",
              debit:
                2500,
              credit:
                0,
            },
            {
              accountId:
                "purchase",
              debit:
                0,
              credit:
                2500,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "debit_note"
    );

  }
);


test(
  "accepts a Debit Note with a bank refund",
  async () => {

    const service =
      await createDebitNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "debit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "bank",
              debit:
                3200,
              credit:
                0,
            },
            {
              accountId:
                "purchase",
              debit:
                0,
              credit:
                3200,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "debit_note"
    );

  }
);


test(
  "accepts a Debit Note with input tax reversal",
  async () => {

    const service =
      await createDebitNoteService();

    const result =
      await service.createVoucher({
        companyId:
          "64f000000000000000000001",
        userId:
          "64f000000000000000000009",
        payload: {
          voucherType:
            "debit_note",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "supplier",
              debit:
                1180,
              credit:
                0,
            },
            {
              accountId:
                "purchase",
              debit:
                0,
              credit:
                1000,
            },
            {
              accountId:
                "tax",
              debit:
                0,
              credit:
                180,
            },
          ],
        },
      });

    assert.equal(
      result.voucherType,
      "debit_note"
    );

  }
);


test(
  "rejects a Debit Note without a Purchase credit line",
  async () => {

    const service =
      await createDebitNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "debit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "supplier",
                debit:
                  180,
                credit:
                  0,
              },
              {
                accountId:
                  "tax",
                debit:
                  0,
                credit:
                  180,
              },
            ],
          },
        }),
      /purchase.*credit|credit.*purchase/i
    );

  }
);


test(
  "rejects a Debit Note that debits an invalid ledger",
  async () => {

    const service =
      await createDebitNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "debit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "customer",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "purchase",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /accounts payable.*cash.*bank|supplier.*cash.*bank|debit.*cash.*bank/i
    );

  }
);


test(
  "rejects a Debit Note that credits an invalid ledger",
  async () => {

    const service =
      await createDebitNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "debit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "supplier",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "sales",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /purchase.*tax|credit.*purchase|credited.*purchase/i
    );

  }
);


test(
  "rejects a Debit Note that uses an inactive account",
  async () => {

    const service =
      await createDebitNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "debit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "supplier",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "inactivePurchase",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /active accounts/i
    );

  }
);


test(
  "rejects a Debit Note account outside the company or not found",
  async () => {

    const service =
      await createDebitNoteService();

    await assert.rejects(
      () =>
        service.createVoucher({
          companyId:
            "64f000000000000000000001",
          userId:
            "64f000000000000000000009",
          payload: {
            voucherType:
              "debit_note",
            voucherDate:
              "2026-09-05",
            lines: [
              {
                accountId:
                  "supplier",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "foreignAccount",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /account not found/i
    );

  }
);


test(
  "rejects updating a Debit Note with an invalid credit ledger",
  async () => {

    let updateCalled =
      false;

    const voucherRepository = {

      async findById() {
        return {
          _id:
            "debit-note-1",
          status:
            "draft",
          voucherType:
            "debit_note",
          financialYear:
            "2026-27",
          voucherNumber:
            "DN/2026-27/000001",
        };
      },

      async updateDraftById() {

        updateCalled =
          true;

        return {
          _id:
            "debit-note-1",
          status:
            "draft",
        };

      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createDebitNoteChartRepository(),
      });

    await assert.rejects(
      () =>
        service.updateDraftVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "debit-note-1",
          userId:
            "64f000000000000000000009",
          payload: {
            lines: [
              {
                accountId:
                  "supplier",
                debit:
                  1000,
                credit:
                  0,
              },
              {
                accountId:
                  "sales",
                debit:
                  0,
                credit:
                  1000,
              },
            ],
          },
        }),
      /purchase.*tax|credit.*purchase|credited.*purchase/i
    );

    assert.equal(
      updateCalled,
      false
    );

  }
);


test(
  "rejects posting an invalid Debit Note before creating its JournalEntry",
  async () => {

    let journalCreateCalled =
      false;

    const voucherRepository = {

      async findById({
        companyId,
        voucherId,
      }) {

        return {
          _id:
            voucherId,
          companyId,
          status:
            "draft",
          voucherType:
            "debit_note",
          voucherNumber:
            "DN/2026-27/000001",
          voucherDate:
            "2026-09-05",
          lines: [
            {
              accountId:
                "supplier",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                1000,
            },
          ],
        };

      },

      async postById() {
        return {
          status:
            "posted",
        };
      },

    };

    const journalService = {

      async createJournal() {

        journalCreateCalled =
          true;

        return {
          _id:
            "journal-debit-note-1",
          status:
            "draft",
        };

      },

      async postJournal() {
        return {
          _id:
            "journal-debit-note-1",
          status:
            "posted",
        };
      },

    };

    const session = {

      async withTransaction(callback) {
        return callback();
      },

      async endSession() {},

    };

    const sessionProvider = {

      async startSession() {
        return session;
      },

    };

    const {
      VoucherService,
    } = await loadService();

    const service =
      new VoucherService({
        voucherRepository,
        chartRepository:
          createDebitNoteChartRepository(),
        journalService,
        sessionProvider,
      });

    await assert.rejects(
      () =>
        service.postVoucher({
          companyId:
            "64f000000000000000000001",
          voucherId:
            "debit-note-1",
          userId:
            "64f000000000000000000009",
        }),
      /purchase.*tax|credit.*purchase|credited.*purchase/i
    );

    assert.equal(
      journalCreateCalled,
      false
    );

  }
);
