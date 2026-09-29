import mongoose from "mongoose";

import warehouseTaskRepository
  from "../repositories/warehouseTask.repository.js";

import warehouseRepository
  from "../repositories/warehouse.repository.js";

import { Employee }
  from "../models/Employee.js";

import { ApiError }
  from "../utils/apiError.js";

const MANAGEMENT_ACCESS_TYPE =
  "management";

class WarehouseTaskService {
  async createTask({
    companyId,
    userId = null,
    employeeId = null,
    accessType = "employee",
    payload,
  }) {
    this.assertCompanyId(companyId);

    if (payload.warehouseId) {
      this.assertObjectId(
        payload.warehouseId,
        "Invalid warehouse ID"
      );

      const warehouse =
        await warehouseRepository.findById({
          companyId,
          warehouseId: payload.warehouseId,
        });

      if (!warehouse) {
        throw new ApiError(
          404,
          "Warehouse not found"
        );
      }
    }

    let assignedToEmployeeId = null;

    if (payload.assignedToEmployeeId) {
      this.assertObjectId(
        payload.assignedToEmployeeId,
        "Invalid employee ID"
      );

      const employee =
        await Employee.findOne({
          _id: payload.assignedToEmployeeId,
          companyId,
        })
          .select("_id")
          .lean();

      if (!employee) {
        throw new ApiError(
          404,
          "Assigned employee not found"
        );
      }

      assignedToEmployeeId =
        payload.assignedToEmployeeId;
    } else if (accessType !== MANAGEMENT_ACCESS_TYPE) {
      assignedToEmployeeId = employeeId || null;
    }

    return warehouseTaskRepository.create({
      companyId,

      warehouseId: payload.warehouseId || null,

      title: payload.title,

      description: payload.description || "",

      assignedToEmployeeId,

      assignedByUserId: userId,

      priority: payload.priority || "normal",

      dueDate: payload.dueDate
        ? new Date(payload.dueDate)
        : null,

      status: "open",

      remarks: payload.remarks || "",

      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listTasks({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseTaskRepository.paginate({
      companyId,
      ...query,
    });
  }

  async listMyTasks({
    companyId,
    employeeId,
    query,
  }) {
    this.assertCompanyId(companyId);

    if (!employeeId) {
      throw new ApiError(
        403,
        "My Tasks is available to warehouse employees"
      );
    }

    return warehouseTaskRepository.paginateMine({
      companyId,
      employeeId,
      ...query,
    });
  }

  async getTask({
    companyId,
    taskId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      taskId,
      "Invalid task ID"
    );

    const record =
      await warehouseTaskRepository.findById({
        companyId,
        taskId,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Task not found"
      );
    }

    return record;
  }

  async updateTask({
    companyId,
    taskId,
    userId = null,
    employeeId = null,
    accessType = "employee",
    payload,
  }) {
    const current = await this.getTask({
      companyId,
      taskId,
    });

    const isManagement =
      accessType === MANAGEMENT_ACCESS_TYPE;

    const isCreator =
      current.createdBy &&
      String(current.createdBy) ===
        String(userId);

    if (!isManagement && !isCreator) {
      throw new ApiError(
        403,
        "Only management or the task creator can edit this task"
      );
    }

    const update = {
      updatedBy: userId,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "title"
      )
    ) {
      update.title = payload.title;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "description"
      )
    ) {
      update.description =
        payload.description || "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "priority"
      )
    ) {
      update.priority = payload.priority;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "dueDate"
      )
    ) {
      update.dueDate = payload.dueDate
        ? new Date(payload.dueDate)
        : null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "remarks"
      )
    ) {
      update.remarks = payload.remarks || "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "warehouseId"
      )
    ) {
      if (payload.warehouseId) {
        this.assertObjectId(
          payload.warehouseId,
          "Invalid warehouse ID"
        );

        const warehouse =
          await warehouseRepository.findById({
            companyId,
            warehouseId: payload.warehouseId,
          });

        if (!warehouse) {
          throw new ApiError(
            404,
            "Warehouse not found"
          );
        }

        update.warehouseId = payload.warehouseId;
      } else {
        update.warehouseId = null;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "assignedToEmployeeId"
      )
    ) {
      if (payload.assignedToEmployeeId) {
        this.assertObjectId(
          payload.assignedToEmployeeId,
          "Invalid employee ID"
        );

        const employee =
          await Employee.findOne({
            _id: payload.assignedToEmployeeId,
            companyId,
          })
            .select("_id")
            .lean();

        if (!employee) {
          throw new ApiError(
            404,
            "Assigned employee not found"
          );
        }

        update.assignedToEmployeeId =
          payload.assignedToEmployeeId;
      } else {
        update.assignedToEmployeeId = null;
      }
    }

    const record =
      await warehouseTaskRepository.updateById({
        companyId,
        taskId,
        payload: update,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Task not found"
      );
    }

    return record;
  }

  async start({
    companyId,
    taskId,
    userId = null,
    employeeId = null,
    accessType = "employee",
  }) {
    const current = await this.getTask({
      companyId,
      taskId,
    });

    this.assertCanChangeStatus({
      task: current,
      userId,
      employeeId,
      accessType,
    });

    if (current.status !== "open") {
      throw new ApiError(
        400,
        "Only open tasks can be started"
      );
    }

    const record =
      await warehouseTaskRepository.updateById({
        companyId,
        taskId,
        payload: {
          status: "in_progress",
          updatedBy: userId,
        },
      });

    if (!record) {
      throw new ApiError(
        404,
        "Task not found"
      );
    }

    return record;
  }

  async complete({
    companyId,
    taskId,
    userId = null,
    employeeId = null,
    accessType = "employee",
  }) {
    const current = await this.getTask({
      companyId,
      taskId,
    });

    this.assertCanChangeStatus({
      task: current,
      userId,
      employeeId,
      accessType,
    });

    if (
      current.status !== "open" &&
      current.status !== "in_progress"
    ) {
      throw new ApiError(
        400,
        "Only open or in-progress tasks can be completed"
      );
    }

    const record =
      await warehouseTaskRepository.updateById({
        companyId,
        taskId,
        payload: {
          status: "completed",
          completedAt: new Date(),
          updatedBy: userId,
        },
      });

    if (!record) {
      throw new ApiError(
        404,
        "Task not found"
      );
    }

    return record;
  }

  async cancel({
    companyId,
    taskId,
    userId = null,
    employeeId = null,
    accessType = "employee",
  }) {
    const current = await this.getTask({
      companyId,
      taskId,
    });

    this.assertCanChangeStatus({
      task: current,
      userId,
      employeeId,
      accessType,
    });

    if (
      current.status !== "open" &&
      current.status !== "in_progress"
    ) {
      throw new ApiError(
        400,
        "Only open or in-progress tasks can be cancelled"
      );
    }

    const record =
      await warehouseTaskRepository.updateById({
        companyId,
        taskId,
        payload: {
          status: "cancelled",
          updatedBy: userId,
        },
      });

    if (!record) {
      throw new ApiError(
        404,
        "Task not found"
      );
    }

    return record;
  }

  async deleteTask({
    companyId,
    taskId,
    userId = null,
    accessType = "employee",
  }) {
    if (accessType !== MANAGEMENT_ACCESS_TYPE) {
      throw new ApiError(
        403,
        "Only management can delete tasks"
      );
    }

    const current = await this.getTask({
      companyId,
      taskId,
    });

    await warehouseTaskRepository.softDelete({
      companyId,
      taskId,
      userId,
    });

    return {
      taskId: current._id,
      deleted: true,
    };
  }

  async getSummary({
    companyId,
    employeeId = null,
  }) {
    this.assertCompanyId(companyId);

    const { rows, overdue, mine } =
      await warehouseTaskRepository.summary({
        companyId:
          new mongoose.Types.ObjectId(
            String(companyId)
          ),
        employeeId: employeeId || null,
      });

    const summary = {
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: Number(overdue || 0),
      mine: Number(mine || 0),
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "open":
          summary.open = count;
          break;
        case "in_progress":
          summary.inProgress = count;
          break;
        case "completed":
          summary.completed = count;
          break;
        case "cancelled":
          summary.cancelled = count;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  assertCanChangeStatus({
    task,
    userId,
    employeeId,
    accessType,
  }) {
    if (accessType === MANAGEMENT_ACCESS_TYPE) {
      return;
    }

    const isCreator =
      task.createdBy &&
      String(task.createdBy) === String(userId);

    const isAssignee =
      employeeId &&
      task.assignedToEmployeeId &&
      String(task.assignedToEmployeeId) ===
        String(employeeId);

    const isUnassignedPool =
      !task.assignedToEmployeeId &&
      employeeId;

    if (
      !isCreator &&
      !isAssignee &&
      !isUnassignedPool
    ) {
      throw new ApiError(
        403,
        "Only the assignee, the task creator, or management can change this task"
      );
    }
  }

  assertCompanyId(companyId) {
    if (
      !companyId ||
      !mongoose.isValidObjectId(companyId)
    ) {
      throw new ApiError(
        400,
        "Invalid company ID"
      );
    }
  }

  assertObjectId(value, message) {
    if (!mongoose.isValidObjectId(value)) {
      throw new ApiError(400, message);
    }
  }
}

export const warehouseTaskService =
  new WarehouseTaskService();

export default warehouseTaskService;