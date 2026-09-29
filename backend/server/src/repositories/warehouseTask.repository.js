import WarehouseTask
  from "../models/WarehouseTask.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

class WarehouseTaskRepository {
  async create(payload) {
    return WarehouseTask.create(payload);
  }

  async findById({
    companyId,
    taskId,
  }) {
    return WarehouseTask.findOne({
      _id: taskId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    warehouseId = "",
    status = "",
    priority = "",
    assignedToEmployeeId = "",
    overdue = false,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: { $ne: false },
    };

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignedToEmployeeId) {
      filter.assignedToEmployeeId =
        assignedToEmployeeId;
    }

    if (overdue) {
      filter.status = {
        $in: ["open", "in_progress"],
      };
      filter.dueDate = { $lt: new Date() };
    }

    const q = String(search || "").trim();

    if (q) {
      const regex = new RegExp(
        escapeRegex(q),
        "i"
      );

      filter.$or = [
        { title: regex },
        { description: regex },
        { remarks: regex },
      ];
    }

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const allowedSort = new Set([
      "createdAt",
      "updatedAt",
      "dueDate",
      "priority",
      "status",
      "title",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseTask.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseTask.countDocuments(filter),
    ]);

    const totalPages = Math.max(
      Math.ceil(total / safeLimit),
      1
    );

    return {
      data,

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,

        hasNextPage:
          safePage < totalPages,

        hasPreviousPage:
          safePage > 1,
      },
    };
  }

  async paginateMine({
    companyId,
    employeeId,
    warehouseId = "",
    page = 1,
    limit = 20,
    status = "",
    priority = "",
    overdue = false,
    search = "",
    sortBy = "dueDate",
    sortOrder = "asc",
  }) {
    const base = {
      companyId,
      isActive: { $ne: false },
    };

    if (warehouseId) {
      base.warehouseId = warehouseId;
    }

    if (status) {
      base.status = status;
    }

    if (priority) {
      base.priority = priority;
    }

    if (overdue) {
      base.status = {
        $in: ["open", "in_progress"],
      };
      base.dueDate = { $lt: new Date() };
    }

    const q = String(search || "").trim();

    const searchClause = q
      ? {
          $or: [
            {
              title: new RegExp(
                escapeRegex(q),
                "i"
              ),
            },
            {
              description: new RegExp(
                escapeRegex(q),
                "i"
              ),
            },
          ],
        }
      : {};

    const scopeClause = {
      $or: [
        { assignedToEmployeeId: employeeId },
        { assignedToEmployeeId: null },
      ],
    };

    const filter = {
      ...base,
      ...searchClause,
      ...scopeClause,
    };

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const allowedSort = new Set([
      "createdAt",
      "updatedAt",
      "dueDate",
      "priority",
      "status",
      "title",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "dueDate";

    const direction =
      sortOrder === "desc" ? -1 : 1;

    const [data, total] = await Promise.all([
      WarehouseTask.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseTask.countDocuments(filter),
    ]);

    const totalPages = Math.max(
      Math.ceil(total / safeLimit),
      1
    );

    return {
      data,

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,

        hasNextPage:
          safePage < totalPages,

        hasPreviousPage:
          safePage > 1,
      },
    };
  }

  async updateById({
    companyId,
    taskId,
    payload,
  }) {
    return WarehouseTask.findOneAndUpdate(
      {
        _id: taskId,
        companyId,
        isActive: { $ne: false },
      },
      {
        $set: payload,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async softDelete({
    companyId,
    taskId,
    userId,
  }) {
    return WarehouseTask.findOneAndUpdate(
      {
        _id: taskId,
        companyId,
        isActive: { $ne: false },
      },
      {
        $set: {
          isActive: false,
          updatedBy: userId,
        },
      },
      {
        new: true,
      }
    ).lean();
  }

  async summary({
    companyId,
    employeeId,
  }) {
    const companyObjectId =
      companyId;

    const rows = await WarehouseTask.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          isActive: { $ne: false },
        },
      },

      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const now = new Date();

    const overdue = await WarehouseTask.countDocuments({
      companyId,
      isActive: { $ne: false },
      status: { $in: ["open", "in_progress"] },
      dueDate: { $lt: now },
    });

    let mine = 0;

    if (employeeId) {
      mine = await WarehouseTask.countDocuments({
        companyId,
        isActive: { $ne: false },
        status: { $in: ["open", "in_progress"] },
        $or: [
          { assignedToEmployeeId: employeeId },
          { assignedToEmployeeId: null },
        ],
      });
    }

    return { rows, overdue, mine };
  }
}

export const warehouseTaskRepository =
  new WarehouseTaskRepository();

export default warehouseTaskRepository;