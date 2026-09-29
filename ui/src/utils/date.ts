export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInDays = Math.floor(diffInSeconds / (24 * 60 * 60));
  
  if (diffInDays === 0) {
    if (date.getDate() === now.getDate()) {
      return 'Today';
    }
    if (date.getDate() === now.getDate() - 1) {
      return 'Yesterday';
    }
  }

  if (date.getFullYear() !== now.getFullYear()) {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
} 