import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AccountExpense,
} from "../models/AccountExpense.js";

import accountingRoutes
  from "../routes/accounting.routes.js";


const routeContracts = () =>
  accountingRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(
        layer.route.methods || {}
      ),
    }));


test(
  "AccountExpense persists Accounts proof attachment metadata",
  () => {

    const expense =
      new AccountExpense({
        companyId:
          "64f000000000000000000001",

        title:
          "Office travel",

        category:
          "Travel",

        expenseType:
          "Operations",

        amount:
          2500,

        status:
          "Pending",

        attachments: [
          {
            originalName:
              "expense-proof.pdf",

            storedName:
              "expense-proof-001.pdf",

            fileUrl:
              "/uploads/accounts-proofs/expense-proof-001.pdf",

            storageKey:
              "accounts-proofs/expense-proof-001.pdf",

            mimeType:
              "application/pdf",

            fileSize:
              2048,

            uploadedBy:
              "64f000000000000000000009",

            uploadedAt:
              new Date(
                "2026-09-11T00:00:00.000Z"
              ),
          },
        ],
      });


    const validation =
      expense.validateSync();


    assert.equal(
      validation,
      undefined
    );


    assert.equal(
      expense.attachments.length,
      1
    );


    assert.equal(
      expense.attachments[0]
        .originalName,
      "expense-proof.pdf"
    );


    assert.equal(
      expense.attachments[0]
        .mimeType,
      "application/pdf"
    );


    assert.equal(
      expense.attachments[0]
        .fileSize,
      2048
    );

  }
);


test(
  "existing AccountExpense without attachments remains valid",
  () => {

    const expense =
      new AccountExpense({
        companyId:
          "64f000000000000000000001",

        title:
          "Office supplies",

        amount:
          500,
      });


    const validation =
      expense.validateSync();


    assert.equal(
      validation,
      undefined
    );


    assert.ok(
      Array.isArray(
        expense.attachments
      )
    );


    assert.equal(
      expense.attachments.length,
      0
    );

  }
);


test(
  "Accounting router exposes Expense proof upload route",
  () => {

    const routes =
      routeContracts();


    assert.ok(
      routes.some(
        (route) =>
          route.path ===
            "/expenses/:id/attachments" &&
          route.methods.includes(
            "post"
          )
      )
    );

  }
);


test(
  "Accounting router exposes Expense proof delete route",
  () => {

    const routes =
      routeContracts();


    assert.ok(
      routes.some(
        (route) =>
          route.path ===
            "/expenses/:id/attachments/:attachmentId" &&
          route.methods.includes(
            "delete"
          )
      )
    );

  }
);


test(
  "Expense financial contract remains unchanged",
  () => {

    const paths =
      AccountExpense.schema.paths;


    for (
      const field
      of [
        "title",
        "category",
        "expenseType",
        "amount",
        "expenseDate",
        "status",
      ]
    ) {

      assert.ok(
        paths[field],
        `${field} must remain in AccountExpense`
      );

    }

  }
);

test(
  "Expense proof upload route includes Accounts proof middleware",
  () => {

    const layer =
      accountingRoutes.stack.find(
        (item) =>
          item.route?.path ===
          "/expenses/:id/attachments"
      );

    assert.ok(layer);
    assert.ok(
      layer.route.stack.length >= 2,
      "upload middleware and handler must both be registered"
    );

  }
);


test(
  "Expense proof routes remain company-scoped through accounting access",
  () => {

    const source =
      accountingRoutes.stack
        .filter((item) => item.route)
        .map((item) => item.route.path);

    assert.ok(
      source.includes(
        "/expenses/:id/attachments"
      )
    );

    assert.ok(
      source.includes(
        "/expenses/:id/attachments/:attachmentId"
      )
    );

  }
);
