import Joi from "joi";

const code = Joi.string().trim().uppercase().min(1).max(50);

const withHolidayAliases = (schema) => {
  return schema
    .rename("branchcode", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("branch_code", "branchCode", {
      ignoreUndefined: true,
      override: true,
    });
};

const holidayBaseSchema = Joi.object({
  branchCode: code.allow("", null),

  holidayName: Joi.string().trim().min(2).max(120).required(),

  date: Joi.date().required(),

  type: Joi.string()
    .valid("public", "company", "optional", "festival")
    .default("company"),

  description: Joi.string().trim().allow("", null),

  holidayColor: Joi.string()
    .trim()
    .pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .default("#2563eb"),

  isPaid: Joi.boolean().default(true),

  isActive: Joi.boolean().default(true),
});

export const createHolidaySchema = withHolidayAliases(holidayBaseSchema);

export const updateHolidaySchema = withHolidayAliases(
  holidayBaseSchema.fork(["holidayName", "date"], (schema) =>
    schema.optional()
  )
);
