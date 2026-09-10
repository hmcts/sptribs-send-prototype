import { initAll } from "govuk-frontend";

initAll();

initCookieBanner();

/**
 * Wire the cookie banner's Accept/Reject/Hide buttons. The express-govuk-starter
 * ships the banner markup (js-cookie-banner-* classes) and the
 * POST /cookies/save-preferences route, but no client JS to connect them — so
 * the buttons are inert until this runs. Accept/Reject persist the choice via
 * that route (fetch, so the page doesn't navigate away mid-journey), then reveal
 * the matching confirmation message; Hide dismisses the whole banner.
 */
function initCookieBanner(): void {
  const banner = document.querySelector<HTMLElement>(".govuk-cookie-banner");
  if (!banner) {
    return;
  }

  const choiceMessage = banner.querySelector<HTMLElement>(".govuk-cookie-banner__message");
  const acceptMessage = banner.querySelector<HTMLElement>(".cookie-banner-accept-message");
  const rejectMessage = banner.querySelector<HTMLElement>(".cookie-banner-reject-message");

  const savePreferences = async (analyticsAccepted: boolean): Promise<void> => {
    const body = new URLSearchParams({ preferences: "on" });
    if (analyticsAccepted) {
      body.set("analytics", "on");
    }
    // POST /cookies — the same route the preferences page submits to. The token comes from the
    // meta tag in _layouts/citizen.njk, because csrf() checks every unsafe request at app level
    // and the banner's markup (the starter's) has no field to carry one.
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    await fetch("/cookies", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(token ? { "x-csrf-token": token } : {})
      },
      body
    }).catch(() => {
      // Best-effort: if the save fails the banner stays; nothing is broken.
    });
  };

  const reveal = (message: HTMLElement | null): void => {
    if (choiceMessage) {
      choiceMessage.hidden = true;
      choiceMessage.style.display = "none";
    }
    if (message) {
      message.hidden = false;
      message.style.display = "block";
    }
  };

  banner.querySelector(".js-cookie-banner-accept")?.addEventListener("click", async () => {
    await savePreferences(true);
    reveal(acceptMessage);
  });
  banner.querySelector(".js-cookie-banner-reject")?.addEventListener("click", async () => {
    await savePreferences(false);
    reveal(rejectMessage);
  });
  for (const hide of banner.querySelectorAll(".js-cookie-banner-hide")) {
    hide.addEventListener("click", () => {
      banner.hidden = true;
      banner.style.display = "none";
    });
  }
}
