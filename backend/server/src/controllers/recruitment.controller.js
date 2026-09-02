import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createJobOpeningSchema,
  updateJobOpeningSchema,
  updateJobStatusSchema,

  createCandidateSchema,
  updateCandidateSchema,
  updateCandidateStatusSchema,

  createInterviewSchema,
  updateInterviewSchema,
  updateInterviewResultSchema,
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  acceptOfferSchema,
  convertCandidateSchema,
} from "../validators/recruitment.validator.js";

import {
  createJobOpeningService,
  getJobOpeningsService,
  getJobOpeningByIdService,
  updateJobOpeningService,
  updateJobStatusService,
  deleteJobOpeningService,

  createCandidateService,
  getCandidatesService,
  getCandidateByIdService,
  updateCandidateService,
  updateCandidateStatusService,
  deleteCandidateService,

  createInterviewService,
  getInterviewsService,
  getInterviewByIdService,
  updateInterviewService,
  updateInterviewResultService,
  deleteInterviewService,
  createOfferService,
  getOffersService,
  getOfferByIdService,
  updateOfferService,
  updateOfferStatusService,
  acceptOfferService,
  deleteOfferService,
  getCandidateConversionPreviewService,
  convertCandidateToEmployeeService,

  getRecruitmentDashboardService,
} from "../services/recruitment.service.js";

/* ================= JOB OPENINGS ================= */

export const createJobOpening = asyncHandler(async (req, res) => {
  const { value, error } = createJobOpeningSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createJobOpeningService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Job opening created successfully"));
});

export const getJobOpenings = asyncHandler(async (req, res) => {
  const data = await getJobOpeningsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Job openings fetched successfully"));
});

export const getJobOpeningById = asyncHandler(async (req, res) => {
  const data = await getJobOpeningByIdService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, data, "Job opening fetched successfully"));
});

export const updateJobOpening = asyncHandler(async (req, res) => {
  const { value, error } = updateJobOpeningSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateJobOpeningService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Job opening updated successfully"));
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateJobStatusSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateJobStatusService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Job status updated successfully"));
});

export const deleteJobOpening = asyncHandler(async (req, res) => {
  await deleteJobOpeningService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Job opening deleted successfully"));
});

/* ================= CANDIDATES ================= */

export const createCandidate = asyncHandler(async (req, res) => {
  const { value, error } = createCandidateSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createCandidateService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Candidate created successfully"));
});

export const getCandidates = asyncHandler(async (req, res) => {
  const data = await getCandidatesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Candidates fetched successfully"));
});

export const getCandidateById = asyncHandler(async (req, res) => {
  const data = await getCandidateByIdService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, data, "Candidate fetched successfully"));
});

export const updateCandidate = asyncHandler(async (req, res) => {
  const { value, error } = updateCandidateSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateCandidateService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Candidate updated successfully"));
});

export const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateCandidateStatusSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateCandidateStatusService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Candidate status updated successfully"));
});

export const deleteCandidate = asyncHandler(async (req, res) => {
  await deleteCandidateService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Candidate deleted successfully"));
});

/* ================= INTERVIEWS ================= */

export const createInterview = asyncHandler(async (req, res) => {
  const { value, error } = createInterviewSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createInterviewService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Interview scheduled successfully"));
});

export const getInterviews = asyncHandler(async (req, res) => {
  const data = await getInterviewsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Interviews fetched successfully"));
});

export const getInterviewById = asyncHandler(async (req, res) => {
  const data = await getInterviewByIdService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, data, "Interview fetched successfully"));
});

export const updateInterview = asyncHandler(async (req, res) => {
  const { value, error } = updateInterviewSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateInterviewService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Interview updated successfully"));
});

export const updateInterviewResult = asyncHandler(async (req, res) => {
  const { value, error } = updateInterviewResultSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateInterviewResultService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Interview result updated successfully"));
});

export const deleteInterview = asyncHandler(async (req, res) => {
  await deleteInterviewService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Interview deleted successfully"));
});

/* ================= DASHBOARD ================= */

export const getRecruitmentDashboard = asyncHandler(async (req, res) => {
  const data = await getRecruitmentDashboardService(req.user);

  res.status(200).json(new ApiResponse(200, data, "Recruitment dashboard fetched successfully"));
});

/* ================= OFFER LETTERS ================= */

export const createOffer = asyncHandler(async (req, res) => {
  const { value, error } = createOfferSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createOfferService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, data, "Offer created successfully"));
});

export const getOffers = asyncHandler(async (req, res) => {
  const data = await getOffersService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Offers fetched successfully"));
});

export const getOfferById = asyncHandler(async (req, res) => {
  const data = await getOfferByIdService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Offer fetched successfully"));
});

export const updateOffer = asyncHandler(async (req, res) => {
  const { value, error } = updateOfferSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateOfferService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Offer updated successfully"));
});

export const updateOfferStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateOfferStatusSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateOfferStatusService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Offer status updated successfully"));
});

export const acceptOffer = asyncHandler(async (req, res) => {
  const { value, error } = acceptOfferSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await acceptOfferService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Offer accepted successfully"));
});

export const deleteOffer = asyncHandler(async (req, res) => {
  await deleteOfferService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Offer deleted successfully"));
});

/* ================= CANDIDATE CONVERSION ================= */

export const getCandidateConversionPreview = asyncHandler(async (req, res) => {
  const data = await getCandidateConversionPreviewService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Candidate conversion preview fetched"));
});

export const convertCandidateToEmployee = asyncHandler(async (req, res) => {
  const { value, error } = convertCandidateSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await convertCandidateToEmployeeService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(201)
    .json(new ApiResponse(201, data, "Candidate converted to employee successfully"));
});