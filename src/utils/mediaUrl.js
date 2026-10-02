export function mediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('/static')
  ) {
    return path;
  }
  if (path.startsWith('/uploads')) {
    return `${process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'}${path}`;
  }
  return path;
}
