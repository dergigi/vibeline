// Nostr portal configuration
export const NOSTR_PORTAL = process.env.NEXT_PUBLIC_NOSTR_PORTAL || "https://njump.me";

// Reserved directories in VoiceMemos that are not plugins
export const RESERVED_DIRS = [
  'archive',
  'transcripts',
];
