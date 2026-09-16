Absolutely. Since this is a **personal offline-first finance app**, I’d make it broader than a simple expense tracker. The core idea should be:

> **One private place to manage money, spending plans, shopping, debts, and personal financial goals — with all data stored locally on the device.**

Below is a full PRD you can use as the product/engineering source of truth.

# PRD — Nibash (Personal Finance & Household Money Manager)

**Product name:** Nibash
**Platform:** Mobile — iOS & Android
**Primary mode:** 100% Offline
**Data storage:** Local SQLite
**Target user:** Individual/personal use
**Version:** MVP (full feature scope — see Section 38)
**Privacy principle:** Financial data never leaves the device by default.

---

# 1. Product Vision

Create a simple, private, offline-first personal finance app that helps users:

* Track income
* Track expenses
* Manage accounts and cash
* Understand spending
* Create budgets
* Maintain shopping lists
* Track money owed to/from others
* Manage recurring payments
* Set savings goals
* Track subscriptions
* Maintain financial notes
* Backup and restore their data

The app should feel like a combination of:

**Expense Tracker + Budget Planner + Shopping List + Debt Tracker + Personal Finance Notebook**

without becoming complicated.

---

# 2. Core Product Principles

### 1. Offline first

The app must work without:

* Internet
* Account/login
* Cloud server
* External API

Everything should work locally.

### 2. Privacy first

Financial information is sensitive.

Therefore:

```text
User
 ↓
Mobile App
 ↓
Local SQLite
```

No automatic:

```text
User
 ↓
Cloud
```

---

### 3. Fast entry

Adding an expense should take **less than 10 seconds**.

Example:

```text
+ Expense

৳350

Food

Cash

Save
```

---

### 4. Simple by default

Don't overwhelm the user with accounting terminology.

Instead of:

> Debit / Credit / Ledger

use:

> Money In / Money Out

---

# 3. Main Navigation

I recommend **5 bottom navigation items**:

```text
┌─────────────────────────────────┐
│                                 │
│           App Content            │
│                                 │
├─────────────────────────────────┤
│ Home │ Activity │   +   │ Plans │ More │
└─────────────────────────────────┘
```

### Home

Financial overview.

### Activity

All transactions, grouped by month with a month selector/filter (see Section 4 for the shared month-navigation pattern) so past months remain fully browsable, not just the current one.

### +

Quick action menu:

```text
Add Expense
Add Income
Transfer Money
Add Debt
Add Shopping Item
```

### Plans

```text
Budgets
Shopping Lists
Savings Goals
Recurring Payments
```

### More

```text
Accounts
Categories
Family Profiles
Debts
People
Reports
Subscriptions
Backup
Settings
```

---

# 4. Dashboard

The dashboard should answer:

> **"How am I doing financially?"**

### Header — Month Selector ⭐

Right now the dashboard only ever shows the current month with no way to look back. The header should become a **month switcher**, not a static label:

```text
Good morning 👋

◀   August 2026   ▶
```

* Tapping **◀ / ▶** moves one month at a time; swiping left/right on the header does the same.
* Tapping the month label itself opens a quick month/year picker for jumping further back (e.g. "March 2026") instead of tapping ◀ repeatedly.
* Every section below (Balance, Income/Expense, Budget, Recent Transactions) reflects the **selected month**, not always "now."
* A **"Today"** shortcut appears whenever the user has navigated away from the current month, to jump back in one tap.
* Viewing a past month is read-only for historical figures but still allows adding a transaction dated in that month (useful for logging something forgotten).

### Balance

```text
Total Balance

৳125,450

↑ 12.5% this month
```

* **Total Balance** (all accounts, all-time) always reflects "right now" regardless of which month is selected — it isn't a monthly figure.
* The **"↑ 12.5% this month"** comparison line, however, should update to compare the **selected month vs. the month before it**, so browsing back to, say, June shows June-vs-May.

### Income / Expense

```text
Income              Expense

৳85,000             ৳42,500
```

These totals are for the **selected month** (from the header selector above), so scrolling back through months shows that month's actual Income/Expense, not always the current month's.

### Budget

```text
Monthly Budget

৳42,500 / ৳60,000

████████████░░░░

৳17,500 remaining
```

Also reflects the selected month. For past months this effectively shows **"how the budget actually played out"** that month (see Section 18 for month-by-month budget history).

### Quick Actions

```text
+ Expense
+ Income
Transfer
```

Quick Actions always create a transaction for **today's date** by default (regardless of which month is being viewed), to avoid accidentally backdating an expense — the user can still change the date manually in the Add form.

### Recent Transactions

```text
🍔 Food                  -৳450
🚕 Transport             -৳220
💼 Salary             +৳85,000
🛒 Shopping              -৳2,450
```

When viewing a past month, this list shows that month's transactions (most recent first within the month), with a **"View all in Activity"** link that opens Activity pre-filtered to the same month.

---

# 5. Expense Management

## Add Expense

Fields:

```text
Amount
Category
Account
Date
Time
Note
Tags
Attachment
```

Optional:

```text
Recurring
Profile   (defaults to "Me" — see Section 6a, Family / Joint Profiles)
```

### Example

```text
৳1,250

Shopping

DBBL Bank

08 Aug 2026

Groceries for home

[Save Expense]
```

---

# 6. Income Management

Income types:

```text
Salary
Freelance
Business
Bonus
Gift
Investment
Refund
Other
```

Fields:

```text
Amount
Source
Account
Date
Note
```

Optional:

```text
Profile   (defaults to "Me" — see Section 6a, Family / Joint Profiles)
```

---

# 6a. Family / Joint Profiles ⭐

This wasn't in the original scope, but it's worth being explicit about since it's a real differentiator for this app compared to most offline expense trackers, which are strictly single-user.

**Important scope clarification:** this is **not** multi-device sync or multi-account login. It's still one person's app, on one device, with one local database (Section 2's offline/privacy principles are unchanged). What this adds is a way to **attribute transactions to a household member** so a single user managing joint/family finances (e.g. a parent tracking spending for a spouse and kids, or a joint household budget) can see the breakdown — without needing everyone to install the app or share a login.

### Family Profiles

```text
Family Profiles

👤 Me (default)
👩 Spouse
🧒 Child 1
🧒 Child 2
👴 Parent

                    + Add Profile
```

### Add Profile

```text
New Profile

Name
[ Spouse ]

Relationship
○ Self  ◉ Spouse  ○ Child  ○ Parent  ○ Other

Icon / Color
[ 👩 ]  [●]

[ Save Profile ]
```

* A **"Me"** profile exists by default and can be renamed but not deleted (there must always be at least one profile).
* **Name** is required; Relationship just drives the default icon and is otherwise cosmetic.

### Edit Profile

```text
Edit Profile — Spouse

Name
[ Spouse ]

Relationship
[ Spouse ▾ ]

Icon / Color
[ 👩 ]  [●]

[ Save Changes ]        [ Delete Profile ]
```

### Delete Profile

```text
Delete "Spouse"?

This profile has:
84 transactions

○ Reassign transactions to another profile
   [ Choose profile ▾ ]

○ Delete transactions for this profile too
   ⚠️ This cannot be undone

[ Cancel ]   [ Delete ]
```

* Same guarded pattern as Accounts/Categories/People — a profile with transaction history can't just vanish silently.

### Using Profiles

**Add Expense / Add Income** (Sections 5–6) gain one more optional field:

```text
Amount
Category
Account
Profile          ← new
Date
Note
```

* **Profile** defaults to "Me" so fast entry (Section 2's <10-second goal) isn't slowed down for users who don't need this — it's opt-in, not a required extra tap for everyone.

**Dashboard** (Section 4) can optionally add a **"Spending by Profile"** widget (toggle-able via Dashboard Personalization, Section 44):

```text
Spending by Profile — August

👤 Me         ৳22,500
👩 Spouse     ৳12,000
🧒 Child 1    ৳5,500
🧒 Child 2    ৳2,500
```

**Reports** (Section 24) can filter or break down by Profile the same way it already does by Category, so "how much did we spend on the kids this month" is a first-class question the app can answer.

**Budgets** (Section 18) stay category-based for MVP — a Profile-level budget (e.g. "Child 1's monthly allowance cap") is a reasonable V2 extension but isn't required for the family-tracking value to land.

---

# 7. Accounts

Users can create multiple accounts.

Examples:

```text
💵 Cash
🏦 Bank
📱 bKash
📱 Nagad
💳 Credit Card
```

Each account maintains a balance.

Example:

```text
Accounts

Cash
৳5,500

DBBL
৳75,000

bKash
৳8,500

Credit Card
-৳12,000
```

---

## 7a. Add Account ⭐

Currently missing from the flow above: there is no way to add a new account. This is a core action and should be reachable from the **Accounts** screen (More → Accounts) via a clear **"+ Add Account"** button, and optionally from the **+** quick-action menu.

```text
Accounts                    + Add

Cash          ৳5,500
DBBL          ৳75,000
bKash         ৳8,500
Credit Card  -৳12,000
```

### Add Account form

```text
New Account

Account Name
[ City Bank ]

Account Type
◉ Cash
○ Bank
○ Mobile Wallet (bKash/Nagad/etc.)
○ Credit Card
○ Savings
○ Other

Icon / Color
[ 🏦 ]  [●]

Starting Balance
৳0

Include in Total Balance
☑ Yes

[ Save Account ]
```

* **Account Name** and **Starting Balance** are required; everything else has sensible defaults.
* **Account Type** drives the default icon (Cash → 💵, Bank → 🏦, Mobile Wallet → 📱, Credit Card → 💳) but the icon can be overridden.
* **Starting Balance** becomes the account's opening balance — recorded internally as an `OPENING_BALANCE` adjustment so it doesn't distort Income/Expense totals.
* **Include in Total Balance** lets a user exclude an account (e.g. a "tracking only" account) from the Dashboard's Total Balance figure.
* Credit Card accounts should support an optional **Credit Limit** field (used later for utilization warnings).
* **Currency is not set per account.** There is a single **global currency** for the whole app, set once in Settings (Section 32) and used everywhere — Accounts, Transactions, Budgets, Reports, etc. This keeps Total Balance a simple sum across accounts with no conversion logic needed. See Section 32 for the global currency setting and Section 33 for why true multi-currency (different currencies per account) stays out of scope until V2.

---

## 7b. Edit Account ⭐

Every account needs to be editable after creation — name, icon, type, and settings (but not a manual balance override; balance is always derived from transactions).

```text
Accounts

Cash          ৳5,500   ⋮
DBBL          ৳75,000  ⋮
bKash         ৳8,500   ⋮
```

Tapping the account (or its **⋮** menu) opens:

```text
Edit Account — DBBL

Account Name
[ DBBL Bank ]

Account Type
○ Cash  ◉ Bank  ○ Mobile Wallet  ○ Credit Card  ○ Other

Icon / Color
[ 🏦 ]  [●]

Include in Total Balance
☑ Yes

[ Save Changes ]        [ Delete Account ]
```

* Renaming or changing the icon/type does **not** alter historical transactions or balances.
* The current balance is shown as **read-only** on this screen (e.g. "Current Balance: ৳75,000") since it's calculated from the transaction ledger, not editable directly. If a user needs to correct a balance, they should add a **Balance Adjustment** transaction instead (keeps the ledger auditable).

---

## 7c. Delete Account ⭐

Deleting an account is destructive and must be guarded, since transactions, transfers, and debts can reference it.

```text
Delete "DBBL Bank"?

This account has:
128 transactions
৳75,000 current balance

○ Delete account and keep its transactions
   (transactions remain, marked "Deleted Account")

○ Delete account and all its transactions
   ⚠️ This cannot be undone

[ Cancel ]   [ Delete ]
```

* If the account has a **non-zero balance**, warn the user clearly before allowing deletion, since the balance simply disappears from Total Balance.
* If the account is referenced by **active Debts**, **Recurring Transactions**, or **Subscriptions**, list those and require the user to reassign or remove them first (or fold that into the same confirmation dialog).
* Recommend soft-delete (archive) under the hood even when the user picks "delete," so data can be recovered from Backup if needed — see Section 30.

---

# 8. Money Transfer

Important feature.

Example:

You withdraw ৳10,000 from bank.

This should **not** become an expense.

Instead:

```text
DBBL
-৳10,000

↓

Cash
+৳10,000
```

Transaction type:

```text
TRANSFER
```

This keeps financial calculations accurate.

---

# 9. Categories

Default categories:

### Expense

```text
🍔 Food
🛒 Groceries
🚗 Transport
🏠 Home
💡 Bills
🛍 Shopping
🏥 Health
🎓 Education
🎮 Entertainment
✈️ Travel
🎁 Gifts
💻 Technology
💰 Investment
📦 Other
```

### Income

```text
💼 Salary
💻 Freelance
📈 Investment
🎁 Gift
💵 Other
```

Users can create custom categories.

---

## 9a. Add Category ⭐

Currently missing: there's no way to add a category. This should be reachable from **More → Categories**, with separate tabs (or a toggle) for **Expense** and **Income**, each with its own **"+ Add Category"** action.

```text
Categories        [ Expense | Income ]

🍔 Food                    ⋮
🛒 Groceries               ⋮
🚗 Transport               ⋮
🏠 Home                    ⋮
...

                    + Add Category
```

### Add Category form

```text
New Category

Type
◉ Expense   ○ Income

Name
[ Pet Care ]

Icon
[ 🐾 ]

Color
[●]

[ Save Category ]
```

* **Type** determines whether it appears in Expense or Income category pickers — a category cannot serve both.
* **Name** is required and must be unique within its type.
* Icon/Color default to a neutral placeholder if not chosen, but picking one is encouraged for quick visual scanning in Reports and the Activity list.

---

## 9b. Edit Category ⭐

Both default and custom categories should be editable — name, icon, and color (the underlying type/id stays fixed once transactions reference it).

```text
Edit Category — Groceries

Name
[ Groceries ]

Icon
[ 🛒 ]

Color
[●]

[ Save Changes ]        [ Delete Category ]
```

* Renaming or changing the icon/color updates the label everywhere instantly (Dashboard, Activity, Reports, Budgets) without altering historical transaction amounts.
* Default categories can be renamed/re-iconed like any other, but should carry a small "Default" tag so users know resetting them is possible from Settings.

---

## 9c. Delete Category ⭐

Deleting a category is only safe when it's guarded against orphaning transactions and budgets.

```text
Delete "Entertainment"?

This category has:
42 transactions
1 active budget (৳3,000/month)

○ Move transactions to another category
   [ Choose category ▾ ]

○ Delete transactions in this category too
   ⚠️ This cannot be undone

[ Cancel ]   [ Delete ]
```

* If the category is unused (0 transactions), deletion is immediate with a simple confirm.
* If the category has an active **Budget** (Section 18) or is used by a **Recurring Transaction** / **Subscription**, surface that and require reassignment or removal first.
* Recommend soft-delete (archive) under the hood so history stays intact and recoverable via Backup — consistent with account deletion in Section 7c.

---

# 10. Shopping List ⭐

This should be a **first-class feature**, not just a small add-on.

You mentioned:

> monthly shopping list or any shopping list

I recommend supporting multiple list types.

### Shopping Lists

```text
Shopping Lists

🛒 August Monthly Shopping

18 / 25 items

🛒 Grocery

8 / 12 items

🎁 Birthday Shopping

3 / 10 items

🏠 Home Improvement

5 / 20 items
```

---

## 10a. Creating & Naming a Shopping List ⭐

Currently missing from the flow above: when a user taps **"Create New List"**, they must be able to name it — and rename it later.

### Create New List

```text
New Shopping List

List Name
[ August Monthly Shopping ]

[ Create List ]
```

* **List Name** is a required field (free text, e.g. "August Monthly Shopping", "Eid Shopping", "Office Supplies").
* If left blank, default to a placeholder like "Untitled List" or auto-generate one from the current month ("August Shopping").

### Rename a List (anytime)

Accessible from the list's overflow menu or by tapping the list title:

```text
August Monthly Shopping   ✏️

↓ tap pencil / long-press title

Rename List

[ August Monthly Shopping ]

[ Save ]
```

* Renaming does **not** affect items, progress, or budget — only the display name.
* Rename should be available both from the Shopping Lists overview (long-press/overflow) and from within the list itself (tap title).

---

## Shopping List

Example:

```text
August Monthly Shopping

☑ Rice
☑ Cooking Oil
☐ Milk
☐ Eggs
☐ Chicken
☐ Vegetables
☐ Shampoo
☐ Toothpaste
```

Each item can contain:

```text
Name
Quantity
Unit
Estimated Price
Actual Price
Category
Notes
```

### Adding an Item — Estimated Amount is set up front

When a user adds an item to the list, **Estimated Price is captured immediately** (Actual Price is intentionally left blank until purchase):

```text
Add Item

Name
Rice

Quantity: 5   Unit: kg

Estimated Price
৳450

Category: Groceries

[ Add Item ]
```

### Marking an Item as Done — Actual Price is required

When the user checks an item off (marks it purchased), the app must prompt for the **Actual (buying) Price** before the item is marked complete:

```text
☐ Rice   Est. ৳450

↓ tap checkbox

Mark as Purchased

How much did you actually pay?

Actual Price
[ ৳430 ]

[ Confirm ]

↓

☑ Rice
Est. ৳450  →  Paid ৳430   (−৳20)
```

* If the user cancels this prompt, the item stays unchecked.
* A "same as estimated" shortcut button can pre-fill Actual Price with the Estimated Price to keep entry fast.
* Once confirmed, the item shows both values with the variance (over/under), e.g. **"−৳20"** (saved) or **"+৳35"** (overspent).

Example:

```text
Rice

Quantity: 5 kg
Estimated: ৳450
Actual: ৳430
Variance: −৳20 (under estimate)
```

---

# 11. Shopping Budget

This is where the feature becomes much more useful.

Example:

```text
August Shopping

Budget

৳15,000

Estimated

৳13,450

Remaining

৳1,550
```

### Estimated vs Actual — List Summary

Once items are checked off, roll up the variance for the whole list so the user can see how well they planned:

```text
August Monthly Shopping — Summary

Estimated Total     ৳13,450
Actual Total (paid)  ৳13,190

You spent ৳260 less than estimated 🎉
```

Or, if overspent:

```text
Estimated Total     ৳13,450
Actual Total (paid)  ৳14,020

You spent ৳570 more than estimated
```

This same estimate-vs-actual comparison should also roll up over time in **Reports** (Section 24), e.g. "You typically underestimate Grocery prices by ~4%."

When purchasing an item (see **Section 10 — Marking an Item as Done** for the full prompt flow):

```text
☐ Milk
Est. ৳120

↓ enter actual price paid

☑ Milk
Est. ৳120 → Paid ৳135  (+৳15)
```

The app can optionally create an expense — using the **Actual Price**, not the estimate:

```text
Shopping → Expense

৳120
Groceries
Cash
```

User can choose:

```text
○ Don't create expense

● Create expense
```

---

# 12. Recurring Shopping Lists

Very useful for monthly shopping — and equally useful weekly (e.g. a weekly veggie run) or bi-weekly (aligned with pay cycles).

Example:

```text
Monthly Grocery

Repeat:
○ One-time   ○ Weekly   ○ Bi-weekly   ◉ Monthly   ○ Yearly   ○ Custom

Next:
01 September
```

Uses the exact same **Repeat** control defined in Section 20 — One-time / Weekly / Bi-weekly / Monthly / Yearly / Custom, same options, same order (One-time simply means the list doesn't regenerate next month).

The app automatically creates:

```text
September Grocery
```

based on the template.

This saves a lot of repetitive work.

---

# 13. Shopping Templates

Users can save templates.

Example:

```text
🛒 Monthly Grocery Template

Rice
Oil
Salt
Sugar
Milk
Eggs
Chicken
Vegetables
Toothpaste
Soap
Shampoo
```

Then:

```text
Create Shopping List

From Template
```

---

# 14. Debt / Money Owed ⭐⭐⭐

You mentioned:

> save my load from others

I assume you mean **loans/debts or money borrowed from others**.

This should be a major feature.

## 14a. People / Contacts ⭐

Right now debts are just tied to a typed name ("Rahim," "Karim"), which risks duplicates (typos, inconsistent spelling) and makes it impossible to see one person's full history across multiple debts. Debts should instead reference a proper **Person** record, managed from **More → Debts → People** (or an inline "+ New Person" while creating a debt).

### Add Person

```text
New Person

Name
[ Rahim Uddin ]

Phone (optional)
[ 01712-345678 ]

Photo (optional)
[ 📷 Add Photo ]

Note (optional)
[ Colleague, lent for bike repair ]

[ Save Person ]
```

* **Name** is the only required field — phone, photo, and note are optional context, not used for calculations.
* On mobile, offer an **"Import from Contacts"** option (with an explicit permission prompt) so the user can pick an existing phone contact instead of retyping — this stays fully local; nothing is uploaded anywhere.
* If a person with a very similar name already exists (e.g. "Rahim" vs "Rahim Uddin"), show a soft warning — *"Did you mean an existing person?"* — before creating a duplicate.

### Person Profile

Selecting a person shows their combined debt history in one place — this is the payoff for having a real Person entity instead of free text:

```text
Rahim Uddin
01712-345678

Money I Owe Rahim        ৳6,000
Money Rahim Owes Me      ৳0

All-time lent:    ৳15,000
All-time repaid:  ৳9,000

Debts
🔴 Bike repair loan   ৳6,000 remaining
🟢 Lunch money        Settled

[ ✏️ Edit ]   [ + New Debt ]   [ 🗑 Delete Person ]
```

### Edit Person

```text
Edit Person

Name
[ Rahim Uddin ]

Phone
[ 01712-345678 ]

Photo
[ 📷 ]

Note
[ Colleague, lent for bike repair ]

[ Save Changes ]        [ Delete Person ]
```

* Editing name/phone/photo/note never changes historical debt amounts — it only updates how the person is displayed.

### Delete Person

```text
Delete "Rahim Uddin"?

This person has:
2 debts
৳6,000 currently outstanding

You can't delete a person with an outstanding balance.
Settle or transfer their debts first.

[ Go to Debts ]   [ Cancel ]
```

* A person with any **non-zero outstanding balance** can't be deleted outright — the app should require the debt be settled (or reassigned to another person, e.g. for a merge/typo-fix scenario) first, to avoid silently losing track of money owed.
* Once all debts are settled/removed, deletion proceeds normally (soft-delete/archive, consistent with Accounts and Categories).

---

Support both:

### Money I Owe

```text
Money I Owe

Rahim Uddin
৳5,000

Karim
৳12,000

Total
৳17,000
```

### Money Others Owe Me

```text
Money Others Owe Me

Sakib
৳3,500

Hasan
৳2,000

Total
৳5,500
```

Every name shown above is a tappable **Person** (Section 14a) — tapping it opens that person's full profile and history rather than just a single debt line.

---

# 15. Debt Details

Example:

```text
Rahim Uddin

Original Amount

৳10,000

Paid

৳4,000

Remaining

৳6,000
```

Payment history:

```text
08 Aug
৳2,000

01 Aug
৳2,000
```

---

# 16. Debt Reminder

Optional:

```text
Rahim Uddin owes you ৳5,000

Reminder
15 August
```

or:

```text
You owe Karim ৳10,000

Due date:
20 August
```

The app should never require internet for reminders.

Use local notifications.

---

# 17. Borrowing/Lending Transaction Integration

If you lend someone money:

```text
Lend Money

Person
[ 🔍 Search or select person ▾ ]
   Rahim Uddin
   Karim
   + New Person

Amount: ৳5,000
Account: Cash
```

* **Person** is a picker over existing People (Section 14a) with inline search, plus a **"+ New Person"** shortcut if they're not in the list yet — never a free-text name field.

The app can automatically record:

```text
Cash
-৳5,000

Rahim Uddin
+৳5,000 receivable
```

When they repay:

```text
Rahim Uddin
-৳5,000

Cash
+৳5,000
```

This keeps the account balance correct.

---

# 18. Budgets

Monthly budgets:

```text
Food
৳15,000

Transport
৳5,000

Shopping
৳10,000

Entertainment
৳3,000
```

Progress:

```text
Food

৳8,500 / ৳15,000

████████░░░░░

57%
```

Warnings:

```text
⚠️ You've used 85% of your Food budget.
```

## 18a. Add / Edit / Delete Budget ⭐

Currently missing: there's no way to actually create, change, or remove a category budget — the examples above just show budgets as if they already exist.

### Add Budget

Reachable from **Plans → Budgets → "+ Add Budget"**. Only categories that don't already have a budget for the selected month are offered, so duplicates aren't possible.

```text
New Budget

Category
[ Choose category ▾ ]
   🍔 Food
   🚗 Transport
   🎮 Entertainment
   + (categories with no budget yet)

Amount
৳15,000 / month

Auto-repeat monthly
☑ Yes

Alert me at
80% ▾   (50% / 80% / 90% / 100% / Off)

[ Save Budget ]
```

* **Category** and **Amount** are required. A category can have at most one active budget at a time.
* **Alert me at** drives the warning banner shown earlier (e.g. "You've used 85% of your Food budget") — configurable per budget rather than a fixed 85% for everyone.
* **Auto-repeat monthly** ties directly into Budget History & Carry-Forward below.

### Edit Budget

Tapping an existing budget (or its **⋮** menu) opens:

```text
Edit Budget — Food

Category
🍔 Food   (fixed — create a new budget to change category)

Amount
[ ৳15,000 ]

Alert me at
[ 80% ▾ ]

Apply change to:
◉ This month only
○ This month and going forward

[ Save Changes ]        [ Delete Budget ]
```

* Category itself isn't editable on an existing budget — since a budget is really "a cap on this category," changing the category is modeled as deleting this budget and creating a new one instead, to avoid muddying history.
* The **"Apply change to"** choice is the same this-month-vs-going-forward pattern already defined for carry-forward amount changes, so editing and amount changes behave consistently.

### Delete Budget

```text
Delete "Food" budget?

This removes the ৳15,000/month cap going forward.

Past months' budget history (what you set,
what you actually spent) is kept for your
records and still visible in Reports.

[ Cancel ]   [ Delete ]
```

* Deleting a budget **never deletes transactions** — it only stops future budget tracking for that category. Historical budget-vs-actual figures for past months remain intact (consistent with the account/category soft-delete pattern used elsewhere).

---

### Budget History & Carry-Forward ⭐

Budgets currently only show the live current month. Two things are missing:

**1. Browsing previous months**

Use the same month selector pattern as the Dashboard (Section 4) at the top of the Budgets screen:

```text
◀   August 2026   ▶

Food
৳8,500 / ৳15,000
████████░░░░░  57%
```

Navigating to a past month shows exactly what that month's budget vs. actual spend was — a permanent record, not just a live snapshot that resets.

**2. Carrying budget amounts forward**

Rather than forcing the user to re-enter budget amounts every month, each category budget auto-carries its amount into the next month by default:

```text
Food Budget

Auto-repeat this amount monthly
☑ Yes

৳15,000 / month
```

* If the user changes the amount mid-month, they're asked whether the change applies **"This month only"** or **"This month and going forward"** — same control introduced in Edit Budget above.
* Turning off auto-repeat for a category simply stops creating a budget for future months; past months' history is untouched either way.
* This mirrors the Repeat/frequency approach already defined for Recurring Transactions (Section 20) — budgets are effectively a monthly recurring "cap" rather than a one-time value.

---

# 19. Savings Goals ⭐

Example:

```text
New Laptop

Goal
৳150,000

Saved
৳65,000

43%
```

Other examples:

```text
🏠 House
🚗 Car
✈️ Vacation
💍 Anniversary
💻 Laptop
🆘 Emergency Fund
```

Users can add money to a goal.

## 19a. Add / Edit / Delete Goal ⭐

### Add Goal

Reachable from **Plans → Savings Goals → "+ Add Goal"**:

```text
New Savings Goal

Name
[ New Laptop ]

Icon
[ 💻 ]

Target Amount
৳150,000

Target Date (optional)
[ 01 Dec 2026 ]

Starting Saved Amount (optional)
৳0

[ Save Goal ]
```

* **Name** and **Target Amount** are required; icon defaults from a small preset list (House, Car, Vacation, etc.) or a custom emoji.
* **Target Date** is optional — if set, the goal screen can show a suggested monthly contribution (Target − Saved) ÷ months remaining) to hit it on time.

### Edit Goal

```text
Edit Goal — New Laptop

Name
[ New Laptop ]

Icon
[ 💻 ]

Target Amount
[ ৳150,000 ]

Target Date
[ 01 Dec 2026 ]

[ Save Changes ]        [ Delete Goal ]
```

* Changing the Target Amount doesn't affect money already saved — it just moves the finish line and recalculates progress %.

### Delete Goal

Since contributing to a goal already debits a real Account (Section 19b), any money saved toward this goal has already left Cash/Bank — it isn't "sitting" anywhere else. Deleting the goal can't be allowed to make that money vanish from every balance with no trace, so disposition is required, not optional:

```text
Delete "New Laptop"?

You've saved ৳65,000 toward this goal.
This money must go somewhere — choose one:

◉ Return it to an account
   [ Choose account ▾ ]

○ Write it off (mark as spent/given away —
   e.g. you bought the laptop already, or
   gave the savings to someone)
   Log as Expense in category:
   [ Choose category ▾ ]

[ Cancel ]   [ Delete ]
```

* **Return it to an account** — the common case (e.g. abandoning a goal, saved money goes back to Cash). Recorded as a `SAVINGS_WITHDRAWAL` back into the chosen Account.
* **Write it off** — for when the money is already gone in real life (goal was achieved and spent, or given away) — logs a normal `EXPENSE` in a category the user picks, so it's accounted for rather than silently disappearing.
* One of these two is always required before the goal can be deleted — there's no third "just delete, don't worry about the money" option, since that would leave ৳65,000 unaccounted for in the ledger.

## 19b. Contribute to a Goal ⭐

"Users can add money to a goal" needs an actual flow — and a decision on whether contributing moves real money or is just a tracking label.

```text
Add to Goal — New Laptop

Amount
৳10,000

From Account
[ Cash ▾ ]

[ Add Contribution ]

↓

New Laptop
৳75,000 / ৳150,000   (50%)
```

* Contributing **debits the selected Account** and credits the goal — recorded as a `SAVINGS_CONTRIBUTION` transaction (already in the Transaction Types enum, Section 37) — so Total Balance stays accurate and the money isn't silently double-counted as both "in Cash" and "saved toward a goal."
* A **Withdraw from Goal** action (the reverse — goal back to an account) should exist too, for when plans change, recorded as a matching reversal.
* Contribution history is visible on the goal's detail screen, same pattern as Debt Payment history (Section 15).

---

# 20. Recurring Transactions

Examples:

```text
Salary
Every month

Rent
Every month

Internet
Every month

Electricity
Every month
```

When due:

```text
Recurring Transaction

Internet Bill

৳1,200

[Skip] [Add Expense]
```

### Recurrence Frequency Options ⭐

When creating (or editing) a recurring transaction, the user must pick how often it repeats:

```text
Repeat

○ One-time (doesn't repeat)
○ Weekly
○ Bi-weekly (every 2 weeks)
◉ Monthly
○ Yearly
○ Custom (every N days/weeks/months)

Starts
08 Aug 2026

Next occurrence
01 Sep 2026
```

* **One-time** — doesn't repeat at all; useful for Bills or Subscriptions that only apply once (e.g. a single medical bill, a one-time setup fee). No "Next occurrence" is generated.
* **Weekly** — repeats on the same weekday each week (e.g. every Monday).
* **Bi-weekly** — repeats every 2 weeks on the same weekday (useful for bi-weekly paychecks or rent split by pay period).
* **Monthly** — repeats on the same day-of-month (e.g. the 1st); if that day doesn't exist in a shorter month, fall back to the last day of the month.
* **Yearly** — for annual items like insurance renewals.
* **Custom** — a fallback for anything that doesn't fit the above (e.g. "every 10 days").

This exact Repeat control — **One-time / Weekly / Bi-weekly / Monthly / Yearly / Custom**, same options, same order — is the single shared component reused everywhere recurrence is picked in the app: the **Recurring** toggle on Add Expense (Section 5), **Recurring Shopping Lists** (Section 12), **Subscriptions** (Section 21a), and **Bills** (Section 22a). No screen defines its own frequency list — they all render this one component.

---

# 21. Subscription Tracker ⭐

Separate from recurring transactions.

Example:

```text
Subscriptions

Netflix
৳650 / month

Spotify
৳299 / month

iCloud
৳99 / month
```

Summary:

```text
Monthly subscriptions

৳1,048

Yearly

৳12,576
```

This can reveal unnecessary recurring spending.

## 21a. Add / Edit / Delete (Cancel) Subscription ⭐

### Add Subscription

Reachable from **More → Subscriptions → "+ Add Subscription"**:

```text
New Subscription

Name
[ Netflix ]

Icon
[ 📺 ]

Amount
৳650

Billing Cycle
○ One-time   ○ Weekly   ○ Bi-weekly   ◉ Monthly   ○ Yearly   ○ Custom
   (exact same Repeat control as Section 20 — same options, same order)

Next Billing Date
[ 01 Sep 2026 ]

Category
[ Entertainment ▾ ]

Account
[ Credit Card ▾ ]

Remind me
[ 3 days before ▾ ]

[ Save Subscription ]
```

* **Name**, **Amount**, and **Billing Cycle** are required.
* **Account** is which account gets charged automatically when the app logs the recurring expense (see below) — reuses the Account picker from Section 7.
* **Remind me** ties into local Notifications (Section 34) so a renewal doesn't sneak up unnoticed.

### Edit Subscription

```text
Edit Subscription — Netflix

Name
[ Netflix ]

Amount
[ ৳650 ]

Billing Cycle
[ Monthly ▾ ]

Next Billing Date
[ 01 Sep 2026 ]

Category
[ Entertainment ▾ ]

Account
[ Credit Card ▾ ]

[ Save Changes ]        [ Cancel Subscription ]
```

* A price change (e.g. Netflix raises rates) is just an amount edit here — no need to delete and recreate.

### Cancel / Delete Subscription

```text
Cancel "Netflix"?

This has 14 recorded billing cycles
(৳9,100 total spent).

○ Cancel — stop future charges, keep history
   (recommended)

○ Delete entirely, including past records
   ⚠️ This cannot be undone

[ Cancel ]   [ Confirm ]
```

* **Cancel** is the expected everyday action — it stops generating future recurring expenses but keeps past spending in Reports (so "how much did I spend on Netflix over the last year" still works after cancelling).
* Full delete (wiping history too) is a separate, more destructive option, consistent with the guarded-delete pattern used for Accounts/Categories/Budgets.

Each logged billing cycle creates a normal `EXPENSE` transaction against the linked Account and Category, tagged as subscription-generated — so it shows up in Dashboard/Reports like any other expense, not as a separate ledger.

---

# 22. Bills Tracker

Upcoming bills:

```text
Upcoming

Electricity
Due 10 Aug
৳2,300

Internet
Due 15 Aug
৳1,200

Rent
Due 01 Sep
৳20,000
```

Status:

```text
Upcoming
Paid
Overdue
```

## 22a. Add / Edit / Delete Bill ⭐

### Add Bill

Reachable from **More → Bills → "+ Add Bill"**:

```text
New Bill

Name
[ Electricity ]

Icon
[ 💡 ]

Amount
৳2,300
   ☐ Amount varies each cycle (leave blank,
      enter actual amount when marking paid)

Due Date
[ 10 Aug 2026 ]

Repeats
○ One-time   ○ Weekly   ○ Bi-weekly   ◉ Monthly   ○ Yearly   ○ Custom
   (exact same Repeat control as Section 20 — same options, same order)

Category
[ Bills ▾ ]

Account
[ DBBL Bank ▾ ]

Remind me
[ 3 days before ▾ ]

[ Save Bill ]
```

* **"Amount varies each cycle"** matters for bills like Electricity where the exact figure isn't known until the bill arrives — leaving it unset means the app prompts for the actual amount at pay-time instead of assuming a fixed figure.
* **One-time** covers a single bill that doesn't repeat (e.g. a one-off medical bill) — it's part of the shared Repeat control itself now, not a Bills-specific addition.

### Edit Bill

```text
Edit Bill — Electricity

Name
[ Electricity ]

Amount
[ ৳2,300 ]

Due Date
[ 10 Aug 2026 ]

Repeats
[ Monthly ▾ ]

Category / Account
[ Bills ▾ ]  [ DBBL Bank ▾ ]

[ Save Changes ]        [ Delete Bill ]
```

### Delete Bill

```text
Delete "Electricity" bill?

This has 8 recorded payments (৳17,200 total).

○ Delete — stop future reminders, keep
   past payment history (recommended)

○ Delete entirely, including past records
   ⚠️ This cannot be undone

[ Cancel ]   [ Confirm ]
```

* Same recommended-vs-destructive split as cancelling a Subscription — stopping future reminders is the common case; wiping history is a separate, explicit choice.

### Mark Bill as Paid ⭐

Tapping a bill in the Upcoming list (or its "Pay" action) moves it from Upcoming → Paid and logs the transaction:

```text
Mark "Electricity" as Paid

Amount
[ ৳2,300 ]     ← editable if it varies this cycle

Paid From
[ DBBL Bank ▾ ]

Date Paid
[ 10 Aug 2026 ]

[ Confirm Payment ]

↓

Electricity   ✅ Paid
৳2,300 · 10 Aug
```

* Confirming creates an `EXPENSE` transaction against the chosen Account/Category, same pattern as Subscriptions.
* If a bill's due date passes with no payment logged, its status automatically flips to **Overdue** (Section 34 can fire a local notification at that point).
* For recurring bills, confirming payment also generates the **next** occurrence based on the Repeats setting — same mechanism as Recurring Transactions (Section 20).

---

# 23. Calendar

A financial calendar would be very useful.

```text
        August 2026

Mon Tue Wed Thu Fri Sat Sun

                     1   2
 3   4   5   6   7   8   9
10  11  12  13  14  15  16
```

Show:

```text
🟢 Income
🔴 Expense
🔵 Bill
🟡 Debt
```

Tap a date:

```text
08 August

Income
+৳85,000

Expenses
-৳2,450

Net
+৳82,550
```

---

# 24. Reports

## Spending Overview

```text
◀   August 2026   ▶            [ 1M | 3M | 6M | 1Y | Custom ]

Income
৳85,000

Expense
৳42,500

Saved
৳42,500
```

* Same **◀ / ▶** month selector as the Dashboard (Section 4) — every past month remains fully viewable, not just the current one.
* A **range toggle** (1M / 3M / 6M / 1Y / Custom range) lets the user zoom out beyond a single month for the category breakdown and trend chart below, useful for spotting patterns across previous months.

Charts:

### Expense by Category

```text
Food          25%
Shopping      20%
Transport     12%
Bills         15%
Other         28%
```

Reflects whichever single month or range is currently selected above.

### Monthly Trend

```text
        ╭─╮
    ╭───╯ ╰──╮
╭───╯        ╰──
```

Always plots multiple months side-by-side (e.g. last 6 or 12 months) regardless of the single-month selector, so the user can compare the selected month against its recent history at a glance — tapping any point on the trend jumps the whole Reports screen to that month.

---

# 25. Financial Insights

This can be rule-based and completely offline.

Examples:

```text
💡 Spending Insight

You spent 24% more on shopping
than last month.
```

```text
💡 Budget Insight

Your food spending is currently
below your monthly budget.
```

```text
💡 Subscription Insight

You have 5 recurring subscriptions
costing ৳2,450/month.
```

No AI is required for MVP.

---

# 26. Search

Global search:

```text
Search anything...

"restaurant"
"Rahim"
"5000"
"July"
```

### What's worth searching ⭐

Not every entity in the app benefits equally from free-text search — some are small, finite lists better *browsed* than searched (you'd never type "Spouse" into a search box when the Family Profiles screen already shows all 5 of them at a glance). Search earns its place where the collection can grow large, has free-text content, or the user is more likely to remember a fragment than know exactly where to look.

**Search across (adds real value):**

```text
Transactions   → note text, amount, date
Shopping       → item names across all lists
Debts          → linked Person's name, amount, note
People         → name, phone, note
Bills          → name
Subscriptions  → name
Goals          → name
Notes          → free-text note content
Tags           → jumps to all transactions with that tag
Accounts       → name (useful once someone has 5+ accounts)
```

**Deliberately excluded — browse instead of search:**

```text
Categories       → small fixed-ish list, already one tap away
                    via the category picker or Section 9's list
Family Profiles  → typically 2-6 entries, fully visible on
                    one screen (Section 6a)
```

If either list grows large enough in practice that browsing stops being fast (e.g. a power user with 40 custom categories), folding them into Search later is a cheap addition — but it's not worth building for the common case.

---

# 27. Tags

Allow optional tags:

```text
#family
#work
#personal
#vacation
#emergency
```

Example:

```text
Dinner
৳2,500

#family
```

This makes filtering much more powerful.

---

# 28. Notes

A simple personal financial notebook could be useful.

Examples:

```text
Financial Notes

"Need to renew insurance in October."

"Rahim will return money next month."

"Buy new laptop after saving 100k."
```

These don't have to affect financial calculations.

---

# 29. Attachments / Receipts

Allow users to attach:

* Receipt
* Invoice
* Screenshot
* Bill

Example:

```text
Expense

৳4,500

Electronics

📎 receipt.jpg
```

Everything remains locally stored.

---

# 30. Backup & Restore ⭐⭐⭐

Because the app is offline, **backup is extremely important** — and because everything lives only on the device (Section 2), a lost, broken, or factory-reset phone with no backup means **total, permanent data loss**. This needs a deliberate answer, not just an "export" button.

### Recommended approach: user-directed export, not auto-sync

Of the realistic options, this is the best fit for an offline-first, privacy-first app:

| Option | Fits the app? |
|---|---|
| **Automatic cloud sync** (own server or third-party) | ❌ Directly breaks "no cloud by default" and "no external API" (Section 2) |
| **Local-only backup** (stays on same device) | ❌ Solves nothing — device loss = backup loss too |
| **User-directed export via the OS share/file picker** ✅ | ✅ Stays 100% offline from the app's point of view — the app never talks to a server. The user decides *where* the file goes (Google Drive folder, USB drive, email to self, another device) using their phone's native picker. Privacy principle is intact because it's an explicit, one-time user action, not automatic background sync. |

So: keep automatic **local** backups as a safety net for things like accidental data corruption, but make **periodic reminders to export off-device** part of the core flow — not just a button buried in Settings.

### Export

```text
Backup Data

nibash-2026-08-08.backup

[ Share / Save To... ]
   → Opens native share sheet
   → User picks: Drive, Files, Email, AirDrop, USB, etc.
```

### Restore

```text
Restore Backup

Choose backup file
   → Opens native file picker (works with anything
     the OS can browse to — local storage, Drive, etc.)
```

### Automatic local backup (safety net only)

```text
Auto Backup (on-device)

Daily
Weekly
Off

⚠️ This stays on your device. Export a copy
   elsewhere (Section: Export) so you don't
   lose your data if this device is lost.
```

### Off-device backup reminder ⭐

```text
🔔 Backup Reminder

It's been 30 days since your last export.
Back up your data somewhere safe.

[ Export Now ]   [ Remind me later ]
```

* Triggered locally (no server involved) based on the last successful export timestamp stored in `UserSettings`.

### Encryption

Given MVP now includes the full feature set (Section 38), backup encryption is part of MVP rather than deferred:

```text
Backup Password

Encrypt this backup?
☑ Yes — protect with a password

Password
[ •••••••• ]

Confirm Password
[ •••••••• ]

⚠️ If you lose this password, this specific
   backup file cannot be recovered. Consider
   using the same Recovery Key from App Lock
   (Section 31) so you only have one thing to
   remember.
```

I'd also support:

```text
Export CSV
Export JSON
Export PDF
```

(CSV/JSON/PDF exports are plain, unencrypted data exports for the user's own analysis — not full-fidelity restorable backups, so they're separate from the `.backup` file above.)

---

# 31. Security

Because this contains financial information:

### App Lock

```text
PIN
Biometric
```

### Auto Lock

```text
Immediately
1 minute
5 minutes
15 minutes
Never
```

### Recovery — "I forgot my PIN" ⭐

Since there's no account or server, there's no "forgot password" email flow — recovery has to be something set up locally, in advance, at App Lock setup time.

**Recovery Key, generated once at setup:**

```text
App Lock is now enabled 🔒

Your Recovery Key
9F3K-72XQ-L8RT-4MZP

⚠️ Save this somewhere safe (password manager,
   written down, etc.) — it's the ONLY way to
   get back into the app if you forget your PIN
   and biometric isn't available.

We don't store this anywhere and can't recover
it for you.

[ I've saved my Recovery Key ]
```

**If the PIN is forgotten:**

```text
Forgot PIN?

○ Use Biometric instead
○ Enter Recovery Key

[ Continue ]

↓ (Recovery Key path)

Enter Recovery Key
[ ____-____-____-____ ]

[ Verify ]

↓ success

Set a New PIN
[ • • • • ]
```

* If biometric is available and enrolled, that remains the fastest recovery path — Recovery Key is the fallback when biometric isn't set up or isn't available (e.g. new device, biometric hardware failure).
* If the user has **neither** a valid Recovery Key **nor** biometric, the only remaining option is a full app reset (wipes local data) and restoring from a Backup (Section 30) — this should be stated plainly during setup so the stakes of skipping the Recovery Key step are clear upfront, rather than discovered during an actual lockout.
* The same Recovery Key can double as the Backup Password (Section 30) if the user opts in, so there's one secret to safeguard instead of two.

### Privacy

No:

* Analytics
* Ads
* Tracking
* Account requirement
* Cloud sync by default

---

# 32. Currency

Default:

```text
BDT — ৳
```

But allow:

```text
USD
EUR
GBP
INR
BDT
SGD
...
```

Currency should be configurable — but as a **single, global, app-wide setting** (Settings → Currency), not per account or per transaction. Every account, transaction, budget, and report uses this one currency. Changing it only changes the display symbol/formatting going forward; it does **not** convert historical amounts.

---

# 33. Multiple Currencies (per-account/transaction currency)

This is a **V2 feature**, not MVP.

To be clear about scope: MVP/V1 has exactly **one currency for the whole app** (Section 32) — Accounts do **not** have their own currency field (see Section 7a). "Multiple Currencies" here means a future capability where individual accounts or transactions could each carry a *different* currency, e.g.:

```text
USD
৳
SGD
```

That would require real conversion-rate logic (offline rate caching, manual rate entry, etc.), which is intentionally out of scope until V2. Don't implement currency conversion initially.

---

# 34. Notifications

Local notifications:

```text
🔔 Bill Reminder

Electricity bill is due tomorrow.
```

```text
🔔 Debt Reminder

Rahim's repayment reminder is today.
```

```text
🔔 Budget Alert

You've used 90% of your shopping budget.
```

---

# 35. Home Screen Widgets

Future feature.

Example:

```text
┌──────────────────────┐
│ Balance              │
│                      │
│ ৳125,450             │
│                      │
│ +৳85k   -৳42.5k      │
└──────────────────────┘
```

And:

```text
Quick Expense

Food
Transport
Shopping
```

---

# 36. Data Model

Core entities:

```text
UserSettings
   (currency: single global setting, applies app-wide — see Section 32;
    pinHash, biometricEnabled, recoveryKeyHash, lastExportAt — see Sections 30-31)

Account
   (name, type, icon, color, startingBalance, includeInTotal: all user-editable; supports soft-delete/archive)

Category
   (type: expense|income, name, icon, color: all user-editable; supports soft-delete/archive with reassignment)

Transaction
   (profileId: optional, defaults to "Me" — see Section 6a)

TransactionAttachment

Transfer

FamilyProfile
   (name, relationship, icon, color: all user-editable; default "Me" profile cannot be deleted; supports soft-delete/archive with reassignment)

Budget
   (categoryId, amount, alertThreshold, autoRepeat: all user-editable; one active budget per category; history preserved on delete)

ShoppingList
   (name: editable, required, user-set at creation)

ShoppingListItem
   (estimatedPrice: set on add; actualPrice: set on mark-as-done)

ShoppingTemplate

Person
   (name, phone, photo, note: all user-editable; cannot be deleted while linked to an outstanding Debt; supports soft-delete/archive)

Debt
   (personId: references Person, not free text)

DebtPayment

SavingsGoal
   (name, icon, targetAmount, targetDate: all user-editable; contributions modeled as SAVINGS_CONTRIBUTION transactions against an Account)

RecurringTransaction
   (frequency: onetime|weekly|biweekly|monthly|yearly|custom — shared enum, used by RecurringTransaction, Subscription, Bill, and ShoppingList's recurrence)

Subscription
   (name, amount, billingCycle, nextBillingDate, categoryId, accountId: all user-editable; cancel stops future charges but preserves history)

Bill
   (name, amount (nullable if variable), dueDate, repeats, categoryId, accountId: all user-editable; status: upcoming|paid|overdue, auto-derived from dueDate + payment record)

Reminder

Tag

Note
```

Relationships:

```text
Account
   │
   ├── Transactions
   ├── RecurringTransactions
   ├── Subscriptions
   └── Bills

Category
   │
   ├── Transactions
   └── Budget (0 or 1 active)

FamilyProfile
   │
   └── Transactions

ShoppingList
   │
   └── ShoppingListItems

Person
   │
   └── Debts

Debt
   │
   └── DebtPayments

SavingsGoal
   │
   └── Contributions (SAVINGS_CONTRIBUTION / SAVINGS_WITHDRAWAL transactions)
```

---

# 37. Transaction Types

Keep the transaction engine clean.

```text
INCOME
EXPENSE
TRANSFER
DEBT_LEND
DEBT_BORROW
DEBT_PAYMENT
SAVINGS_CONTRIBUTION
SAVINGS_WITHDRAWAL
OPENING_BALANCE
REFUND
```

This is important because otherwise features like debt and savings can become messy later.

---

# 38. MVP Scope — All Features ⭐

Per your direction, MVP now includes the full feature set rather than a phased rollout. This removes the earlier contradiction where the Dashboard (Section 4) showed Budget/Bills/Debts/Savings Goals widgets and Add Expense showed a "Recurring" toggle before those features technically existed yet — everything referenced elsewhere in this PRD is now in scope for Release 1.

### MVP — Release 1 (full scope)

Build:

```text
Dashboard
Expenses
Income
Accounts
Categories
Family / Joint Profiles
Transfers
Transactions
Search
Shopping Lists
Shopping Templates
Debt Tracking
People / Contacts
Backup/Restore
App Lock (with recovery)
Budgets
Savings Goals
Recurring Transactions
Bills
Subscriptions
Calendar
Notifications
Attachments
Tags
Basic + Advanced Reports
```

### A note on scope risk

This is a large surface area for a first release — roughly 20+ modules. Two things worth deciding before execution, not after:

* **Build order still matters even if release scope doesn't.** "All features in MVP" describes what ships, not the order you build/test in. I'd still build in dependency order — Accounts → Categories → Transactions → Transfers before Budgets/Reports depend on them; People before Debts; the Repeat control (Section 20) once, shared by Recurring Transactions/Shopping Lists/Subscriptions/Bills rather than four separate implementations.
* **"Feature complete" and "polished" aren't the same bar.** With everything in scope at once, it's worth explicitly deciding whether Release 1 needs every screen production-polished, or whether some modules (e.g. Calendar, Advanced Reports) can ship at a simpler first pass and get refined afterward — otherwise scope has a way of quietly turning into schedule risk.

---

# 39. V2 — Later

```text
Home Widgets
Multiple Currency
Advanced Financial Insights
Local AI
OCR Receipt Scanning
CSV Import
Bank Statement Import
Optional Cloud Sync
```

### Important

I would **not add bank API integration initially**.

It conflicts with the core philosophy:

> **Private + Offline + Simple**

---

# 40. Offline Architecture

The architecture should be:

```text
┌─────────────────────────┐
│       Mobile App        │
│                        │
│  UI                    │
│  Business Logic        │
│  Local Notification    │
│  Backup Manager        │
│                        │
│            ↓            │
│         SQLite          │
│                        │
│  Transactions          │
│  Accounts              │
│  Categories            │
│  FamilyProfiles        │
│  Shopping              │
│  People / Debts        │
│  Budgets               │
│  Goals                 │
│  RecurringTransactions │
│  Subscriptions         │
│  Bills                 │
└─────────────────────────┘
```

(See Section 36 for the complete entity list — this is a simplified sketch of the storage layer, not the full schema.)

No backend is required for the core application.

For a genuinely offline mobile app, I'd actually revise my earlier stack recommendation: **don't use Laravel as the runtime backend.** A mobile-native/local architecture is cleaner.

A good implementation could be:

**Option A**

* Flutter
* SQLite/Drift

**Option B**

* React Native
* Expo
* SQLite

**Option C**

* Native Swift/Kotlin

Given your existing web-development background, **React Native + Expo + SQLite** would probably be the easiest transition.

---

# 41. Data Privacy Architecture

The important principle:

```text
Internet OFF
      ↓
Everything still works
```

User data:

```text
SQLite
   +
Local files
   +
Local preferences
   +
Local notifications
```

Nothing should require an API request.

---

# 42. Backup Architecture

I'd create a custom backup format:

```text
nibash.backup
```

Internally:

```text
manifest.json
database.sqlite
attachments/
    receipt-001.jpg
    receipt-002.jpg
```

Optionally encrypt the entire archive with a user-provided password.

---

# 43. Important UX Decision

The **+ button should be the most important element in the app**.

Tap:

```text
       +
```

Then:

```text
┌──────────────────────────┐
│ What do you want to add? │
│                          │
│ 💸 Expense               │
│ 💰 Income                │
│ 🔄 Transfer              │
│ 🤝 Debt                  │
│ 🛒 Shopping Item         │
└──────────────────────────┘
```

This makes the app extremely fast to use.

---

# 44. Dashboard Personalization

Allow the user to choose what appears on Home.

Widgets:

```text
☑ Balance
☑ Income / Expense
☑ Budget
☑ Recent Transactions
☑ Upcoming Bills
☑ Debts
☑ Shopping Lists
☑ Savings Goals
☐ Subscriptions
☐ Spending by Profile   (see Section 6a, Family / Joint Profiles)
```

* **Spending by Profile** defaults off (unlike most widgets) since it's only useful once more than one Family Profile exists — no point showing a per-person breakdown for someone using the app solo.

This prevents the dashboard from becoming overwhelming.

---

# 45. Future Feature Ideas

These are features I'd keep on the roadmap:

### ⭐ Expense Splitter

For example:

```text
Dinner
৳4,000

You
৳1,500

Rahim Uddin
৳1,250

Karim
৳1,250
```

---

### ⭐ Warranty Tracker

For expensive purchases:

```text
MacBook

Purchased:
01 Aug 2026

Warranty:
12 months

Expires:
01 Aug 2027
```

Very useful when combined with receipts.

---

### ⭐ Asset Tracker

```text
MacBook
৳200,000

Phone
৳80,000

TV
৳60,000
```

Eventually:

```text
Net Worth
```

---

### ⭐ Insurance Tracker

```text
Health Insurance
Renewal: December

Car Insurance
Renewal: January
```

---

### ⭐ Financial Calendar

Combine:

```text
Bills
Income
Expenses
Debt
Subscriptions
Goals
```

into one calendar.

---

# 46. Success Metrics

Since this is a personal app, traditional business metrics aren't as important.

Instead:

### Speed

> Add an expense in <10 seconds.

### Reliability

> 100% of core functionality works offline.

### Data integrity

> No accidental loss of transactions.

### Usability

> User can find any transaction in <5 seconds.

### Privacy

> No financial data leaves device without explicit user action.

---

# 47. Final Product Structure

I would structure the finished app like this:

```text
                        NIBASH
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
      MONEY             PLANS             MORE
        │                 │                 │
   ┌────┼────┐       ┌────┼────┐       ┌────┼─────┐
   │    │    │       │    │    │       │    │     │
Income Expense Accounts Budget Shopping Debts Reports
             │              │      │       │
          Transfer        Goals  Lists   Bills
                                      │
                                Subscriptions
```

The key differentiator isn't just **expense tracking**. It's the combination of:

> **Money + Shopping + Debts + Bills + Goals + Personal Financial Planning**

while keeping everything **private and offline**.

If I were prioritizing the product, I'd make **Expenses, Income, Accounts, Shopping Lists, Debts, Budgets, and Backup/Restore** the foundation. Everything else can plug into that foundation later.

---

# 48. Design System & Visual Identity ⭐

This wasn't in the original scope, but it's the missing piece between "the PRD describes every screen" and "a designer/engineer can actually build them consistently." Everything below should be treated as the single source of truth for colors, type, spacing, and iconography — individual screens shouldn't invent their own.

## 48a. Brand Colors

From the logo concept:

```text
Primary       #16443C   Deep teal — nav, primary buttons, headers, icon fills
Secondary     #D9A441   Warm gold — accents, highlights, the "coin" motif, CTAs that need to pop against primary
Base / Cream  #F5EFE6   Off-white — light-mode backgrounds, cards, logo foreground
```

* **Primary (teal)** was chosen deliberately over the red/blue most fintech apps default to — it reads calm and trustworthy rather than urgent, which fits an app that's meant to reduce money anxiety, not add to it.
* **Secondary (gold)** should stay an accent, not a competing primary — used for the coin/savings motif, active states, and a small number of high-emphasis CTAs (e.g. "Save Goal," "+ Add Expense"). Overusing it dilutes the one thing it's meant to draw the eye to.

## 48b. Semantic Colors

These carry meaning across the app and must stay consistent — a color used for "money in" on the Dashboard can't mean something else on the Bills screen.

```text
Income / positive     #2E7D32   Green — income amounts, "money others owe me,"
                                 under-budget states, savings progress
Expense / negative    #C0392B   Red — expense amounts, "money I owe,"
                                 over-budget states, overdue bills
Warning               #D9A441   Gold (reuses Secondary) — approaching budget
                                 limit, upcoming due dates, "amount varies" flags
Info / neutral         #4A6FA5   Muted blue — informational banners, tips,
                                 first-run guidance (Section 25's insights)
Text — primary         #1A1A1A  (light) / #F0EDE8  (dark)
Text — secondary       #5C5C5C  (light) / #B8B3AC  (dark)
Border / hairline       #E0DCD4 (light) / #3A3A38  (dark)
```

* **Never rely on color alone.** Income/expense should also use a `+`/`−` prefix and different icon direction (Section 24's category icons, arrows on transfers) — colorblind users (roughly 1 in 12 men) need a second cue, especially critical in a finance app where misreading red-vs-green has real consequences.
* Green/red here are intentionally desaturated slightly from "traffic light" tones so they don't clash with Primary teal, which sits close to green on the wheel.

## 48c. Dark Mode

Dark mode isn't optional for a finance app — people check balances late at night, and it also matters for battery on OLED screens. Every color above has a dark-mode pair defined; the brand colors (Primary teal, Secondary gold) stay fixed in both modes since they're identity, not surface — only backgrounds, text, and borders flip.

```text
Light mode                    Dark mode
Background (page)  #FBFAF7    #121211
Surface (card)      #FFFFFF    #1C1C1A
```

## 48d. Typography

```text
Primary typeface     Inter (or system default — SF Pro / Roboto)
Bangla support        Noto Sans Bengali — required, not optional, since
                       the target market is Bangladesh-first (bKash/Nagad
                       users, Bangla names, ৳ symbol throughout)
```

* Both typefaces need to be loaded together and font-fallback needs testing specifically for **mixed Bangla/English strings** — e.g. a transaction note like "Rahim Uddin — গ্রোসারি" (Bangla word mixed with an English name) is a completely normal real-world input for this user base and must render cleanly, not with mismatched baselines or missing glyphs.

```text
Scale
H1 (screen titles)      24px / 600 weight
H2 (section headers)    18px / 600 weight
Body (default)          16px / 400 weight
Body — amounts          18px / 600 weight   ← money should visually stand
                                              out from surrounding text
Caption / metadata      13px / 400 weight
```

## 48e. Iconography

```text
Style     Outline (not filled) — matches the logo's restrained,
          uncluttered feel
Weight    1.5–2px stroke
Size      24px default, 20px in dense lists (e.g. Recent Transactions)
```

* Category icons (Section 9's Food/Transport/Bills/etc.) are the one place emoji are acceptable per the existing mockups throughout this PRD (🍔🚗🏠) — they're fast to scan and don't require an icon library decision for every one of a user's custom categories. Everywhere else (nav, buttons, system UI) should use the outline icon set for a more professional finish.

## 48f. Spacing, Radius & Elevation

```text
Grid        8px base unit — all padding/margins are multiples of 8
            (8 / 16 / 24 / 32)
Radius      12px for cards, 8px for buttons/inputs, full-round (999px)
            for pills and the App Lock number pad
Elevation   Flat by default — this app should feel calm, not "glossy
            fintech." Use a single subtle border (1px, Border color)
            to separate cards instead of drop shadows. Reserve shadow
            for genuinely floating elements (the + quick-action sheet,
            modals) only.
```

## 48g. Number & Currency Formatting ⭐

This wasn't addressed anywhere else in the PRD and it's a real, easy-to-miss decision: **Bangladesh (and South Asia generally) groups large numbers differently than the West.**

```text
Western grouping (wrong for this market):   ৳1,25,450   ← incorrect
                                             ৳125,450    ← this is
                                                            actually the
                                                            WESTERN style

South Asian / lakh-crore grouping (correct): ৳1,25,450
```

* Western style groups every 3 digits (125,450). South Asian style groups the first 3 digits, then every 2 after that (1,25,450 = "1 lakh, 25 thousand, 450"). **These produce different-looking numbers for the same amount**, and a Bangladeshi user will find Western grouping genuinely harder to read at a glance.
* Since global currency support exists (Section 32), number formatting should be **locale-aware, not currency-aware** — a user with BDT selected sees lakh-crore grouping; a user who switches to USD should see Western grouping. Don't hardcode one format for the whole app.
* This affects every single screen with a monetary value in this PRD — worth implementing once as a shared formatting utility rather than per-screen.

## 48h. Logo Usage

```text
Clear space    Minimum padding around the mark = the height of the
                gold coin element, on all sides
Minimum size    24px for the icon mark alone (app icon, favicon);
                below that, drop the wordmark entirely — don't
                shrink "Nibash" text past 12px
Backgrounds     The teal squircle is self-contained and needs no
                additional background — never place it on a busy
                photo or a second brand color
```

* Do not recolor the mark for feature-specific branding (e.g. a "Nibash Pro" badge) — introduce a small secondary badge instead of altering the core logo colors, so brand recognition stays intact everywhere the app appears (app store, splash screen, notifications).
