/** Browser-side popup helper for connecting a channel. Holds no secrets. */
export function waitForChannelOAuth(popup: Window) {
  return new Promise<{ code: string; state: string }>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "channelOAuth") return;
      cleanup();
      if (event.data.ok && event.data.code && event.data.state) {
        resolve({ code: event.data.code, state: event.data.state });
      } else {
        popup.close();
        reject(new Error(event.data?.error ?? "That connection did not complete."));
      }
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The window closed before the connection finished."));
    }, 500);
  });
}
