import { lazy } from 'react';

// Maps each `page` key in navigation.js to its component. Pages load on first visit, so the
// initial download stays small.
const named = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const dashboards = () => import('../pages/dashboards/DashboardPages');
const attendance = () => import('../pages/attendance/AttendancePages');
const leaves = () => import('../pages/leaves/LeavePages');
const employees = () => import('../pages/employees/EmployeesPage');

const pages = {
  employeeDashboard: named(dashboards, 'EmployeeDashboard'),
  managerDashboard: named(dashboards, 'ManagerDashboard'),
  hrDashboard: named(dashboards, 'HrDashboard'),
  myAttendance: named(attendance, 'MyAttendancePage'),
  managerAttendance: named(attendance, 'ManagerAttendancePage'),
  allAttendance: named(attendance, 'AllAttendancePage'),
  myLeaves: named(leaves, 'MyLeavesPage'),
  managerLeaves: named(leaves, 'ManagerLeavesPage'),
  allLeaves: named(leaves, 'AllLeavesPage'),
  employees: lazy(employees),
  managers: named(employees, 'ManagersPage'),
  team: lazy(() => import('../pages/employees/TeamPage')),
  profile: lazy(() => import('../pages/employees/ProfilePage')),
  training: lazy(() => import('../pages/training/TrainingPage')),
  announcements: lazy(() => import('../pages/announcements/AnnouncementsPage')),
  reports: lazy(() => import('../pages/reports/ReportsPage')),
  notifications: lazy(() => import('../pages/notifications/NotificationsPage')),
  companySettings: lazy(() => import('../pages/organisation/OrganisationSettingsPage')),
};

export default pages;
