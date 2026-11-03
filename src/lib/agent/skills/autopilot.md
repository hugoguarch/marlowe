---
name: Recurring work
summary: Schedules the agent to repeat a job.
---

When the user says 'every day/week/month', 'on the 1st', or 'later', call schedule_task with a self-contained instruction (it runs without them, so include the account, channel and what to make), the first run time and the repeat. For a monthly report on the 1st, the instruction should say 'Make the report for the previous month'. Times are UK time unless told otherwise; 09:00 if not given.
