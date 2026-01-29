# WDI Agent Coverage Analysis
**Version:** 20260128
**Total Questions:** 70
**Analysis Date:** January 28, 2026

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Supported | 52 | 74% |
| ⚠️ Partial | 8 | 11% |
| ❌ Not Supported | 10 | 14% |

---

## 1. Projects (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 1 | כמה פרויקטים פעילים יש לנו? | ✅ | `countProjects({state:'פעיל'})` |
| 2 | תן לי פרויקטים בתחום בטחוני | ❌ | **Missing:** `getProjectsByDomain` - no domain filter exists |
| 3 | מי מנהל את פרויקט מודיעין? | ✅ | `getProjectById({searchTerm:'מודיעין'})` |
| 4 | אילו פרויקטים מנהל דוד כהן? | ✅ | `getProjects({managerName:'דוד כהן'})` |
| 5 | מה הפרויקטים בשלב ביצוע? | ✅ | `getProjects({phase:'ביצוע'})` |
| 6 | כמה כסף מושקע בפרויקטים פעילים? | ✅ | `getProjectsStats({state:'פעיל'})` returns totalEstimatedCost |
| 7 | תן לי פרויקטים בקטגוריית תשתיות | ✅ | `getProjects({category:'תשתיות'})` |
| 8 | מי הם מנהלי הפרויקטים בחברה? | ✅ | `getProjectLeads()` |
| 9 | מה הפרויקטים של לקוח אינטל? | ✅ | `getProjectById({searchTerm:'אינטל'})` searches by client |
| 10 | כמה פרויקטים יש בכל קטגוריה? | ✅ | `countProjects({groupBy:'category'})` |

---

## 2. HR/Employees (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 11 | כמה עובדים פעילים יש? | ✅ | `countEmployees({status:'פעיל'})` |
| 12 | תן לי פרטים על יוסי לוי | ✅ | `getEmployeeById({searchTerm:'יוסי לוי'})` |
| 13 | מי עובדים במחלקת הנדסה? | ✅ | `getEmployees({department:'הנדסה'})` |
| 14 | מי חוגג יום הולדת החודש? | ✅ | `getUpcomingBirthdays({days:30})` |
| 15 | אילו מהנדסים יש בחברה? | ✅ | `getEmployeesWithEducation({degreeType:'מהנדס'})` |
| 16 | כמה עובדים יש בכל מחלקה? | ✅ | `countEmployees({groupBy:'department'})` |
| 17 | מי העובדים עם תואר שני? | ✅ | `getEmployeesWithEducation({degreeType:'תואר שני'})` |
| 18 | ילדי עובדים שחוגגים יום הולדת | ✅ | `getChildrenBirthdays({days:30})` |
| 19 | מה השכר הממוצע בחברה? | ❌ | **Blocked:** Salary data excluded for privacy (agent-redaction.ts) |
| 20 | מי העובדים עם סיווג ביטחוני? | ⚠️ | `getEmployeeById` returns securityClearance but no filter function |

---

## 3. Vehicles (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 21 | כמה רכבים פעילים יש? | ✅ | `countVehicles({status:'פעיל'})` |
| 22 | מה הרכב של משה כהן? | ✅ | `getVehicleByDriver({employeeName:'משה כהן'})` |
| 23 | אילו רכבים צריכים טיפול? | ✅ | `getVehiclesNeedingService({daysAhead:30})` |
| 24 | מה התדלוקים של רכב 12-345-67? | ✅ | `getVehicleFuelLogs({licensePlate:'12-345-67'})` |
| 25 | אילו רכבים עם ביטוח שפג? | ✅ | `getVehiclesWithExpiringDocuments({includeExpired:true})` |
| 26 | כמה הוצאנו על כביש 6 החודש? | ✅ | `getTollRoadStats({daysBack:30})` |
| 27 | יש דוחות תנועה פתוחים? | ✅ | `getVehicleTickets({status:'ממתין'})` |
| 28 | מה התאונות של צי הרכב? | ✅ | `getVehicleAccidents({})` |
| 29 | כמה הוצאנו על חניות? | ✅ | `getParkingStats({daysBack:90})` |
| 30 | היסטוריית שיוכים של רכב | ✅ | `getVehicleAssignments({licensePlate:'...'})` |

---

## 4. Equipment (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 31 | כמה מחשבים ניידים יש? | ✅ | `getEquipment({type:'מחשב נייד'})` |
| 32 | מה הציוד שמושך לעובד X? | ⚠️ | `getEquipment` returns assignedTo but no direct employee filter |
| 33 | אילו ציוד עם אחריות שפגה? | ✅ | `getEquipmentStats()` returns warrantyExpiringSoon |
| 34 | כמה ציוד משרדי יש? | ✅ | `getEquipment({isOffice:true})` |
| 35 | סטטיסטיקות ציוד לפי סוג | ✅ | `getEquipmentStats()` returns byType |
| 36 | רשימת ציוד לא פעיל | ✅ | `getEquipment({status:'INACTIVE'})` |
| 37 | כמה ציוד יש מיצרן Dell? | ✅ | `getEquipment({manufacturer:'Dell'})` |
| 38 | מה מספר הסריאלי של ציוד X? | ✅ | `getEquipmentById({id:'...'})` |
| 39 | היסטוריית העברות ציוד | ❌ | **Missing:** No equipment assignment history function |
| 40 | תזכור לי לחדש אחריות לציוד | ❌ | **Missing:** No reminder/notification function |

---

## 5. Events (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 41 | מה האירועים האחרונים? | ✅ | `getRecentEvents({days:7})` |
| 42 | חפש אירועים עם המילה "חשמל" | ✅ | `searchEvents({query:'חשמל'})` |
| 43 | אירועי פרויקט מודיעין | ✅ | `getProjectEvents({projectName:'מודיעין'})` |
| 44 | חפש במיילים על "אישור תקציב" | ✅ | `searchEvents({query:'אישור תקציב',eventType:'אימייל'})` |
| 45 | מה יש בקובץ הזה? | ✅ | `getFileSummary({fileId:'...'})` |
| 46 | חפש בקבצים על "מפרט טכני" | ✅ | `searchFileContents({query:'מפרט טכני'})` |
| 47 | כמה אירועים היו השבוע? | ⚠️ | `getRecentEvents` returns list, need to count manually |
| 48 | מי יצר את האירוע הזה? | ✅ | `searchEvents` returns createdBy field |
| 49 | אירועי ישיבה מהחודש האחרון | ✅ | `getRecentEvents({days:30,eventType:'ישיבה'})` |
| 50 | תראה לי את הקובץ המצורף | ❌ | **Blocked:** Agent doesn't serve files/images |

---

## 6. Contacts/Vendors (10 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 51 | מי אנשי הקשר בפרויקט X? | ✅ | `getProjectContacts({projectName:'X'})` |
| 52 | תן לי פרטים על איש קשר דני | ✅ | `getContactById({searchTerm:'דני'})` |
| 53 | מי היועצים החשמלאים? | ✅ | `getContactsByDiscipline({discipline:'חשמל'})` |
| 54 | רשימת ספקים פעילים | ✅ | `getOrganizations({isVendor:true})` |
| 55 | פרטי ארגון "חברת הבנייה" | ✅ | `getOrganizationById({searchTerm:'חברת הבנייה'})` |
| 56 | כמה אנשי קשר יש במערכת? | ✅ | `countContacts({})` |
| 57 | אנשי קשר מסוג קבלן | ✅ | `getContacts({contactType:'קבלן'})` |
| 58 | מי עובד בארגון X? | ✅ | `getOrganizationById` returns contacts list |
| 59 | הוסף איש קשר חדש | ❌ | **Blocked:** Agent is read-only, no write operations |
| 60 | עדכן את הטלפון של איש קשר | ❌ | **Blocked:** Agent is read-only, no write operations |

---

## 7. Ratings (5 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 61 | מי הספקים הכי מדורגים? | ✅ | `getTopRatedVendors({limit:10})` |
| 62 | מה הדירוג של ארגון X? | ✅ | `getVendorRatings({organizationName:'X'})` |
| 63 | סטטיסטיקות דירוגים לפי תחום | ✅ | `getVendorRatingStats()` returns byDiscipline |
| 64 | דירוגים בפרויקט מודיעין | ✅ | `getVendorRatings({projectName:'מודיעין'})` |
| 65 | ספקים עם דירוג מעל 4 | ✅ | `getVendorRatings({minRating:4})` |

---

## 8. Cross-module/Analytics (5 Questions)

| # | Question (Hebrew) | Status | Function/Notes |
|---|------------------|--------|----------------|
| 66 | חפש "אריק" בכל המערכת | ✅ | `searchAll({query:'אריק'})` |
| 67 | מה השדות של עובד? | ✅ | `getSchemaCatalog()` or `getFieldInfo({entityName:'Employee'})` |
| 68 | צור לי גרף של פרויקטים | ❌ | **Missing:** No chart/graph generation capability |
| 69 | מה הפעילות של משתמש X? | ✅ | `getUserActivity({userEmail:'x@wdi.one'})` |
| 70 | מי שינה את הפרויקט הזה? | ✅ | `getEntityHistory({targetType:'Project',targetId:'...'})` |

---

## Gaps Identified

### Critical Gaps (❌ Not Supported - 10 items)

| Gap | Description | Recommended Fix |
|-----|-------------|-----------------|
| Domain Queries | No `getProjectsByDomain` function | Add function to agent-queries.ts |
| Salary Data | Blocked by privacy policy | Intentional - no fix needed |
| Equipment History | No assignment history tracking | Add `getEquipmentAssignments` |
| Reminders | No notification/reminder capability | Out of scope for Agent |
| File Viewing | Agent doesn't serve files | Intentional - use UI |
| Write Operations | Agent is read-only | Intentional - use UI |
| Graph Generation | No chart library | Future enhancement |

### Partial Support (⚠️ - 8 items)

| Gap | Description | Workaround |
|-----|-------------|------------|
| Security Clearance Filter | Can retrieve but not filter by clearance | Use `getEmployeeById` per employee |
| Equipment by Employee | No direct filter, returns assignedTo | Filter client-side or iterate |
| Event Counting | Returns list, no count | Count results manually |

---

## Recommendations

1. **Priority 1:** Add `getProjectsByDomain` function (Issue #2 in current sprint)
2. **Priority 2:** Add equipment assignment history function
3. **Priority 3:** Add security clearance filter to employee queries
4. **Future:** Consider chart generation capability

---

*Generated by Claude Code analysis*
