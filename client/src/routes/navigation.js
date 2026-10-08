import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';

// Menu entries per role. Paths are relative to /<role>/. The page for each `page` key is
// looked up in routes/pages.js, so this file only describes the menu.
export const NAVIGATION = {
  employee: [
    { path: 'dashboard', label: 'Dashboard', icon: DashboardIcon, page: 'employeeDashboard' },
    { path: 'attendance', label: 'Attendance', icon: AccessTimeIcon, page: 'myAttendance' },
    { path: 'leaves', label: 'Leave', icon: EventNoteIcon, page: 'myLeaves' },
    { path: 'training', label: 'Training', icon: SchoolIcon, page: 'training' },
    { path: 'announcements', label: 'Announcements', icon: CampaignIcon, page: 'announcements' },
    { path: 'notifications', label: 'Notifications', icon: NotificationsIcon, page: 'notifications' },
    { path: 'profile', label: 'My profile', icon: PersonIcon, page: 'profile' },
  ],
  manager: [
    { path: 'dashboard', label: 'Dashboard', icon: DashboardIcon, page: 'managerDashboard' },
    { path: 'team', label: 'My team', icon: GroupsIcon, page: 'team' },
    { path: 'attendance', label: 'Attendance', icon: AccessTimeIcon, page: 'managerAttendance' },
    { path: 'leaves', label: 'Leave', icon: EventNoteIcon, page: 'managerLeaves' },
    { path: 'training', label: 'Training', icon: SchoolIcon, page: 'training' },
    { path: 'announcements', label: 'Announcements', icon: CampaignIcon, page: 'announcements' },
    { path: 'notifications', label: 'Notifications', icon: NotificationsIcon, page: 'notifications' },
    { path: 'profile', label: 'My profile', icon: PersonIcon, page: 'profile' },
  ],
  hr: [
    { path: 'dashboard', label: 'Dashboard', icon: DashboardIcon, page: 'hrDashboard' },
    { path: 'employees', label: 'Employees', icon: BadgeIcon, page: 'employees' },
    { path: 'managers', label: 'Managers', icon: GroupsIcon, page: 'managers' },
    { path: 'attendance', label: 'Attendance', icon: AccessTimeIcon, page: 'allAttendance' },
    { path: 'leaves', label: 'Leave', icon: EventNoteIcon, page: 'allLeaves' },
    { path: 'training', label: 'Training', icon: SchoolIcon, page: 'training' },
    { path: 'announcements', label: 'Announcements', icon: CampaignIcon, page: 'announcements' },
    { path: 'reports', label: 'Reports', icon: AssessmentIcon, page: 'reports' },
    { path: 'notifications', label: 'Notifications', icon: NotificationsIcon, page: 'notifications' },
    { path: 'company', label: 'Company settings', icon: BusinessIcon, page: 'companySettings' },
    { path: 'profile', label: 'My profile', icon: PersonIcon, page: 'profile' },
  ],
};

export const ROLE_LABELS = { employee: 'Employee', manager: 'Manager', hr: 'HR' };

export const homePathFor = (role) => (NAVIGATION[role] ? `/${role}/dashboard` : '/login');
