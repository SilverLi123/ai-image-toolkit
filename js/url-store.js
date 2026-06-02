function createUrlStore() {
  const urls = new Set();

  function create(source) {
    const url = URL.createObjectURL(source);
    urls.add(url);
    return url;
  }

  function revoke(url) {
    if (!url || !urls.has(url)) return;
    URL.revokeObjectURL(url);
    urls.delete(url);
  }

  function revokeAll() {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
    urls.clear();
  }

  return { create, revoke, revokeAll };
}
