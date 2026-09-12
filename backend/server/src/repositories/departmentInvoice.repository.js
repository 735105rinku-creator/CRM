import DepartmentInvoice
  from "../models/DepartmentInvoice.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegExp = (
  value = ""
) =>
  String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );


/* ============================================================
   REPOSITORY
============================================================ */

class DepartmentInvoiceRepository {


  /* ==========================================================
     FIND BY SOURCE

     Central source identity:

     companyId
     +
     sourceModule
     +
     sourceRecordId
  ========================================================== */

  findBySource(
    companyId,
    sourceModule,
    sourceRecordId,
    options = {}
  ) {

    const query =
      DepartmentInvoice
        .findOne({

          companyId,

          sourceModule,

          sourceRecordId,
        });


    if (
      options.session
    ) {

      query.session(
        options.session
      );
    }


    return query.lean();
  }


  /* ==========================================================
     IDEMPOTENT CREATE

     Existing source record is returned instead of creating
     another DepartmentInvoice.

     Duplicate-key fallback protects the flow when the unique
     source index already exists in the database.

     No database/index creation is performed here.
  ========================================================== */

  async createIdempotent(
    data,
    options = {}
  ) {

    const existing =
      await this.findBySource(
        data.companyId,
        data.sourceModule,
        data.sourceRecordId,
        options
      );


    if (
      existing
    ) {

      return existing;
    }


    try {

      const createOptions =
        options.session
          ? {
              session:
                options.session,
            }
          : undefined;


      const [
        created,
      ] =
        await DepartmentInvoice
          .create(
            [
              data,
            ],
            createOptions
          );


      return created
        .toObject();

    } catch (
      error
    ) {

      if (
        error?.code !==
        11000
      ) {

        throw error;
      }


      return this.findBySource(
        data.companyId,
        data.sourceModule,
        data.sourceRecordId,
        options
      );
    }
  }


  /* ==========================================================
     LIST / FILTER / SEARCH
  ========================================================== */

  async list(
    companyId,
    query = {}
  ) {

    const filter = {

      companyId,
    };


    if (
      query.status
    ) {

      filter.status =
        query.status;
    }


    if (
      query.sourceDepartment
    ) {

      filter.sourceDepartment =
        query.sourceDepartment;
    }


    if (
      query.sourceModule
    ) {

      filter.sourceModule =
        query.sourceModule;
    }


    if (
      query.search
    ) {

      const searchPattern =
        new RegExp(
          escapeRegExp(
            query.search
          ),
          "i"
        );


      filter.$or = [

        {
          invoiceNumber:
            searchPattern,
        },

        {
          partyName:
            searchPattern,
        },

        {
          sentToAccountsByName:
            searchPattern,
        },

      ];
    }


    const page =
      Math.max(
        Number(
          query.page
        ) ||
        1,
        1
      );


    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) ||
          20,
          1
        ),
        100
      );


    const skip =
      (
        page -
        1
      ) *
      limit;


    const [
      rows,
      total,
    ] =
      await Promise.all([

        DepartmentInvoice
          .find(
            filter
          )
          .sort({
            sentToAccountsAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
          .lean(),

        DepartmentInvoice
          .countDocuments(
            filter
          ),

      ]);


    return {

      rows,

      pagination: {

        total,

        page,

        limit,

        pages:
          Math.max(
            Math.ceil(
              total /
              limit
            ),
            1
          ),
      },
    };
  }


  /* ==========================================================
     FIND BY ID

     companyId is always included to preserve tenant isolation.
  ========================================================== */

  findById(
    companyId,
    id,
    options = {}
  ) {

    const query =
      DepartmentInvoice
        .findOne({

          _id:
            id,

          companyId,
        });


    if (
      options.session
    ) {

      query.session(
        options.session
      );
    }


    return query.lean();
  }


  /* ==========================================================
     CONDITIONAL UPDATE

     Used for:
     - verification
     - rejection
     - payment
     - Purchase settlement refresh

     Extra filter enables optimistic/conditional state changes.
  ========================================================== */

  updateById(
    companyId,
    id,
    filter = {},
    update,
    options = {}
  ) {

    const updateOptions = {

      new:
        true,

      runValidators:
        true,
    };


    if (
      options.session
    ) {

      updateOptions.session =
        options.session;
    }


    return DepartmentInvoice
      .findOneAndUpdate(
        {

          ...filter,

          _id:
            id,

          companyId,
        },

        update,

        updateOptions
      )
      .lean();
  }

}


export default
  new DepartmentInvoiceRepository();