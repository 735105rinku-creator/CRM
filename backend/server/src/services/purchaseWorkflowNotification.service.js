import { Employee } from "../models/Employee.js";
import {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPE,
} from "../models/Notification.js";
import { createNotificationRecord } from "../repositories/communication.repository.js";
import { emitNotificationToUser } from "../socket/socket.js";


const objectIdOf =
  value =>
    value?._id ||
    value ||
    null;


export const findPurchaseSeniorUserId =
  async ({
    companyId,
    requesterUserId,
  }) => {

    try {

    const requester =
      await Employee
        .findOne({
          companyId,
          userId: requesterUserId,
        })
        .select("departmentId reportingManagerId")
        .lean();


    if (!requester?.departmentId) {
      return null;
    }


    const activeFilter = {
      companyId,
      departmentId: requester.departmentId,
      employeeStatus: "active",
      isActive: true,
      userId: { $ne: null },
    };


    if (requester.reportingManagerId) {
      const manager =
        await Employee
          .findOne({
            ...activeFilter,
            _id: requester.reportingManagerId,
            organizationRole: {
              $in: [
                "department_head",
                "team_leader",
              ],
            },
          })
          .select("userId")
          .lean();


      if (
        manager?.userId &&
        String(manager.userId) !== String(requesterUserId)
      ) {
        return manager.userId;
      }
    }


    for (const organizationRole of [
      "department_head",
      "team_leader",
    ]) {
      const approver =
        await Employee
          .findOne({
            ...activeFilter,
            organizationRole,
            userId: {
              $nin: [
                null,
                requesterUserId,
              ],
            },
          })
          .select("userId")
          .lean();


      if (approver?.userId) {
        return approver.userId;
      }
    }


    return null;
    } catch (error) {
      console.error(
        "Purchase approver notification lookup failed:",
        error
      );

      return null;
    }
  };


export const sendPurchaseWorkflowNotification =
  async ({
    companyId,
    recipientUserId,
    senderUserId,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
  }) => {

    const recipientId =
      objectIdOf(recipientUserId);

    const senderId =
      objectIdOf(senderUserId);


    if (
      !recipientId ||
      String(recipientId) === String(senderId)
    ) {
      return;
    }


    try {
      const notification =
        await createNotificationRecord({
          companyId,
          recipientUserId: recipientId,
          senderUserId: senderId,
          type: NOTIFICATION_TYPE.SYSTEM,
          title,
          message,
          entityType,
          entityId,
          priority: NOTIFICATION_PRIORITY.NORMAL,
          actionUrl,
          createdBy: senderId,
        });


      emitNotificationToUser(
        String(recipientId),
        notification
      );
    } catch (error) {
      console.error(
        `${entityType} notification delivery failed:`,
        error
      );
    }
  };
