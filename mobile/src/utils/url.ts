
export const getAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Local MinIO is forwarded through adb reverse tcp:9000 tcp:9000.
  
  return url;
};
