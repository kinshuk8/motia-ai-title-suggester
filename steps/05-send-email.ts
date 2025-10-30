import { EventConfig } from "motia";

// step-5
// sends formatted email with improved titles to the users using resend

// @ts-ignore
export const config: EventConfig = {
  name: "SendEmail",
  type: "event",
  subscribes: ["yt.videos.ready"],
  emits: ["yt.email.send"],
};

interface Video {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail?: string;
}

interface ImprovedTitle {
  original: string;
  improved: string;
  rationale: string;
  url: string;
}

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;

  try {
    const data = eventData || {};
    jobId = data.jobId;
    const email = data.email;
    const channelName = data.channelName;
    const improvedTitles = data.improvedTitles;

    logger.info("Sending Email", {
      jobId,
      email,
      titleCount: improvedTitles.length,
    });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL =
      process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "sending email",
    });

    const emailText = generateEmailText(channelName, improvedTitles);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject: `New Titles for ${channelName}`,
        text: emailText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Resend API Error: ${errorData.error.message}` || `Unknown Email Error`,
      );
    }

    const emailResult = await response.json();
    logger.info("Email sent successfully", { jobId, emailId: emailResult.id });

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "completed",
      emailId: emailResult.id,
      completedAt: new Date().toISOString(),
    });

    await emit({
      topic: "yt.email.sent",
      data: {
        jobId,
        email,
        emailId: emailResult.id,
      },
    });
  } catch (error: any) {
    logger.error("Error sending email", { error: error.message });

    if (!jobId) {
      logger.error("Cannot send error notification - missing jobId");
      return;
    }

    const jobData = await state.get(`job: ${jobId}`);

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error: error.message,
    });
  }
};

function generateEmailText(
  channelName: string,
  titles: ImprovedTitle[],
): string {
  let text = `YouTube Title Doctor - Improved Titles for ${channelName}\n\n`;
  text += `${"=".repeat(60)}\n\n`;

  titles.forEach((title, index) => {
    text += `Video ${index + 1}:\n`;
    text += `----------------------\n`;
    text += `Original: ${title.original}\n`;
    text += `Improved: ${title.improved}\n`;
    text += `Why: ${title.rationale}\n`;
    text += `Watch: ${title.url}\n`;
    text += ``;
  });

  text += `${"=".repeat(60)}\n\n`;
  text += `Powered by Motia.dev\n`;
  return text;
}
