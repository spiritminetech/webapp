// src/config/sidebarConfig.js
import {
  DashboardOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

export const SIDEBAR_CONFIG = [


    /* ================= WORKER ================= */
  {
    key: "worker",
    label: "Worker",
    icon: TeamOutlined,
    permission: "WORKER_TASK_VIEW",
    children: [
      {
        key: "/worker/dashboard",
        label: "Dashboard",
        icon: DashboardOutlined,
        permission: "WORKER_TASK_VIEW",
        path: "/worker/dashboard",
      },
      {
        key: "/worker/tasks",
        label: "My Tasks",
        icon: CheckSquareOutlined,
        permission: "WORKER_TASK_VIEW",
        path: "/worker/tasks",
      },
      {
        key: "/worker/today-trip",
        label: "Today Trip",
        icon: ScheduleOutlined,
        permission: "WORKER_TRIP_VIEW",
        path: "/worker/today-trip",
      },
      
    ],
  },

   {
    key: "driver",
    label: "Driver",
    icon: UserOutlined,
    permission: "DRIVER_TASK_VIEW",
    children: [
      {
        key: "/driver/tasks",
        label: "My Tasks",
        icon: CheckSquareOutlined,
        permission: "DRIVER_TASK_VIEW",
        path: "/driver/tasks",
      },
      {
        key: "/driver/trip-history",
        label: "Trip History",
        icon: HistoryOutlined,
        permission: "DRIVER_HISTORY_VIEW",
        path: "/driver/trip-history",
      },
    ],
  },

   {
    key: "attendance",
    label: "Attendance",
    icon: CheckSquareOutlined,
    children: [
      {
        key: "/attendance",
        label: "GeoFence Attendance",
        icon: CheckSquareOutlined,
        permission: "COMMON_ATTENDANCE_VIEW",
        path: "/attendance",
      },
      {
        key: "/attendance/history",
        label: "Attendance History",
        icon: HistoryOutlined,
        permission: "COMMON_ATTENDANCE_VIEW",
        path: "/attendance/history",
      }, {
        key: "/leave/request",
        label: "Leave Request",
        icon: ScheduleOutlined,
        permission: "LEAVE_REQUEST_VIEW",
        path: "/leave/request",
      },
    ],
  },
  

  /* ================= DRIVER ================= */
 

  /* ================= ATTENDANCE ================= */
 

  /* ================= TASKS (ROLE BASED) ================= */
  {
    key: "tasks",
    label: "Tasks",
    icon: FileTextOutlined,
    permission: "ADMIN_TASK_VIEW",
    children: [
      {
        key: "/admin/tasks",
        label: "Admin Tasks",
        icon: FileTextOutlined,
        permission: "ADMIN_TASK_VIEW",
        path: "/admin/tasks",
      },
      {
        key: "/boss/tasks",
        label: "Boss Tasks",
        icon: FileTextOutlined,
        permission: "BOSS_TASK_VIEW",
        path: "/boss/tasks",
      },
      {
        key: "/manager/tasks",
        label: "Manager Tasks",
        icon: FileTextOutlined,
        permission: "MANAGER_TASK_VIEW",
        path: "/manager/tasks",
      },
    ],
  },

  /* ================= SUPERVISOR ================= */
  {
    key: "supervisor",
    label: "Supervisor",
    icon: DashboardOutlined,
    permission: "SUPERVISOR_DASHBOARD_VIEW",
    children: [
      {
        key: "/supervisor/dashboard",
        label: "Dashboard",
        icon: DashboardOutlined,
        permission: "SUPERVISOR_DASHBOARD_VIEW",
        path: "/supervisor/dashboard",
      },
      {
        key: "/supervisor/tasks",
        label: "Task Assignment",
        icon: CheckSquareOutlined,
        permission: "SUPERVISOR_TASK_ASSIGN",
        path: "/supervisor/tasks",
      },
      {
        key: "/supervisor/review-tasks",
        label: "Task Review",
        icon: FileTextOutlined,
        permission: "SUPERVISOR_TASK_REVIEW",
        path: "/supervisor/review-tasks",
      },
      {
        key: "/supervisor/daily-progress",
        label: "Daily Progress",
        icon: ScheduleOutlined,
        permission: "SUPERVISOR_PROGRESS_VIEW",
        path: "/supervisor/daily-progress",
      }, {
        key: "/leave/request",
        label: "Leave Pending",
        icon: ScheduleOutlined,
        permission: "LEAVE_PENDING_VIEW",
        path: "/leave/pending/request",
      },
    ],
  },

  /* ================= PROFILE ================= */
  {
    key: "/profile",
    label: "Profile",
    icon: UserOutlined,
    permission: "PROFILE_VIEW",
    path: "/profile",
  },
];


