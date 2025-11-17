#!/usr/bin/env node
'use strict';

const {
  initializeDatabase,
  getModerationMessages,
  updateMessageStatus,
} = require('../src/backend/db');

const helpText = `
MavWalk moderation CLI

Usage:
  npm run moderate -- <command> [options]

Commands:
  list                List messages in the moderation queue. Defaults to pending only.
  approve <id>        Approve a message by id.
  reject <id>         Reject a message by id.
  help                Show this message.

List options:
  --status <value>        pending | approved | rejected | all (default: pending)
  --start <name>          Filter by start location name
  --destination <name>    Filter by destination location name

Approve/Reject options:
  --reviewed-by <name>    Optional reviewer identifier recorded with the decision
  --notes <text>          Optional review notes stored with the message
`;

const parseOptions = (args) => {
  const options = { _: [] };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith('--')) {
      options._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (!key) {
      continue;
    }

    const next = args[i + 1];
    if (typeof next === 'string' && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
};

const listMessages = (options) => {
  const status = typeof options.status === 'string' ? options.status : 'pending';
  const startLocationName = typeof options.start === 'string' ? options.start : undefined;
  const destinationLocationName = typeof options.destination === 'string' ? options.destination : undefined;

  const messages = getModerationMessages({ status, startLocationName, destinationLocationName });

  if (!messages.length) {
    console.log('No messages matched your filters.');
    return;
  }

  const tableRows = messages.map((message) => ({
    id: message.id,
    status: message.status,
    createdAt: message.createdAt,
    start: message.startLocation ?? '—',
    destination: message.destination ?? '—',
    category: message.profanityCategory,
  }));

  console.table(tableRows);
};

const moderateMessage = ({ status, options }) => {
  const [messageId] = options._;

  if (!messageId) {
    console.error('A message id is required.');
    process.exit(1);
  }

  const reviewer = typeof options['reviewed-by'] === 'string' ? options['reviewed-by'] : undefined;
  const reviewNotes = typeof options.notes === 'string' ? options.notes : undefined;

  const result = updateMessageStatus({
    messageId,
    status,
    reviewedBy: reviewer,
    reviewNotes,
  });

  console.log(`Message #${result.id} marked as ${status}.`);
  if (reviewer) {
    console.log(`Reviewer: ${reviewer}`);
  }
  if (reviewNotes) {
    console.log(`Notes: ${reviewNotes}`);
  }
};

const main = () => {
  initializeDatabase();

  const args = process.argv.slice(2);
  const command = args.shift();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(helpText.trim());
    return;
  }

  const options = parseOptions(args);

  try {
    if (command === 'list') {
      listMessages(options);
    } else if (command === 'approve') {
      moderateMessage({ status: 'approved', options });
    } else if (command === 'reject') {
      moderateMessage({ status: 'rejected', options });
    } else {
      console.error(`Unknown command: ${command}`);
      console.log();
      console.log(helpText.trim());
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
};

main();
