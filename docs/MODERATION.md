# Message Moderation Workflow

Every message saved through `/api/messages` is stored with `status = 'pending'`. Public routes only read `status = 'approved'`, so you decide what becomes visible.

## Using the built-in CLI
1. From the repository root make sure the backend has been started at least once (the CLI talks to SQLite directly and calls the same helpers as the server).
2. List the queue:
   ```bash
   npm run moderate -- list
   npm run moderate -- list --status all
   npm run moderate -- list --start "Central Library" --destination "Maverick Activities Center"
   ```
3. Approve or reject individual entries:
   ```bash
   npm run moderate -- approve 12 --reviewed-by "Cleona" --notes "Clean + on-route"
   npm run moderate -- reject 15 --notes "Spam / off-topic"
   ```
   The optional `--reviewed-by` and `--notes` flags are persisted so you can audit decisions later. Leave them out for quick approvals.

The CLI prints compact tables via `console.table`, making it easy to skim the queue without opening the SQLite file or starting another app.

## Calling the REST endpoints directly
If you prefer to moderate from another tool (Postman, cURL, a script, etc.) you can hit the same endpoints the CLI wraps:

### List submissions
```bash
curl "http://localhost:3001/api/moderation/messages?status=pending&start=Central%20Library&destination=Fine%20Arts%20Building"
```

### Approve a message
```bash
curl -X POST http://localhost:3001/api/moderation/messages/12/approve \
  -H 'Content-Type: application/json' \
  -d '{"reviewedBy":"Cleona","reviewNotes":"Looks good"}'
```

### Reject a message
```bash
curl -X POST http://localhost:3001/api/moderation/messages/15/reject \
  -H 'Content-Type: application/json' \
  -d '{"reviewedBy":"Cleona","reviewNotes":"Spam"}'
```

All moderation responses include the updated record, so you can confirm the new status (or log it elsewhere) immediately.
