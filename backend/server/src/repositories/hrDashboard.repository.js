import { Employee } from "../models/Employee.js";

import {
  countEmployees,
  employeeUserRoleLookupStages,
  visibleEmployeeMatchStage,
} from "./employee.repository.js";

import {
  Attendance,
  ATTENDANCE_STATUS,
} from "../models/Attendance.js";

import {
  LeaveRequest,
  LEAVE_REQUEST_STATUS,
} from "../models/LeaveRequest.js";

import { JobOpening } from "../models/JobOpening.js";

import { Candidate } from "../models/Candidate.js";

import { PayrollRun } from "../models/PayrollRun.js";

import { Payslip } from "../models/Payslip.js";

import { Holiday } from "../models/Holiday.js";

import { HREvent } from "../models/HREvent.js";

import { HRMeeting } from "../models/HRMeeting.js";


const startOfDay = (date = new Date()) => {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d;
};


const endOfDay = (date = new Date()) => {
  const d = new Date(date);

  d.setHours(23, 59, 59, 999);

  return d;
};


const startOfMonth = (date = new Date()) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
};


const endOfMonth = (date = new Date()) => {
  const d = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );

  d.setHours(23, 59, 59, 999);

  return d;
};


/* ================= EMPLOYEE ================= */

export const getEmployeeSummary = async (companyId) => {
  const now = new Date();

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    maleEmployees,
    femaleEmployees,
    otherEmployees,
    newJoinings,
  ] = await Promise.all([
    countEmployees({
      companyId,
    }),

    countEmployees({
      companyId,
      isActive: true,
    }),

    countEmployees({
      companyId,
      isActive: false,
    }),

    countEmployees({
      companyId,
      gender: "male",
    }),

    countEmployees({
      companyId,
      gender: "female",
    }),

    countEmployees({
      companyId,
      gender: "other",
    }),

    countEmployees({
      companyId,

      joiningDate: {
        $gte: startOfMonth(now),
        $lte: endOfMonth(now),
      },
    }),
  ]);

  return {
    totalEmployees,

    activeEmployees,

    inactiveEmployees,

    gender: {
      male: maleEmployees,

      female: femaleEmployees,

      other: otherEmployees,
    },

    newJoinings,
  };
};


export const getUpcomingBirthdays = async (
  companyId,
  limit = 10
) => {
  const today = new Date();

  const currentMonth =
    today.getMonth() + 1;

  const currentDay =
    today.getDate();

  return Employee.aggregate([
    ...employeeUserRoleLookupStages,

    visibleEmployeeMatchStage(
      companyId,
      {
        isActive: true,

        dateOfBirth: {
          $ne: null,
        },
      }
    ),

    {
      $addFields: {
        birthMonth: {
          $month: "$dateOfBirth",
        },

        birthDay: {
          $dayOfMonth: "$dateOfBirth",
        },
      },
    },

    {
      $match: {
        $or: [
          {
            birthMonth: {
              $gt: currentMonth,
            },
          },

          {
            birthMonth:
              currentMonth,

            birthDay: {
              $gte: currentDay,
            },
          },
        ],
      },
    },

    {
      $sort: {
        birthMonth: 1,
        birthDay: 1,
      },
    },

    {
      $limit: limit,
    },

    {
      $project: {
        employeeCode: 1,

        displayName: 1,

        dateOfBirth: 1,

        birthMonth: 1,

        birthDay: 1,
      },
    },
  ]);
};


export const getUpcomingWorkAnniversaries =
  async (
    companyId,
    limit = 10
  ) => {
    const today = new Date();

    const currentMonth =
      today.getMonth() + 1;

    const currentDay =
      today.getDate();

    return Employee.aggregate([
      ...employeeUserRoleLookupStages,

      visibleEmployeeMatchStage(
        companyId,
        {
          isActive: true,

          joiningDate: {
            $ne: null,
          },
        }
      ),

      {
        $addFields: {
          joinMonth: {
            $month:
              "$joiningDate",
          },

          joinDay: {
            $dayOfMonth:
              "$joiningDate",
          },
        },
      },

      {
        $match: {
          $or: [
            {
              joinMonth: {
                $gt:
                  currentMonth,
              },
            },

            {
              joinMonth:
                currentMonth,

              joinDay: {
                $gte:
                  currentDay,
              },
            },
          ],
        },
      },

      {
        $sort: {
          joinMonth: 1,

          joinDay: 1,
        },
      },

      {
        $limit: limit,
      },

      {
        $project: {
          employeeCode: 1,

          displayName: 1,

          joiningDate: 1,

          joinMonth: 1,

          joinDay: 1,
        },
      },
    ]);
  };


export const getDepartmentWiseEmployees =
  async (companyId) => {
    return Employee.aggregate([
      ...employeeUserRoleLookupStages,

      visibleEmployeeMatchStage(
        companyId,
        {
          isActive: true,
        }
      ),

      {
        $group: {
          _id: "$departmentId",

          total: {
            $sum: 1,
          },
        },
      },
    ]);
  };


export const getBranchWiseEmployees =
  async (companyId) => {
    return Employee.aggregate([
      ...employeeUserRoleLookupStages,

      visibleEmployeeMatchStage(
        companyId,
        {
          isActive: true,
        }
      ),

      {
        $group: {
          _id: "$branchId",

          total: {
            $sum: 1,
          },
        },
      },
    ]);
  };


/* ================= ATTENDANCE ================= */

export const getAttendanceSummaryToday =
  async (companyId) => {
    const today = startOfDay();

    const [
      present,
      absent,
      late,
      halfDay,
      onLeave,
    ] = await Promise.all([
      Attendance.countDocuments({
        companyId,

        attendanceDate:
          today,

        status:
          ATTENDANCE_STATUS.PRESENT,
      }),

      Attendance.countDocuments({
        companyId,

        attendanceDate:
          today,

        status:
          ATTENDANCE_STATUS.ABSENT,
      }),

      Attendance.countDocuments({
        companyId,

        attendanceDate:
          today,

        status:
          ATTENDANCE_STATUS.LATE,
      }),

      Attendance.countDocuments({
        companyId,

        attendanceDate:
          today,

        status:
          ATTENDANCE_STATUS.HALF_DAY,
      }),

      Attendance.countDocuments({
        companyId,

        attendanceDate:
          today,

        status:
          ATTENDANCE_STATUS.ON_LEAVE,
      }),
    ]);

    return {
      present,

      absent,

      late,

      halfDay,

      onLeave,
    };
  };


/*
 * Weekly attendance trend
 *
 * IMPORTANT:
 * - Uses actual Attendance documents only.
 * - Does not copy today's attendance into previous days.
 * - Week starts on Monday.
 * - Sunday is intentionally excluded because the current
 *   dashboard trend displays Monday through Saturday.
 * - "present" is the exact PRESENT status count.
 * - hasRecords tells the frontend whether attendance
 *   actually exists for that date.
 */
export const getWeeklyAttendanceTrend =
  async (companyId) => {
    const today =
      startOfDay(new Date());

    const dayOfWeek =
      today.getDay();

    /*
     * JavaScript:
     * Sunday = 0
     * Monday = 1
     * ...
     * Saturday = 6
     *
     * Convert that to the Monday of
     * the current calendar week.
     */
    const daysFromMonday =
      dayOfWeek === 0
        ? 6
        : dayOfWeek - 1;

    const monday =
      new Date(today);

    monday.setDate(
      monday.getDate() -
        daysFromMonday
    );

    monday.setHours(
      0,
      0,
      0,
      0
    );

    const saturday =
      new Date(monday);

    saturday.setDate(
      saturday.getDate() + 5
    );

    saturday.setHours(
      23,
      59,
      59,
      999
    );

    /*
     * Never query future attendance.
     *
     * Example:
     * If today is Thursday,
     * query Monday -> Thursday.
     *
     * If today is Saturday,
     * query Monday -> Saturday.
     *
     * If today is Sunday,
     * query the completed
     * Monday -> Saturday week.
     */
    const queryEnd =
      today.getDay() === 0
        ? saturday
        : endOfDay(
            today > saturday
              ? saturday
              : today
          );

    const attendanceRows =
      await Attendance.find({
        companyId,

        attendanceDate: {
          $gte: monday,
          $lte: queryEnd,
        },
      })
        .select(
          "attendanceDate status"
        )
        .lean();

    /*
     * Build a local-date key.
     *
     * We intentionally do NOT use
     * toISOString().slice(0, 10)
     * because attendance dates in
     * this project are normalized
     * using local midnight.
     */
    const dateKey = (date) => {
      const value =
        new Date(date);

      const year =
        value.getFullYear();

      const month =
        String(
          value.getMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          value.getDate()
        ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const totalsByDate =
      new Map();

    for (
      const row of attendanceRows
    ) {
      const key =
        dateKey(
          row.attendanceDate
        );

      if (
        !totalsByDate.has(key)
      ) {
        totalsByDate.set(
          key,
          {
            records: 0,

            present: 0,

            absent: 0,

            late: 0,

            halfDay: 0,

            onLeave: 0,
          }
        );
      }

      const totals =
        totalsByDate.get(key);

      totals.records += 1;

      switch (row.status) {
        case ATTENDANCE_STATUS.PRESENT:
          totals.present += 1;
          break;

        case ATTENDANCE_STATUS.ABSENT:
          totals.absent += 1;
          break;

        case ATTENDANCE_STATUS.LATE:
          totals.late += 1;
          break;

        case ATTENDANCE_STATUS.HALF_DAY:
          totals.halfDay += 1;
          break;

        case ATTENDANCE_STATUS.ON_LEAVE:
          totals.onLeave += 1;
          break;

        default:
          break;
      }
    }

    const dayLabels = [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];

    return dayLabels.map(
      (label, index) => {
        const date =
          new Date(monday);

        date.setDate(
          monday.getDate() +
            index
        );

        date.setHours(
          0,
          0,
          0,
          0
        );

        const key =
          dateKey(date);

        const totals =
          totalsByDate.get(key);

        const isFuture =
          date > today;

        return {
          day: label,

          date: key,

          hasRecords:
            !isFuture &&
            Boolean(
              totals?.records
            ),

          records:
            !isFuture
              ? totals?.records ??
                0
              : 0,

          present:
            !isFuture &&
            totals?.records
              ? totals.present
              : null,

          absent:
            !isFuture &&
            totals?.records
              ? totals.absent
              : null,

          late:
            !isFuture &&
            totals?.records
              ? totals.late
              : null,

          halfDay:
            !isFuture &&
            totals?.records
              ? totals.halfDay
              : null,

          onLeave:
            !isFuture &&
            totals?.records
              ? totals.onLeave
              : null,
        };
      }
    );
  };


/* ================= LEAVE ================= */

export const getLeaveSummary =
  async (companyId) => {
    const [
      pending,
      approved,
      rejected,
      cancelled,
    ] = await Promise.all([
      LeaveRequest.countDocuments({
        companyId,

        status:
          LEAVE_REQUEST_STATUS.PENDING,
      }),

      LeaveRequest.countDocuments({
        companyId,

        status:
          LEAVE_REQUEST_STATUS.APPROVED,
      }),

      LeaveRequest.countDocuments({
        companyId,

        status:
          LEAVE_REQUEST_STATUS.REJECTED,
      }),

      LeaveRequest.countDocuments({
        companyId,

        status:
          LEAVE_REQUEST_STATUS.CANCELLED,
      }),
    ]);

    return {
      pending,

      approved,

      rejected,

      cancelled,
    };
  };


export const getEmployeesOnLeaveToday =
  async (companyId) => {
    const today =
      startOfDay();

    return LeaveRequest.find({
      companyId,

      status:
        LEAVE_REQUEST_STATUS.APPROVED,

      fromDate: {
        $lte: today,
      },

      toDate: {
        $gte: today,
      },
    })
      .populate(
        "employeeId",
        "displayName employeeCode"
      )
      .populate(
        "leaveTypeId",
        "leaveName leaveCode colorCode"
      )
      .lean();
  };


/* ================= RECRUITMENT ================= */

export const getRecruitmentSummary =
  async (companyId) => {
    const [
      openJobs,
      totalCandidates,
      interviewsToday,
    ] = await Promise.all([
      JobOpening.countDocuments({
        companyId,

        status: "open",
      }),

      Candidate.countDocuments({
        companyId,
      }),

      Candidate.countDocuments({
        companyId,

        status:
          "interview_scheduled",
      }),
    ]);

    return {
      openJobs,

      totalCandidates,

      interviewsToday,
    };
  };


/* ================= PAYROLL ================= */

export const getPayrollSummary =
  async (companyId) => {
    const current =
      new Date();

    const payrollRun =
      await PayrollRun.findOne({
        companyId,

        month:
          current.getMonth() +
          1,

        year:
          current.getFullYear(),
      }).lean();

    const payslipsGenerated =
      await Payslip.countDocuments({
        companyId,

        month:
          current.getMonth() +
          1,

        year:
          current.getFullYear(),
      });

    return {
      currentMonthPayrollStatus:
        payrollRun?.status ||
        "not_created",

      payslipsGenerated,

      summary:
        payrollRun?.summary ||
        {},
    };
  };


/* ================= HOLIDAYS ================= */

export const getUpcomingHolidaySummary =
  async (
    companyId,
    limit = 5
  ) => {
    return Holiday.find({
      companyId,

      isActive: true,

      date: {
        $gte: startOfDay(),
      },
    })
      .sort({
        date: 1,
      })
      .limit(limit)
      .lean();
  };


/* ================= EVENTS ================= */

export const getUpcomingEventSummary =
  async (
    companyId,
    limit = 5
  ) => {
    return HREvent.find({
      companyId,

      startDateTime: {
        $gte: new Date(),
      },

      status: {
        $in: [
          "draft",
          "published",
        ],
      },
    })
      .sort({
        startDateTime: 1,
      })
      .limit(limit)
      .lean();
  };


/* ================= MEETINGS ================= */

export const getMeetingSummary =
  async (companyId) => {
    const todayStart =
      startOfDay();

    const todayEnd =
      endOfDay();

    const [
      todayMeetings,
      upcomingMeetings,
    ] = await Promise.all([
      HRMeeting.countDocuments({
        companyId,

        startDateTime: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      }),

      HRMeeting.find({
        companyId,

        startDateTime: {
          $gte: new Date(),
        },

        status: {
          $in: [
            "scheduled",
            "rescheduled",
          ],
        },
      })
        .sort({
          startDateTime: 1,
        })
        .limit(5)
        .lean(),
    ]);

    return {
      todayMeetings,

      upcomingMeetings,
    };
  };