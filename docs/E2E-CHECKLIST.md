# StaffSync — Manual end-to-end checklist

The automated suites (`npm test` in `server` and `client`) prove the API and helpers. This checklist covers what they cannot: what each role actually sees and clicks in the browser.

**Time needed:** about 20 minutes. Use a normal window for one role and a private window for another, so two people can be signed in at once.

## Before you start

1. `server`: `npm run seed:demo` (safe to re-run), then `npm run dev`.
2. `client`: `npm run dev`, then open http://localhost:5173.
3. Have these to hand (passwords are in `server/.env`):

| Role | Email | Password |
|---|---|---|
| HR | `hr@staffsync.demo` | `SEED_HR_PASSWORD` |
| Manager | `manager@staffsync.demo` | `SEED_DEMO_PASSWORD` |
| Employee | `employee1@staffsync.demo` | `SEED_DEMO_PASSWORD` |

Tick each box as you go. If something does not match, note the step number, the role and a screenshot.

## A. The leave workflow (the critical path)

| # | Role | Do this | You should see |
|---|---|---|---|
| A1 | Employee | Log in | Employee dashboard with a greeting; menu shows Dashboard, Attendance, Leave, Training, Announcements, Notifications, My profile |
| A2 | Employee | Leave → **Apply for leave**: Casual, a date two weeks ahead to two days later, any reason → Submit | "Leave request submitted"; the request appears as **Pending**, 3 days |
| A3 | Employee | Apply again with an overlapping date | Error under the dates: "These dates overlap your pending casual leave" |
| A4 | Manager | Log in (second window) | Bell shows an unread count; dashboard "Leave to review" is at least 1 |
| A5 | Manager | Click the bell | "New leave request — Demo Employee One requested casual leave for …" |
| A6 | Manager | Leave → **Team requests** | The request is listed under Pending with Approve / Reject |
| A7 | Manager | **Approve** | "Leave approved"; it leaves the Pending list; "Decided by" shows the manager |
| A8 | Employee | Refresh; click the bell | "Leave approved … by Demo Manager" |
| A9 | Employee | Leave | Status **Approved**, Decided by Demo Manager |
| A10 | Employee | Dashboard | The leave appears under upcoming leave; "days taken this year" went up |
| A11 | HR | Log in; Leave, set Status to Approved | The same request, same employee, same approver |
| A12 | HR | Reports → Leave | Approved count and days include it |
| A13 | Employee | Apply for another single day | Pending |
| A14 | Manager | **Reject** it with a reason | Reject button stays disabled until a reason is typed; then "Leave rejected" |
| A15 | Employee | Bell, then Leave | "Leave rejected … : <your reason>"; the row shows the reason in red |
| A16 | Employee | Apply again for the rejected day | Accepted (rejected leave does not block dates) |

## B. Attendance

| # | Role | Do this | You should see |
|---|---|---|---|
| B1 | Employee | Dashboard → **Check in** | "Checked in"; status Checked in with the time in the top-bar time zone |
| B2 | Employee | Click Check in again (refresh first) | The button is now **Check out** |
| B3 | Employee | **Check out** | Hours shown; status Half day (under 4 hours) |
| B4 | Manager | Dashboard | Team today shows the employee as Checked out |
| B5 | Any | Change the top-bar time zone to London | Clock times change; dates and leave days do not |
| B6 | HR | Attendance → Company, Department "Engineering" | Only Engineering rows |

## C. People and access

| # | Role | Do this | You should see |
|---|---|---|---|
| C1 | HR | Employees → **Add person**, role Employee, reports to Demo Manager | Created with an EMP… id |
| C2 | HR | Edit them: Time zone → London (UK) | Saved; their profile shows Europe/London |
| C3 | HR | Try to **Deactivate** Demo Manager | Error asking to reassign their team first |
| C4 | HR | Deactivate the person from C1, then Reactivate | Status changes both ways |
| C5 | Employee | My profile → Edit contact details: change phone | Saved; other fields are read-only and the page says to contact HR |
| C6 | Employee | Type `/hr/employees` in the address bar | "You don't have access to this page" with a link back |
| C7 | Manager | My team | Only Demo Employee One and Two (not Three) |

## D. Training, announcements, notifications

| # | Role | Do this | You should see |
|---|---|---|---|
| D1 | HR | Announcements → **New announcement** for Managers | Published |
| D2 | Manager | Announcements; bell | The announcement and a "New announcement" notification |
| D3 | Employee | Announcements | It is **not** shown |
| D4 | Manager | Training → **New training**, 1 seat, next month | Created; Participants and Edit available |
| D5 | Employee | Training → **Enrol** | "Enrolled"; seat bar full |
| D6 | Employee 2 (`employee2@…`) | Training | The button says **Full** |
| D7 | Manager | Edit the training dates | Employee 1 gets a "Training updated" notification |
| D8 | Any | Notifications → **Mark all as read** | Bell count goes to 0 |
| D9 | Manager | Announcements → **New announcement** for Employees | Published; Edit/Delete shown on it, but **not** on HR's announcements |
| D10 | Employee | Announcements | The manager's post is shown, with the manager as author |
| D11 | Manager | Training → on the training from D4, **Participants / assign** → pick Demo Employee Two → Assign | Listed; Employee Two gets an "Enrolled in training" notification |
| D12 | Manager | Same dialog → remove icon next to Employee Two | Removed; seat freed |

## E. Look and feel

| # | Do this | You should see |
|---|---|---|
| E1 | Toggle the sun/moon in the top bar on several pages | Every page switches cleanly; nothing stays white in dark mode or black in light mode; text is easy to read |
| E2 | Reload in dark mode | Opens in dark mode with no white flash |
| E3 | Narrow the window to phone width (or use the browser's device toolbar) | Menu becomes a slide-out; tables scroll sideways; nothing overlaps |
| E4 | Keyboard only: Tab through the login form and the leave dialog | A visible focus ring on every control; Enter submits |
| E5 | Stop the API and refresh | "Can't reach StaffSync" with **Try again**, and you are not logged out |

## F. Passwords

| # | Role | Do this | You should see |
|---|---|---|---|
| F1 | Signed out | Login page → **Forgot password?**, enter `employee2@staffsync.demo` | "If an account exists for that email, a reset link has been sent." |
| F2 | — | Look in the server terminal (or the inbox, if SMTP is set up) | An email "Reset your StaffSync password" with a link |
| F3 | Signed out | Open the link, choose a new password | Back on the login page with "Your password has been reset. Please log in." |
| F4 | Signed out | Open the same link again and submit | "This reset link is invalid or has expired…" |
| F5 | Employee 2 | Log in with the new password | Works; the old password does not |
| F6 | Any | My profile → **Change password** | "Password changed. Other devices have been signed out."; a second browser signed in as the same person is sent to the login page on its next action |
| F7 | Signed out | Enter a wrong password 6 times for one account | From the 6th try: "Too many failed login attempts. Try again in 15 minutes." Other accounts still log in |

## G. Organisations (Phase 19)

| # | As | Do | Expect |
|---|---|---|---|
| G1 | Signed out | Login page → **Set up your organisation**; enter a company name, your name, an unused email and a password | You land on the HR dashboard; the menu shows the new company name under the logo |
| G2 | New HR | Employees | Only yourself (EMP0001); nothing from DemoTech Solutions |
| G3 | New HR | **Company settings** → change the time zone and untick Friday → Save | "Company settings saved"; the name in the menu updates if you changed it |
| G4 | DemoTech HR (other browser) | Company settings | DemoTech's own settings, unchanged by G3 |
| G5 | Signed out | Open `/register` | Redirected to the sign-up page |
| G6 | Signed out | Sign up again with the G1 email | "An account with this email already exists" |
| G7 | Manager or employee | Open `/hr/company` | Not available to that role |

## H. Public demo (Phase 20)

| # | As | Do | Expect |
|---|---|---|---|
| H1 | Signed out | Login page | "or try the demo" with **HR**, **Manager** and **Employee** buttons |
| H2 | Signed out | Click **Manager** | The manager dashboard, with a banner: exploring the demo, reset every night at 03:00 |
| H3 | Demo employee | My profile | No **Change password** button |
| H4 | Demo HR | Company settings | "Company settings are read-only in the demo"; Save is disabled |
| H5 | Demo HR | Add a person with a gmail.com address | "In the demo, use an address ending in @staffsync.demo" |
| H6 | Demo HR | Post an announcement, then run `npm run demo:reset` in `server` and reload | The announcement is gone |

## I. Platform console (Phase 21)

Create a platform admin first: set `PLATFORM_ADMIN_PASSWORD` in `server/.env`, then `npm run platform:create-admin -- --name "Your Name" --email you@example.com` in `server`.

| # | As | Do | Expect |
|---|---|---|---|
| I1 | Signed out | Open `/platform/login`, sign in with an HR account | "Invalid email or password" |
| I2 | Signed out | Sign in with the platform admin | Overview with organisation and user counts |
| I3 | Platform admin | Organisations → search part of a name | Only matching organisations |
| I4 | Platform admin | Open a test organisation → **Suspend** with a reason | Red "Suspended …" banner; its HR is signed out on their next click and cannot log in |
| I5 | Platform admin | **Reactivate** | The HR can log in again |
| I6 | Platform admin | Audit log | Both actions, with your email and the reason |

## When you finish

- [ ] All of A passed (this is the acceptance test for the leave workflow)
- [ ] B–E and G–I passed, or the failures are written down with step numbers

Remove the people you created with HR → Employees (deactivate), and run `npm run clean:test-data -- --yes` in `server` if Postman runs have added test accounts.
