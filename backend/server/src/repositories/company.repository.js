import { Company } from "../models/Company.js";

export const createCompanyRecord = async (payload) => {
  return Company.create(payload);
};

export const findCompanyById = async (id) => {
  return Company.findById(id);
};

export const findCompanyByCode = async (companyCode) => {
  return Company.findOne({
    companyCode: companyCode.toUpperCase(),
  });
};

export const findCompanyByEmail = async (email) => {
  return Company.findOne({
    email: email.toLowerCase(),
  });
};

export const updateCompanyById = async (id, payload) => {
  return Company.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteCompanyById = async (id) => {
  return Company.findByIdAndDelete(id);
};

export const listCompanies = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Company.countDocuments(filter),
  ]);

  return {
    companies,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};