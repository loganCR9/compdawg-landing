export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === "www.compdawg.com") {
    url.hostname = "compdawg.com";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
